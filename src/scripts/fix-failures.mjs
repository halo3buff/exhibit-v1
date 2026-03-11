// src/scripts/fix-failures.mjs
// Run: node src/scripts/fix-failures.mjs
//
// 1. Finds every URL in the DB that isn't cached yet
// 2. Tries 403s with multiple browser User-Agents + Referer tricks
// 3. Permanently removes 404/500 URLs from the DB (imageUrl set to NULL)
//    so they never show broken images on the site

import fs        from 'fs';
import path      from 'path';
import crypto    from 'crypto';
import sharp     from 'sharp';
import Database  from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const CACHE_DIR = path.join(ROOT, '.img-cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const IMAGE_SIGS = [
  [0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],
  [0x47,0x49,0x46],[0x52,0x49,0x46,0x46],[0x42,0x4D],
];
function isImage(buf) {
  return buf && buf.length > 500 && IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i]===b));
}

// ── Cache key logic — must match prewarm-cache.mjs and img/route.js ──────────

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
function getCacheFilename(fetchUrl, size) {
  const key = `${fetchUrl}:${size}`;
  return `${crypto.createHash('md5').update(key).digest('hex')}.jpg`;
}
function getCachePath(imageUrl, size) {
  return path.join(CACHE_DIR, getCacheFilename(getFetchUrl(imageUrl, size), size));
}

// An artwork is considered cached if its 400px tile exists (minimum to show in gallery)
function isCached(imageUrl) {
  const p = getCachePath(imageUrl, 400);
  try { return fs.statSync(p).size > 500; } catch { return false; }
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryFetch(url, userAgent) {
  let origin;
  try { origin = new URL(url).origin; } catch { origin = 'https://www.google.com'; }
  const res = await fetch(url, {
    headers: {
      'User-Agent':      userAgent,
      'Accept':          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer':         origin + '/',
      'sec-ch-ua':       '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile':'?0',
      'sec-fetch-dest':  'image',
      'sec-fetch-mode':  'no-cors',
      'sec-fetch-site':  'same-origin',
    },
    signal: AbortSignal.timeout(20000),
  });
  return res;
}

async function aggressiveFetch(imageUrl) {
  // Fetch the 400px source URL (same logic as prewarm)
  const fetchUrl = getFetchUrl(imageUrl, 400);
  for (let i = 0; i < USER_AGENTS.length; i++) {
    try {
      await sleep(i * 500);
      const res = await tryFetch(fetchUrl, USER_AGENTS[i]);
      if (res.status === 404 || res.status === 410) return { status: res.status };
      if (res.status === 500 || res.status === 503) return { status: res.status };
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (isImage(buf)) return { status: 200, buf };
    } catch (e) {
      if (i === USER_AGENTS.length - 1) return { status: 'timeout' };
    }
  }
  return { status: 403 };
}

async function resizeBuffer(buf, size) {
  try {
    return await sharp(buf)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  } catch { return buf; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const db      = new Database(DB_PATH);
  const allRows = db.prepare(`SELECT id, imageUrl FROM artworks WHERE imageUrl IS NOT NULL AND imageUrl != ''`).all();
  const missing = allRows.filter(r => !isCached(r.imageUrl));

  console.log(`\n🔍 Found ${missing.length} uncached URLs out of ${allRows.length} total\n`);

  if (missing.length === 0) {
    console.log('✅ Everything is already cached!');
    db.close();
    return;
  }

  const nullify = db.prepare(`UPDATE artworks SET imageUrl = '' WHERE id = ?`);

  let saved = 0, nulled = 0, stillFailed = 0;
  const stillFailedUrls = [];

  for (let i = 0; i < missing.length; i++) {
    const { id, imageUrl } = missing[i];
    process.stdout.write(`\r   [${i+1}/${missing.length}] saved:${saved} removed:${nulled} stuck:${stillFailed}  `);

    const result = await aggressiveFetch(imageUrl);

    if (result.status === 200 && result.buf) {
      // Save both sizes from the single download
      const isIiif = imageUrl.includes('/full/');
      for (const size of [400, 1200]) {
        const p = getCachePath(imageUrl, size);
        const resized = (!isIiif) ? await resizeBuffer(result.buf, size) : result.buf;
        fs.writeFileSync(p, resized);
      }
      saved++;
    } else if (result.status === 404 || result.status === 410 || result.status === 500) {
      nullify.run(id);
      nulled++;
    } else {
      stillFailed++;
      stillFailedUrls.push({ url: imageUrl, status: result.status });
    }

    await sleep(100);
  }

  db.close();

  console.log(`\n\n✅ Done`);
  console.log(`   Newly cached:   ${saved}`);
  console.log(`   Removed (dead): ${nulled}  (imageUrl set to '' — won't show broken images)`);
  console.log(`   Still failing:  ${stillFailed}`);

  if (stillFailedUrls.length > 0) {
    console.log('\n⚠️  URLs that refused all attempts (saved to fix-failures-report.json):');
    console.log(stillFailedUrls.slice(0, 20).map(f => `   ${f.status}  ${f.url}`).join('\n'));
    fs.writeFileSync(
      path.join(ROOT, 'fix-failures-report.json'),
      JSON.stringify(stillFailedUrls, null, 2)
    );
  }
}

main().catch(console.error);
