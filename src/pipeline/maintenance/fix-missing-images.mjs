// src/pipeline/maintenance/fix-missing-images.mjs
//
// Recovers missing images for letterformarchive and designreviewed.
//
// LFA:  requires a session cookie (their server blocks bots without it)
// DR:   reads raw files to reconstruct remote URL from filename
//
// Run from project root:
//   node src/pipeline/maintenance/fix-missing-images.mjs
//
// Safe to re-run — skips files that already exist and are valid images.

import fs       from 'fs';
import path     from 'path';
import https    from 'https';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const RAW_DIR   = path.join(ROOT, 'data', 'raw');

const PUBLIC_LFA = path.join(ROOT, 'public', 'lfa-images');
const PUBLIC_DR  = path.join(ROOT, 'public', 'designreviewed-images');

fs.mkdirSync(PUBLIC_LFA, { recursive: true });
fs.mkdirSync(PUBLIC_DR,  { recursive: true });

const CONCURRENCY = 5;
const MAX_RETRIES = 3;

const IMAGE_SIGS = [
  [0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],
  [0x47,0x49,0x46],[0x52,0x49,0x46,0x46],
];
function isImage(buf) {
  if (!buf || buf.length < 500) return false;
  return IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i] === b));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── LFA session cookie ────────────────────────────────────────────────────────
let lfaCookie = '';
async function bootstrapLfaCookie() {
  return new Promise((resolve) => {
    https.get('https://oa.letterformarchive.org/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
    }, (res) => {
      const cookies = res.headers['set-cookie'] || [];
      lfaCookie = cookies.map(c => c.split(';')[0]).join('; ');
      console.log(`   Session cookie: ${lfaCookie ? 'obtained ✓' : 'not found (will try without)'}`);
      res.resume();
      resolve();
    }).on('error', (e) => {
      console.warn('   Cookie bootstrap failed:', e.message, '(continuing without)');
      resolve();
    });
  });
}

// ── Generic image downloader ──────────────────────────────────────────────────
function downloadUrl(url, headers, attempt = 0) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode === 429 || res.statusCode === 503) {
        res.resume();
        if (attempt < MAX_RETRIES) {
          setTimeout(() => downloadUrl(url, headers, attempt + 1).then(resolve), (attempt + 1) * 3000);
        } else { resolve({ err: `fail:${res.statusCode}` }); }
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume(); resolve({ err: `fail:${res.statusCode}` }); return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (!isImage(buf)) { resolve({ err: 'fail:not-image' }); return; }
        resolve({ buf });
      });
    });
    req.on('error', (e) => {
      if (attempt < MAX_RETRIES) {
        setTimeout(() => downloadUrl(url, headers, attempt + 1).then(resolve), (attempt + 1) * 1000);
      } else { resolve({ err: `fail:${e.code || e.message?.slice(0, 20)}` }); }
    });
    req.setTimeout(30000, () => { req.destroy(); resolve({ err: 'fail:timeout' }); });
  });
}

// ── Concurrency helper ────────────────────────────────────────────────────────
async function runWithConcurrency(tasks, concurrency) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) { const i = idx++; await tasks[i](); }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── LFA recovery ─────────────────────────────────────────────────────────────
// LFA remote URL pattern:
//   filename: lfa_type_0744_001.jpg
//   workid:   lfa_type_0744   (strip trailing _NNN image-index suffix)
//   remote:   https://oa.letterformarchive.org/full/lfa_type_0744/lfa_type_0744_001.jpg

function lfaFilenameToRemoteUrl(filename) {
  const base   = path.basename(filename);
  const workid = base.replace(/_\d{3,4}\.[^.]+$/, '');
  return `https://oa.letterformarchive.org/full/${workid}/${base}`;
}

async function fixLfa() {
  console.log('\n── Letterform Archive ───────────────────────────────────────');

  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE source = 'letterformarchive'
      AND imageUrl IS NOT NULL AND imageUrl != ''
  `).all();
  db.close();

  if (rows.length === 0) {
    console.log('   No LFA records in DB. Run harvest -> transform -> load first.');
    return;
  }

  const localRows  = rows.filter(r => r.imageUrl.startsWith('/'));
  const remoteRows = rows.filter(r => !r.imageUrl.startsWith('/'));

  console.log(`   ${rows.length} total LFA records  |  ${localRows.length} local paths  |  ${remoteRows.length} remote URLs`);

  const missingLocal = localRows.filter(r => {
    const p = path.join(ROOT, 'public', r.imageUrl);
    try { return fs.statSync(p).size < 500; } catch { return true; }
  });

  // For remote URL records, check if local file already exists (from a previous run)
  const missingRemote = remoteRows.filter(r => {
    const filename = path.basename(r.imageUrl);
    const p = path.join(PUBLIC_LFA, filename);
    try { return fs.statSync(p).size < 500; } catch { return true; }
  });

  const totalMissing = missingLocal.length + missingRemote.length;
  console.log(`   ${totalMissing} files missing from public/lfa-images/`);

  if (totalMissing === 0) {
    console.log('   All local images exist -- nothing to do.');
    return;
  }

  console.log('\n   Getting LFA session cookie...');
  await bootstrapLfaCookie();

  const lfaHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept':     'image/webp,image/jpeg,image/png,image/*,*/*',
    'Referer':    'https://oa.letterformarchive.org/',
    ...(lfaCookie ? { 'Cookie': lfaCookie } : {}),
  };

  const allMissing = [
    ...missingLocal.map(r  => ({ filename: path.basename(r.imageUrl), remoteUrl: lfaFilenameToRemoteUrl(path.basename(r.imageUrl)) })),
    ...missingRemote.map(r => ({ filename: path.basename(r.imageUrl), remoteUrl: r.imageUrl })),
  ];

  let done = 0, saved = 0, failed = 0;
  const failMap = new Map();
  const total = allMissing.length;

  function progress() {
    const pct = ((done / total) * 100).toFixed(1);
    process.stdout.write(`\r   ${pct}% (${done}/${total}) saved:${saved} fail:${failed}  `);
  }

  const tasks = allMissing.map(({ filename, remoteUrl }) => async () => {
    const localPath = path.join(PUBLIC_LFA, filename);
    const { buf, err } = await downloadUrl(remoteUrl, lfaHeaders);
    if (err) {
      failed++;
      failMap.set(err, (failMap.get(err) || 0) + 1);
    } else {
      fs.writeFileSync(localPath, buf);
      saved++;
    }
    done++;
    progress();
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`\n   saved:${saved}  failed:${failed}`);

  if (failed > 0) {
    console.log('   Failure breakdown:');
    for (const [reason, count] of [...failMap.entries()].sort((a,b) => b[1]-a[1])) {
      console.log(`     ${reason.padEnd(30)} ${count}`);
    }
    if (failMap.has('fail:not-image')) {
      console.log('\n   fail:not-image = LFA returned HTML (bot detection).');
      console.log('   Wait a few minutes and re-run this script.');
    }
  }
}

// ── Design Reviewed recovery ──────────────────────────────────────────────────
// Keyed by FILENAME (not imageUrl), because:
//   - raw file imageUrl may be a remote URL or a local path depending on which
//     harvest version ran, but filename is stable in both
//   - DB imageUrl may have been updated to a local path by download-local-images.mjs

function getDrRemoteUrl(rawPost) {
  const media = rawPost?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return '';
  const sizes = media.media_details?.sizes ?? {};
  return (
    sizes.large?.source_url        ??
    sizes.medium_large?.source_url ??
    sizes.medium?.source_url       ??
    media.source_url               ??
    ''
  );
}

async function fixDesignReviewed() {
  console.log('\n── Design Reviewed ──────────────────────────────────────────');

  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE source = 'designreviewed'
      AND imageUrl IS NOT NULL AND imageUrl != ''
  `).all();
  db.close();

  if (rows.length === 0) {
    console.log('   No Design Reviewed records in DB.');
    return;
  }

  const localRows  = rows.filter(r => r.imageUrl.startsWith('/'));
  const remoteRows = rows.filter(r => !r.imageUrl.startsWith('/'));

  console.log(`   ${rows.length} total DR records  |  ${localRows.length} local paths  |  ${remoteRows.length} remote URLs`);

  const missing = localRows.filter(r => {
    const p = path.join(ROOT, 'public', r.imageUrl);
    try { return fs.statSync(p).size < 500; } catch { return true; }
  });

  console.log(`   ${missing.length} local-path records missing from public/`);

  if (missing.length === 0) {
    console.log('   All local images exist -- nothing to do.');
    return;
  }

  const rawDrDir = path.join(RAW_DIR, 'designreviewed');
  if (!fs.existsSync(rawDrDir)) {
    console.log('   data/raw/designreviewed/ not found.');
    console.log('   Re-run harvest: npx tsx src/pipeline/01-harvest/harvest-designreviewed.ts');
    return;
  }

  const rawFiles = fs.readdirSync(rawDrDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
  console.log(`   Reading ${rawFiles.length} raw files to build filename -> remote URL map...`);

  // Key by filename derived from the remote URL — stable regardless of what imageUrl holds
  const filenameToRemoteUrl = new Map();
  for (const file of rawFiles) {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(rawDrDir, file), 'utf8'));
      if (!rec.raw) continue;
      const remoteUrl = getDrRemoteUrl(rec.raw);
      if (!remoteUrl) continue;
      try {
        const filename = path.basename(new URL(remoteUrl).pathname);
        if (filename) filenameToRemoteUrl.set(filename, remoteUrl);
      } catch { /* invalid URL */ }
    } catch { /* skip corrupt files */ }
  }

  console.log(`   Filename map: ${filenameToRemoteUrl.size} entries`);

  const drHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept':     'image/webp,image/jpeg,image/png,image/*,*/*',
    'Referer':    'https://designreviewed.com/',
  };

  let done = 0, saved = 0, failed = 0, noUrl = 0;
  const failMap = new Map();
  const total = missing.length;

  function progress() {
    const pct = ((done / total) * 100).toFixed(1);
    process.stdout.write(`\r   ${pct}% (${done}/${total}) saved:${saved} fail:${failed} no-url:${noUrl}  `);
  }

  const tasks = missing.map(row => async () => {
    const filename  = path.basename(row.imageUrl);
    const remoteUrl = filenameToRemoteUrl.get(filename);

    if (!remoteUrl) {
      noUrl++;
      done++;
      progress();
      return;
    }

    const localPath = path.join(PUBLIC_DR, filename);
    const { buf, err } = await downloadUrl(remoteUrl, drHeaders);
    if (err) {
      failed++;
      failMap.set(err, (failMap.get(err) || 0) + 1);
    } else {
      fs.writeFileSync(localPath, buf);
      saved++;
    }
    done++;
    progress();
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log(`\n   saved:${saved}  failed:${failed}  no-url:${noUrl}`);

  if (noUrl > 0) {
    console.log(`\n   ${noUrl} filenames not found in raw files.`);
    console.log('   These were likely added by download-local-images.mjs from a different run.');
    console.log('   Re-run harvest: npx tsx src/pipeline/01-harvest/harvest-designreviewed.ts');
  }
  if (failed > 0) {
    console.log('   Failure breakdown:');
    for (const [reason, count] of [...failMap.entries()].sort((a,b) => b[1]-a[1])) {
      console.log(`     ${reason.padEnd(30)} ${count}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FIX MISSING IMAGES                                      ║');
  console.log('║  Recovers LFA + Design Reviewed local image files        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (!fs.existsSync(DB_PATH)) {
    console.error('\nartworks.db not found. Run the full pipeline first.');
    process.exit(1);
  }

  await fixLfa();
  await fixDesignReviewed();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  DONE                                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\nNext step: node src/pipeline/maintenance/prewarm-cache.mjs\n');
}

main().catch(console.error);
