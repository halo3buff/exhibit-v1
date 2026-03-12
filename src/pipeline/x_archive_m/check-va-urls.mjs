import Database from 'better-sqlite3';
const db = new Database('artworks.db', { readonly: true });
const rows = db.prepare(`SELECT imageUrl FROM artworks WHERE source='va' AND imageUrl != '' LIMIT 20`).all();
rows.forEach(r => console.log(r.imageUrl));
db.close();
