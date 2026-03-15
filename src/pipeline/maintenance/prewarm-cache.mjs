// src/pipeline/maintenance/prewarm-cache.mjs
// Caches two sizes per artwork: 400px (grid) and 1200px (fullscreen modal).
//
// Per-source strategy:
//   IIIF  (ARTIC, V&A, Rijks) → URL rewrite per size, small download
//   Cooper Hewitt              → fetch _z.jpg once, sharp resize to both sizes
//   MET, Smithsonian, others  → fetch original URL once, sharp resize to both sizes
//   Design Reviewed            → establish session cookie first, then fetch with cookie
//   LFA                        → not cacheable server-side, skipped

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import https    from 'https';
import sharp    from 'sharp';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..', '..', '..');
const DB_PATH    = path.join(ROOT, 'artworks.db');
const CACHE_DIR  = 'C:\\Users\\ameen\\Desktop\\.img-cache';
const MAX_RETRIES = 3;

const DOMAIN_CONCURRENCY = {
  'images.metmuseum.org':               10,
  'www.artic.edu':                       8,
  'iiif.micr.io':                        8,
  'framemark.vam.ac.uk':                 4,
  'fids.si.edu':                         4,
  'ids.lib.harvard.edu':                 4,
  'lh3.googleusercontent.com':          12,
  'upload.wikimedia.org':               12,
  'rijks.nl':                            4,
  'images.collection.cooperhewitt.org': 12,
  'designreviewed.com':                  2,
  'default':                             6,
};

const DOMAIN_DELAY = {
  'designreviewed.com': 1000,
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

function isCached(p) {
  try { return fs.statSync(p).size > 1000; } catch { return false; }
}

function cacheFilename(fetchUrl, size) {
  const key  = `${fetchUrl}:${size}`;
  const hash = crypto.createHash('md5').update(key).digest('hex');
  return `${hash}.jpg`;
}
function cachePath(fetchUrl, size) {
  return path.join(CACHE_DIR, cacheFilename(fetchUrl, size));
}

// ── URL resolution ─────────────────────────────────────────────────────────────

function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}
function getFetchUrl(imageUrl, size) {
  if (imageUrl.includes('/full/')) return iiifUrl(imageUrl, size);
  if (imageUrl.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(imageUrl)) {
    return chSourceUrl(imageUrl);
  }
  return imageUrl;
}

// ── DR session cookie ──────────────────────────────────────────────────────────
// DR uses WordPress session cookies to gate image access.
// We visit the homepage first to get a real session, then include that
// cookie on every image request — exactly what the browser does.

let drCookie = '';
async function establishDrSession() {
  return new Promise((resolve) => {
    const req = https.get('https://designreviewed.com/', {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection':      'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest':  'document',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Site':  'none',
        'Sec-Fetch-User':  '?1',
      },
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      drCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      res.resume();
      console.log(`   DR session cookie: ${drCookie ? drCookie.slice(0, 80) + '...' : '(none — will try without)'}`);
      resolve();
    });
    req.on('error', () => { console.log('   DR session request failed'); resolve(); });
    req.setTimeout(15000, () => { req.destroy(); resolve(); });
  });
}

// ── Network ────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return 'unknown'; }
}
function getConcurrency(domain) {
  for (const [k, v] of Object.entries(DOMAIN_CONCURRENCY)) if (domain.includes(k)) return v;
  return DOMAIN_CONCURRENCY.default;
}
function getDelay(domain) {
  for (const [k, v] of Object.entries(DOMAIN_DELAY)) if (domain.includes(k)) return v;
  return 0;
}

async function fetchRaw(url, attempt = 0) {
  try {
    // AIGA: bad SSL cert needs insecure agent
    if (url.includes('designarchives.aiga.org')) {
      return await new Promise((resolve) => {
        const req = https.get(url, {
          agent: insecureAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer':    'https://designarchives.aiga.org/',
          },
        }, (res) => {
          if (res.statusCode === 429 || res.statusCode === 503) {
            res.resume();
            if (attempt < MAX_RETRIES) {
              setTimeout(() => fetchRaw(url, attempt + 1).then(resolve), (attempt+1) * 3000);
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
        req.on('error', (e) => resolve({ err: `fail:${e.code || e.message?.slice(0,20)}` }));
        req.setTimeout(20000, () => { req.destroy(); resolve({ err: 'fail:timeout' }); });
      });
    }

    // DR: include session cookie established from homepage visit
    if (url.includes('designreviewed.com')) {
      return await new Promise((resolve) => {
        const req = https.get(url, {
          headers: {
            'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept':          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection':      'keep-alive',
            'Referer':         'https://designreviewed.com/',
            'Sec-Fetch-Dest':  'image',
            'Sec-Fetch-Mode':  'no-cors',
            'Sec-Fetch-Site':  'same-origin',
            ...(drCookie ? { 'Cookie': drCookie } : {}),
          },
        }, (res) => {
          if (res.statusCode === 429 || res.statusCode === 503) {
            res.resume();
            const wait = parseInt(res.headers['retry-after'] || '30') * 1000;
            if (attempt < MAX_RETRIES) {
              console.log(`\n   DR rate limited — waiting ${wait/1000}s...`);
              setTimeout(() => fetchRaw(url, attempt + 1).then(resolve), wait);
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
        req.on('error', (e) => resolve({ err: `fail:${e.code || e.message?.slice(0,20)}` }));
        req.setTimeout(20000, () => { req.destroy(); resolve({ err: 'fail:timeout' }); });
      });
    }

    // All other sources — standard fetch with browser headers
    const res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept':          'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         new URL(url).origin + '/',
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

// ── Per-artwork logic ──────────────────────────────────────────────────────────
const rawBufCache = new Map();

async function fetchAndSave(imageUrl, size) {
  // Skip LFA entirely — cannot be fetched server-side
  if (imageUrl.includes('letterformarchive.org')) return 'skip:lfa';

  const fetchUrl = getFetchUrl(imageUrl, size);
  const p        = cachePath(fetchUrl, size);

  if (isCached(p)) return 'skip';

  const isIiif = imageUrl.includes('/full/');
  if (isIiif) {
    const { buf, err } = await fetchRaw(fetchUrl);
    if (err) return err;
    fs.writeFileSync(p, buf);
    return 'saved';
  }

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

async function runWithConcurrency(tasks, concurrency, delayMs = 0) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      await tasks[i]();
      if (delayMs > 0) await sleep(delayMs);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`SELECT imageUrl FROM artworks WHERE imageUrl IS NOT NULL AND imageUrl != ''`).all();
  db.close();

  const rawUrls = [...new Set(rows.map(r => r.imageUrl))];
  const SIZES   = [400, 1200];

  let iiifCount = 0, chCount = 0, drCount = 0, lfaCount = 0, sharpCount = 0;
  for (const url of rawUrls) {
    if (url.includes('letterformarchive.org'))                                                   lfaCount++;
    else if (url.includes('designreviewed.com'))                                                 drCount++;
    else if (url.includes('/full/'))                                                             iiifCount++;
    else if (url.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(url))  chCount++;
    else                                                                                         sharpCount++;
  }

  const total = rawUrls.length * SIZES.length;
  console.log(`\n🖼  Pre-warming .img-cache`);
  console.log(`   ${rawUrls.length.toLocaleString()} artworks × 2 sizes = ${total.toLocaleString()} cache entries`);
  console.log(`   IIIF: ${iiifCount.toLocaleString()} | CH: ${chCount.toLocaleString()} | DR: ${drCount.toLocaleString()} | Sharp: ${sharpCount.toLocaleString()} | LFA (skipped): ${lfaCount.toLocaleString()}\n`);

  // Establish DR session before starting
  if (drCount > 0) {
    console.log('   Establishing Design Reviewed session...');
    await establishDrSession();
    console.log('');
  }

  const byDomain = new Map();
  for (const url of rawUrls) {
    if (url.includes('letterformarchive.org')) continue; // skip LFA
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
    const delayMs     = getDelay(domain);
    const taskFns = tasks.map(({ url, size }) => async () => {
      const result = await fetchAndSave(url, size);
      done++;
      if (result === 'saved')                saved++;
      else if (result.startsWith('skip'))    skipped++;
      else { failed++; failureMap.set(result, (failureMap.get(result) || 0) + 1); }
      if (done % 500 === 0 || done === total) {
        const pct = ((done / total) * 100).toFixed(1);
        process.stdout.write(`\r   ${pct}% (${done.toLocaleString()}/${total.toLocaleString()}) saved:${saved.toLocaleString()} skip:${skipped.toLocaleString()} fail:${failed}  `);
      }
    });
    return runWithConcurrency(taskFns, concurrency, delayMs);
  });

  await Promise.all(domainPromises);
  rawBufCache.clear();

  console.log(`\n\n✅ Done — ${saved.toLocaleString()} downloaded, ${skipped.toLocaleString()} already cached, ${failed} failed`);
  if (lfaCount > 0) console.log(`   ⚠️  ${lfaCount.toLocaleString()} LFA items skipped (cannot be fetched server-side)`);

  if (failed > 0) {
    console.log('\n❌ Failure breakdown:');
    for (const [reason, count] of [...failureMap.entries()].sort((a,b) => b[1]-a[1])) {
      console.log(`   ${reason.padEnd(25)} ${count}`);
    }
    console.log('\n   Re-run to retry — already-cached files are skipped.\n');
  }
}

main().catch(console.error);
