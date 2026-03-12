// Caches two sizes per artwork: 400px (grid) and 1200px (fullscreen modal).
//
// Per-source strategy:
//   IIIF  (ARTIC, V&A, Rijks) → URL rewrite per size, small download
//   Cooper Hewitt              → fetch _z.jpg (~640px) once for both sizes, sharp resize
//   MET, Smithsonian, others  → fetch original URL once, sharp resize to both sizes
//
// Both size outputs stored as separate cache files, keyed by fetchUrl+size.

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import https    from 'https';
import sharp    from 'sharp';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

// designarchives.aiga.org has a self-signed / chain-incomplete SSL cert that
// Node.js rejects. Use a custom agent with rejectUnauthorized:false for those URLs only.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..', '..');
const DB_PATH    = path.join(ROOT, 'artworks.db');
const CACHE_DIR  = 'C:\\Users\\ameen\\Desktop\\.img-cache';
const MAX_RETRIES = 3;

const DOMAIN_CONCURRENCY = {
  'images.metmuseum.org':                    10,
  'www.artic.edu':                           8,
  'iiif.micr.io':                            8,
  'framemark.vam.ac.uk':                     4,
  'fids.si.edu':                             4,
  'ids.lib.harvard.edu':                     4,
  'lh3.googleusercontent.com':               12,
  'upload.wikimedia.org':                    12,
  'rijks.nl':                                4,
  'images.collection.cooperhewitt.org':      12, // _z files are small, can push harder
  'default':                                 6,
};

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const IMAGE_SIGS = [
  [0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],
  [0x47,0x49,0x46],[0x52,0x49,0x46,0x46],[0x42,0x4D],
];
function isImage(buf) {
  if (!buf || buf.length < 8) return false;
  return IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i] === b));
}

// Fast skip check — just stat the file, no full read
function isCached(p) {
  try { return fs.statSync(p).size > 1000; } catch { return false; }
}

function cacheFilename(fetchUrl, size) {
  const key  = `${fetchUrl}:${size}`;
  const hash = crypto.createHash('md5').update(key).digest('hex');
  return `${hash}.jpg`; // always jpg — sharp outputs jpeg
}
function cachePath(fetchUrl, size) {
  return path.join(CACHE_DIR, cacheFilename(fetchUrl, size));
}

// ── URL resolution per source ─────────────────────────────────────────────────

// IIIF: rewrite size spec in URL — separate fetch per size
function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}

// Cooper Hewitt: always fetch _z (medium, ~640px) — smaller than _b, enough for both sizes
// The _z images are ~200-400KB vs _b which can be 1-3MB
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}

// Returns { fetchUrl } — what to actually download for this (imageUrl, size) pair
function getFetchUrl(imageUrl, size) {
  if (imageUrl.includes('/full/')) {
    // IIIF — different URL per size
    return iiifUrl(imageUrl, size);
  }
  if (imageUrl.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(imageUrl)) {
    // CH — always fetch _z regardless of output size
    return chSourceUrl(imageUrl);
  }
  // MET, Smithsonian, everything else — same source URL for both sizes
  return imageUrl;
}

// ── Network ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return 'unknown'; }
}
function getConcurrency(domain) {
  for (const [k, v] of Object.entries(DOMAIN_CONCURRENCY)) if (domain.includes(k)) return v;
  return DOMAIN_CONCURRENCY.default;
}

async function fetchRaw(url, attempt = 0) {
  try {
    // designarchives.aiga.org has a self-signed SSL cert Node.js rejects via fetch().
    // Use https.get with rejectUnauthorized:false for those URLs only.
    if (url.includes('designarchives.aiga.org')) {
      return await new Promise((resolve) => {
        const req = https.get(url, {
          agent: insecureAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept':     'image/webp,image/jpeg,image/png,image/*,*/*',
            'Referer':    'https://designarchives.aiga.org',
          },
        }, (res) => {
          if (res.statusCode === 429 || res.statusCode === 503) {
            res.resume();
            if (attempt < MAX_RETRIES) {
              setTimeout(() => fetchRaw(url, attempt + 1).then(resolve), (attempt + 1) * 3000);
            } else {
              resolve({ err: `fail:${res.statusCode}` });
            }
            return;
          }
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            resolve({ err: `fail:${res.statusCode}` });
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            if (!isImage(buf)) { resolve({ err: 'fail:not-image' }); return; }
            resolve({ buf });
          });
        });
        req.on('error', (e) => resolve({ err: `fail:${e.code || e.message?.slice(0, 20)}` }));
        req.setTimeout(20000, () => { req.destroy(); resolve({ err: 'fail:timeout' }); });
      });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept':     'image/webp,image/jpeg,image/png,image/*,*/*',
        'Referer':    new URL(url).origin,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt < MAX_RETRIES) { await sleep((attempt+1)*3000); return fetchRaw(url, attempt+1); }
      return { err: `fail:${res.status}` };
    }
    if (!res.ok) return { err: `fail:${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (!isImage(buf)) return { err: 'fail:not-image' };
    return { buf };
  } catch(e) {
    const isTimeout = e.name === 'TimeoutError' || e.name === 'AbortError';
    if (isTimeout && attempt < MAX_RETRIES) { await sleep((attempt+1)*1000); return fetchRaw(url, attempt+1); }
    return { err: isTimeout ? 'fail:timeout' : `fail:${e.code || e.message?.slice(0,20)}` };
  }
}

async function resizeBuffer(buf, size) {
  try {
    return await sharp(buf)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  } catch { return buf; }
}

// ── Per-artwork logic ─────────────────────────────────────────────────────────
// rawBufCache: for non-IIIF sources we may need the same download for two sizes.
// Key = fetchUrl, value = Buffer. Evicted after 30s to keep memory bounded.
const rawBufCache = new Map();

async function fetchAndSave(imageUrl, size) {
  const fetchUrl = getFetchUrl(imageUrl, size);
  const p        = cachePath(fetchUrl, size);

  if (isCached(p)) return 'skip';

  const isIiif = imageUrl.includes('/full/');

  if (isIiif) {
    // IIIF: each size has its own URL, fetch directly, no sharp needed
    const { buf, err } = await fetchRaw(fetchUrl);
    if (err) return err;
    fs.writeFileSync(p, buf);
    return 'saved';
  }

  // CH and MET/SI: fetch source once, reuse for both sizes via rawBufCache
  let raw = rawBufCache.get(fetchUrl);
  if (!raw) {
    const { buf, err } = await fetchRaw(fetchUrl);
    if (err) return err;
    raw = buf;
    rawBufCache.set(fetchUrl, raw);
    setTimeout(() => rawBufCache.delete(fetchUrl), 30000);
  }

  const resized = await resizeBuffer(raw, size);
  fs.writeFileSync(p, resized);
  return 'saved';
}

async function runWithConcurrency(tasks, concurrency) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) { const i = idx++; await tasks[i](); }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`SELECT imageUrl FROM artworks WHERE imageUrl IS NOT NULL AND imageUrl != ''`).all();
  db.close();

  const rawUrls = [...new Set(rows.map(r => r.imageUrl))];
  const SIZES   = [400, 1200];

  let iiifCount = 0, chCount = 0, sharpCount = 0;
  for (const url of rawUrls) {
    if (url.includes('/full/')) iiifCount++;
    else if (url.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(url)) chCount++;
    else sharpCount++;
  }

  const total = rawUrls.length * SIZES.length;
  console.log(`\n🖼  Pre-warming .img-cache`);
  console.log(`   ${rawUrls.length.toLocaleString()} artworks × 2 sizes = ${total.toLocaleString()} cache entries`);
  console.log(`   IIIF: ${iiifCount.toLocaleString()} | Cooper Hewitt (_z): ${chCount.toLocaleString()} | Sharp (MET/SI): ${sharpCount.toLocaleString()}\n`);

  // Build all (url, size) tasks grouped by the fetch domain for rate limiting
  const byDomain = new Map();
  for (const url of rawUrls) {
    for (const size of SIZES) {
      const fetchUrl = getFetchUrl(url, size);
      const domain   = getDomain(fetchUrl);
      if (!byDomain.has(domain)) byDomain.set(domain, []);
      byDomain.get(domain).push({ url, size });
    }
  }

  let done = 0, saved = 0, skipped = 0, failed = 0;
  const failureMap = new Map();

  const domainPromises = [...byDomain.entries()].map(([domain, tasks]) => {
    const concurrency = getConcurrency(domain);
    const taskFns = tasks.map(({ url, size }) => async () => {
      const result = await fetchAndSave(url, size);
      done++;
      if (result === 'saved')     saved++;
      else if (result === 'skip') skipped++;
      else { failed++; failureMap.set(result, (failureMap.get(result) || 0) + 1); }
      if (done % 500 === 0 || done === total) {
        const pct = ((done / total) * 100).toFixed(1);
        process.stdout.write(`\r   ${pct}% (${done.toLocaleString()}/${total.toLocaleString()}) saved:${saved.toLocaleString()} skip:${skipped.toLocaleString()} fail:${failed}  `);
      }
    });
    return runWithConcurrency(taskFns, concurrency);
  });

  await Promise.all(domainPromises);
  rawBufCache.clear();

  console.log(`\n\n✅ Done — ${saved.toLocaleString()} downloaded, ${skipped.toLocaleString()} already cached, ${failed} failed`);

  if (failed > 0) {
    console.log('\n❌ Failure breakdown:');
    for (const [reason, count] of [...failureMap.entries()].sort((a,b) => b[1]-a[1])) {
      console.log(`   ${reason.padEnd(25)} ${count}`);
    }
    console.log('\n💡 Tips:');
    console.log('   fail:404      → dead URLs in DB, nothing to do');
    console.log('   fail:403      → museum blocks bots. Try a VPN or different User-Agent');
    console.log('   fail:timeout  → run the script again, timeouts are often transient');
    console.log('   fail:not-image→ museum returned HTML error page instead of image');
    console.log('\n   Re-run the script to retry failures — skips already-cached files.\n');
  }
}

main().catch(console.error);
