// src/scripts/remove-uncached.mjs
// Sets imageUrl = '' for any artwork whose image isn't cached on disk.
// Run: node src/scripts/remove-uncached.mjs

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const CACHE_DIR = path.join(ROOT, '.img-cache');

const IMAGE_SIGS = [
  [0xFF,0xD8,0xFF],[0x89,0x50,0x4E,0x47],
  [0x47,0x49,0x46],[0x52,0x49,0x46,0x46],
];
function isImage(buf) {
  return buf && buf.length > 500 && IMAGE_SIGS.some(sig => sig.every((b,i) => buf[i]===b));
}
function isCached(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext  = url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1] || 'jpg';
  const p    = path.join(CACHE_DIR, `${hash}.${ext}`);
  return fs.existsSync(p) && isImage(fs.readFileSync(p));
}

const db      = new Database(DB_PATH);
const rows    = db.prepare(`SELECT id, imageUrl FROM artworks WHERE imageUrl != ''`).all();
const missing = rows.filter(r => !isCached(r.imageUrl));

console.log(`\nFound ${missing.length} uncached out of ${rows.length} total`);

if (missing.length === 0) {
  console.log('✅ Nothing to remove.');
  db.close();
  process.exit(0);
}

const nullify = db.prepare(`UPDATE artworks SET imageUrl = '' WHERE id = ?`);
const removeMany = db.transaction(items => {
  for (const { id } of items) nullify.run(id);
});

removeMany(missing);
db.close();

console.log(`✅ Done — cleared ${missing.length} uncached image URLs from the database.\n`);
