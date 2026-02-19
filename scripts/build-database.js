const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { classifyArtwork } = require('./category-rules');

const manifestDir = path.join(__dirname, '../public/manifests');
const manifests = ['moma.json', 'met.json', 'artic.json', 'va.json', 'cooperhewitt.json', 'zurich.json'];
const dbPath = path.join(__dirname, '../artworks.db');

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new Database(dbPath);

// Updated schema with main_category and sub_category
db.exec(`
  CREATE TABLE artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    sourceId TEXT,
    title TEXT,
    author TEXT,
    year TEXT,
    medium TEXT,
    imageUrl TEXT,
    link TEXT,
    main_category TEXT,
    sub_category TEXT,
    classification TEXT,
    objectType TEXT,
    department TEXT
  );
  
  CREATE INDEX idx_main ON artworks(main_category);
  CREATE INDEX idx_sub ON artworks(sub_category);
  CREATE INDEX idx_both ON artworks(main_category, sub_category);
`);

const insert = db.prepare(`
  INSERT INTO artworks (source, sourceId, title, author, year, medium, imageUrl, link, 
                        main_category, sub_category, classification, objectType, department)
  VALUES (@source, @sourceId, @title, @author, @year, @medium, @imageUrl, @link,
          @main_category, @sub_category, @classification, @objectType, @department)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) insert.run(item);
});

function safe(val) { return val ? String(val).trim() : null; }

console.log('═══════════════════════════════════════════════════');
console.log('  Building Database (Industry Standard Categories)');
console.log('═══════════════════════════════════════════════════\n');

for (const file of manifests) {
  const filePath = path.join(manifestDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipping ${file}`);
    continue;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const processed = raw.map(item => {
    const entry = {
      source: safe(file.replace('.json', '')),
      sourceId: safe(item.id || item.objectID),
      title: safe(item.title),
      author: safe(item.author || item.artistDisplayName || item.artist),
      year: safe(item.year || item.objectDate || item.date),
      medium: safe(item.medium || item.Medium),
      imageUrl: safe(item.imageUrl),
      link: safe(item.link),
      classification: safe(item.classification || item.Classification),
      objectType: safe(item.objectType),
      department: safe(item.department || item.Department)
    };
    
    // Get main + sub category
    const result = classifyArtwork(entry);
    entry.main_category = result.main;
    entry.sub_category = result.sub;
    
    return entry;
  });

  insertMany(processed);
  console.log(`  ✓ ${file.padEnd(20)} ${processed.length} items`);
}

// Stats
const mainStats = db.prepare(`
  SELECT main_category, COUNT(*) as count 
  FROM artworks 
  GROUP BY main_category 
  ORDER BY count DESC
`).all();

const subStats = db.prepare(`
  SELECT main_category, sub_category, COUNT(*) as count 
  FROM artworks 
  WHERE sub_category IS NOT NULL
  GROUP BY main_category, sub_category 
  ORDER BY main_category, count DESC
`).all();

console.log('\n═══════════════════════════════════════════════════');
console.log('  MAIN CATEGORIES');
console.log('═══════════════════════════════════════════════════');
mainStats.forEach(({ main_category, count }) => {
  const bar = '█'.repeat(Math.min(40, Math.floor(count / mainStats[0].count * 40)));
  console.log(`  ${(main_category || 'null').padEnd(25)} ${String(count).padStart(5)}  ${bar}`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('  SUBCATEGORIES (top 20)');
console.log('═══════════════════════════════════════════════════');
subStats.slice(0, 20).forEach(({ main_category, sub_category, count }) => {
  console.log(`  ${main_category} → ${sub_category}`.padEnd(50) + count);
});

db.close();

console.log('\n✅ Database build complete\n');