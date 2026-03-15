// src/app/api/img/route.js
import fs     from 'fs';
import path   from 'path';
import crypto from 'crypto';
import https  from 'https';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// TODO: Make sure this is compatible on all platforms!! (B-Lou Nuke)
const CACHE_DIR = 'C:\\Users\\ameen\\Desktop\\.img-cache';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// In-memory LRU: keep 1000 most-used images in RAM
const LRU_MAX = 1000;
const lru = new Map();
function lruGet(k) {
  if (!lru.has(k)) return null;
  const v = lru.get(k); lru.delete(k); lru.set(k, v); return v;
}
function lruSet(k, v) {
  if (lru.size >= LRU_MAX) lru.delete(lru.keys().next().value);
  lru.set(k, v);
}

const IMAGE_SIGS = [[0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],[0x47,0x49,0x46],[0x52,0x49,0x46,0x46]];
function isValidImage(buf) {
  return buf && buf.length > 500 && IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i]===b));
}

// ── URL resolution — must match prewarm-cache.mjs exactly ─────────────────────

function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}
function getFetchUrl(imageUrl, size) {
  if (!size) return imageUrl;
  // LFA: contains /full/ but is NOT IIIF — do not rewrite
  if (imageUrl.includes('letterformarchive.org')) return imageUrl;
  if (imageUrl.includes('/full/')) return iiifUrl(imageUrl, size);
  if (imageUrl.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(imageUrl)) {
    return chSourceUrl(imageUrl);
  }
  return imageUrl;
}
function getCacheFilename(fetchUrl, size) {
  const key = size ? `${fetchUrl}:${size}` : fetchUrl;
  return `${crypto.createHash('md5').update(key).digest('hex')}.jpg`;
}

// ── Browser headers — same logic as prewarm-cache.mjs ─────────────────────────

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

// LFA session cookie — fetched once per process lifetime
let lfaCookie = null;
async function getLfaCookie() {
  if (lfaCookie !== null) return lfaCookie;
  return new Promise((resolve) => {
    https.get('https://oa.letterformarchive.org/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      const cookies = res.headers['set-cookie'];
      lfaCookie = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
      res.resume();
      resolve(lfaCookie);
    }).on('error', () => { lfaCookie = ''; resolve(''); });
  });
}

function buildHeaders(url) {
  const domain = getDomain(url);
  const base = {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept':          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest':  'image',
    'Sec-Fetch-Mode':  'no-cors',
    'Sec-Fetch-Site':  'cross-site',
    'Cache-Control':   'no-cache',
    'Pragma':          'no-cache',
  };
  if (domain.includes('letterformarchive.org')) {
    return { ...base, 'Referer': 'https://oa.letterformarchive.org/', ...(lfaCookie ? { 'Cookie': lfaCookie } : {}) };
  }
  if (domain.includes('designreviewed.com')) {
    return { ...base, 'Referer': 'https://designreviewed.com/' };
  }
  if (domain.includes('designarchives.aiga.org')) {
    return { ...base, 'Referer': 'https://designarchives.aiga.org/' };
  }
  return { ...base, 'Referer': `https://${domain}/` };
}

// Sharp loaded dynamically — keeps Turbopack from trying to bundle native module
async function resizeBuffer(buf, size) {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buf)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  } catch { return buf; }
}

export async function GET(request) {
  const params   = new URL(request.url).searchParams;
  const imageUrl = params.get('url');
  const size     = params.get('size') ? parseInt(params.get('size')) : null;
  if (!imageUrl) return new Response('Missing url', { status: 400 });

  const headers = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' };

  const isIiif   = imageUrl.includes('/full/') && !imageUrl.includes('letterformarchive.org');
  const fetchUrl = getFetchUrl(imageUrl, size);
  const filename = getCacheFilename(fetchUrl, size);
  const cachePath = path.join(CACHE_DIR, filename);

  // 1. RAM
  const mem = lruGet(filename);
  if (mem) return new Response(mem, { headers });

  // 2. Disk
  if (fs.existsSync(cachePath)) {
    const buf = fs.readFileSync(cachePath);
    if (isValidImage(buf)) { lruSet(filename, buf); return new Response(buf, { headers }); }
    fs.unlinkSync(cachePath);
  }

  // 3. Fetch
  try {
    let buf;

    // LFA needs a session cookie first
    if (imageUrl.includes('letterformarchive.org')) await getLfaCookie();

    if (imageUrl.includes('designarchives.aiga.org')) {
      buf = await new Promise((resolve, reject) => {
        const req = https.get(fetchUrl, {
          agent: insecureAgent,
          headers: buildHeaders(fetchUrl),
        }, (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
      });
    } else {
      const res = await fetch(fetchUrl, {
        headers: buildHeaders(fetchUrl),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return new Response('Upstream error', { status: 502 });
      buf = Buffer.from(await res.arrayBuffer());
    }

    if (!isValidImage(buf)) return new Response('Not an image', { status: 502 });
    if (!isIiif && size) buf = await resizeBuffer(buf, size);
    fs.writeFileSync(cachePath, buf);
    lruSet(filename, buf);
    return new Response(buf, { headers });
  } catch {
    return new Response('Fetch failed', { status: 502 });
  }
}