// src/scripts/fix-va-images.mjs
// V&A imageUrls are stored with !100,100 — update to !1280,1280 and re-prewarm.
// Run: node src/scripts/fix-va-images.mjs

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import sharp    from 'sharp';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const CACHE_DIR = 'C:\\Users\\ameen\\Desktop\\.img-cache';

function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function getCachePath(imageUrl, size) {
  const fetchUrl = iiifUrl(imageUrl, size);
  const hash = crypto.createHash('md5').update(`${fetchUrl}:${size}`).digest('hex');
  return path.join(CACHE_DIR, `${hash}.jpg`);
}

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/121.0.0.0', 'Accept': 'image/*' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function resizeBuf(buf, size) {
  return sharp(buf)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const db = new Database(DB_PATH);

  const bad = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE source = 'va'
      AND imageUrl LIKE '%!100,100%'
  `).all();

  console.log(`\n🔍 Found ${bad.length} V&A records with !100,100 thumbnail URLs\n`);

  if (bad.length === 0) {
    console.log('✅ Nothing to fix!');
    db.close();
    return;
  }

  const updateStmt = db.prepare(`UPDATE artworks SET imageUrl = ? WHERE id = ?`);
  let fixed = 0, failed = 0;

  for (let i = 0; i < bad.length; i++) {
    const { id, imageUrl } = bad[i];
    process.stdout.write(`\r   [${i+1}/${bad.length}] fixed:${fixed} failed:${failed}  `);

    // New URL with proper size
    const newUrl = imageUrl.replace('!100,100', '!1280,1280');

    try {
      const buf = await fetchBuf(newUrl);
      for (const size of [400, 1200]) {
        const resized = await resizeBuf(buf, size);
        fs.writeFileSync(getCachePath(newUrl, size), resized);
      }
      updateStmt.run(newUrl, id);
      fixed++;
    } catch {
      failed++;
    }

    await sleep(80);
  }

  db.close();
  console.log(`\n\n✅ Done — ${fixed} fixed, ${failed} failed\n`);
}

main().catch(console.error);
