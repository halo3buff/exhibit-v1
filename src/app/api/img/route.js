// src/app/api/img/route.js
import fs     from 'fs';
import path   from 'path';
import crypto from 'crypto';


// TODO: Make sure this is compatable on all platforms!! (B-Lou Nuke)
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

// ── URL resolution — must match prewarm-cache.mjs exactly ────────────────────

function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}
function getFetchUrl(imageUrl, size) {
  if (!size) return imageUrl;
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

  const isIiif    = imageUrl.includes('/full/');
  const fetchUrl  = getFetchUrl(imageUrl, size);
  const filename  = getCacheFilename(fetchUrl, size);
  const cachePath = path.join(CACHE_DIR, filename);
  const headers   = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' };

  // 1. RAM
  const mem = lruGet(filename);
  if (mem) return new Response(mem, { headers });

  // 2. Disk
  if (fs.existsSync(cachePath)) {
    const buf = fs.readFileSync(cachePath);
    if (isValidImage(buf)) { lruSet(filename, buf); return new Response(buf, { headers }); }
    fs.unlinkSync(cachePath);
  }

  // 3. Fetch from museum
  try {
    const res = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36', 'Accept': 'image/*,*/*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return new Response('Upstream error', { status: 502 });
    let buf = Buffer.from(await res.arrayBuffer());
    if (!isValidImage(buf)) return new Response('Not an image', { status: 502 });
    if (!isIiif && size) buf = await resizeBuffer(buf, size);
    fs.writeFileSync(cachePath, buf);
    lruSet(filename, buf);
    return new Response(buf, { headers });
  } catch {
    return new Response('Fetch failed', { status: 502 });
  }
}