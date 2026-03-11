// src/app/img-cache/[...filename]/route.js
// Handles old browser-cached 301 redirects pointing to /img-cache/HASH.jpg
// Serves from .img-cache/ on HIT.
// On MISS: reverse-looks up original URL from DB, fetches, caches, serves.
import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import Database from 'better-sqlite3';

const CACHE_DIR = path.join(process.cwd(), '.img-cache');
const DB_PATH   = path.join(process.cwd(), 'artworks.db');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const IMAGE_SIGNATURES = [
  [0xFF, 0xD8, 0xFF], [0x89, 0x50, 0x4E, 0x47],
  [0x47, 0x49, 0x46], [0x52, 0x49, 0x46, 0x46], [0x42, 0x4D],
];
function isValidImageBuffer(buf) {
  if (!buf || buf.length < 8) return false;
  return IMAGE_SIGNATURES.some(sig => sig.every((b, i) => buf[i] === b));
}

function getMime(name) {
  const ext = path.extname(name).toLowerCase().slice(1);
  const map = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif' };
  return map[ext] || 'image/jpeg';
}

let reverseMap = null;
function getReverseMap() {
  if (reverseMap) return reverseMap;
  reverseMap = new Map();
  try {
    const db   = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare(`SELECT imageUrl FROM artworks WHERE imageUrl IS NOT NULL AND imageUrl != ''`).all();
    db.close();
    for (const { imageUrl } of rows) {
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const ext  = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1] || 'jpg';
      reverseMap.set(`${hash}.${ext}`, imageUrl);
    }
    console.log(`[img-cache] Reverse map: ${reverseMap.size} entries`);
  } catch (e) {
    console.error('[img-cache] Reverse map error:', e.message);
  }
  return reverseMap;
}

export async function GET(request, { params }) {
  const { filename } = await params;
  const name = Array.isArray(filename) ? filename.join('/') : filename;
  if (!name) return new Response('Not found', { status: 404 });

  const filePath = path.join(CACHE_DIR, name);
  const mime     = getMime(name);

  // ── HIT ───────────────────────────────────────────────────────────────────
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    if (isValidImageBuffer(buffer)) {
      return new Response(buffer, {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' },
      });
    }
    fs.unlinkSync(filePath); // corrupt, delete and fall through
  }

  // ── MISS: reverse-lookup and fetch ────────────────────────────────────────
  const originalUrl = getReverseMap().get(name);
  if (!originalUrl) return new Response('Not found', { status: 404 });

  try {
    const upstream = await fetch(originalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Exhibit/1.0)', 'Accept': 'image/*,*/*' },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) return new Response('Upstream error', { status: 502 });

    const upstreamType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer       = Buffer.from(await upstream.arrayBuffer());

    if (isValidImageBuffer(buffer)) fs.writeFileSync(filePath, buffer);

    return new Response(buffer, {
      headers: { 'Content-Type': upstreamType, 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (err) {
    return new Response(`Failed: ${err.message}`, { status: 502 });
  }
}