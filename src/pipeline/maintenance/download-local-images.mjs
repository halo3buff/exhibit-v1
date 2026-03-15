// src/pipeline/maintenance/download-local-images.mjs
//
// Downloads Design Reviewed images to public/designreviewed-images/
// and updates the DB imageUrl to the local path.
//
// Run from project root:
//   node src/pipeline/maintenance/download-local-images.mjs
//
// Safe to re-run — skips already-downloaded files and already-updated DB rows.

import fs       from 'fs';
import path     from 'path';
import https    from 'https';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const IMG_DIR   = path.join(ROOT, 'public', 'designreviewed-images');

fs.mkdirSync(IMG_DIR, { recursive: true });

const DELAY_MS    = 1500; // 1.5s between every request — single threaded
const MAX_RETRIES = 3;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const IMAGE_SIGS = [
  [0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],
  [0x47,0x49,0x46],[0x52,0x49,0x46,0x46],
];
function isImage(buf) {
  if (!buf || buf.length < 500) return false;
  return IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i] === b));
}

function downloadUrl(url, attempt = 0) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer':    'https://designreviewed.com/',
      },
    }, (res) => {
      if (res.statusCode === 429 || res.statusCode === 503) {
        res.resume();
        const wait = parseInt(res.headers['retry-after'] || '60') * 1000;
        console.log(`\n   ⏸  Rate limited — waiting ${wait/1000}s`);
        if (attempt < MAX_RETRIES) {
          setTimeout(() => downloadUrl(url, attempt + 1).then(resolve), wait);
        } else { resolve({ err: 'fail:429' }); }
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
        setTimeout(() => downloadUrl(url, attempt + 1).then(resolve), 2000);
      } else { resolve({ err: `fail:${e.code || e.message?.slice(0,20)}` }); }
    });
    req.setTimeout(30000, () => { req.destroy(); resolve({ err: 'fail:timeout' }); });
  });
}

async function main() {
  console.log('\n📥 Design Reviewed — Local Image Downloader');
  console.log('   Concurrency: 1 | Delay: 1.5s between requests\n');

  const db = new Database(DB_PATH);

  const rows = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE source = 'designreviewed'
    AND imageUrl LIKE 'https://designreviewed.com/%'
  `).all();

  console.log(`   ${rows.length.toLocaleString()} images to download`);
  if (rows.length === 0) {
    console.log('   ✓ All images already local');
    db.close();
    return;
  }

  // Estimate time
  const estMins = Math.ceil((rows.length * DELAY_MS) / 60000);
  console.log(`   Estimated time: ~${estMins} minutes\n`);

  const updateStmt = db.prepare(`UPDATE artworks SET imageUrl = ? WHERE id = ?`);

  let done = 0, saved = 0, skipped = 0, failed = 0;
  const failMap = new Map();
  const total = rows.length;

  for (const row of rows) {
    const remoteUrl = row.imageUrl;

    let filename;
    try {
      filename = path.basename(new URL(remoteUrl).pathname).split('?')[0].slice(0, 200);
    } catch {
      failed++; failMap.set('fail:bad-url', (failMap.get('fail:bad-url')||0)+1);
      done++; progress(); continue;
    }
    if (!filename || filename.length < 4) filename = `${row.id}.jpg`;

    const localPath = path.join(IMG_DIR, filename);
    const localUrl  = `/designreviewed-images/${filename}`;

    // Already on disk — just update DB
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 500) {
      updateStmt.run(localUrl, row.id);
      skipped++; done++; progress(); continue;
    }

    await sleep(DELAY_MS);
    const { buf, err } = await downloadUrl(remoteUrl);

    if (err) {
      failed++; failMap.set(err, (failMap.get(err)||0)+1);
      done++; progress(); continue;
    }

    fs.writeFileSync(localPath, buf);
    updateStmt.run(localUrl, row.id);
    saved++; done++; progress();
  }

  db.close();

  console.log(`\n\n✅ Done — saved:${saved} already-on-disk:${skipped} failed:${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failure breakdown:');
    for (const [reason, count] of [...failMap.entries()].sort((a,b) => b[1]-a[1])) {
      console.log(`   ${reason.padEnd(25)} ${count}`);
    }
    console.log('\n   Re-run to retry — already-downloaded files are skipped.');
  }

  console.log('\n   Next: node src/pipeline/maintenance/prewarm-cache.mjs\n');

  function progress() {
    if (done % 25 === 0 || done === total) {
      const pct = ((done/total)*100).toFixed(1);
      process.stdout.write(`\r   ${pct}% (${done}/${total}) saved:${saved} skip:${skipped} fail:${failed}  `);
    }
  }
}

main().catch(console.error);
