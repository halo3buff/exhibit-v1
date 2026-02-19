/**
 * BUILD DATABASE
 * 
 * Run: node scripts/build-database.js
 * Output: artworks.db (in project root)
 * 
 * SETUP: npm install better-sqlite3
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Source mapper functions (inline for CommonJS compatibility)
function mapMoMAItem(item) {
  const department = (item.Department || item.department || '').toLowerCase();
  const classification = (item.Classification || item.classification || '').toLowerCase();
  const medium = (item.Medium || item.medium || '').toLowerCase();

  if (classification.includes('photograph')) return 'photograph';
  if (classification.includes('drawing') || classification.includes('sketch')) return 'drawing';
  if (classification.includes('print')) return 'print';
  if (classification.includes('poster')) return 'poster';
  if (classification.includes('painting')) return 'painting';
  if (classification.includes('sculpture')) return 'sculpture';
  if (classification.includes('architecture')) return 'architecture';
  if (classification.includes('textile')) return 'textile';
  if (classification.includes('furniture')) return 'furniture';

  if (medium.includes('photograph') || medium.includes('gelatin silver')) return 'photograph';
  if (medium.includes('graphite') || medium.includes('charcoal')) return 'drawing';
  if (medium.includes('lithograph') || medium.includes('etching')) return 'print';
  if (medium.includes('bronze') || medium.includes('marble')) return 'sculpture';

  if (department.includes('photography')) return 'photograph';
  if (department.includes('drawings & prints')) {
    if (medium.includes('graphite') || medium.includes('charcoal')) return 'drawing';
    return 'print';
  }

  return null;
}

function mapMETItem(item) {
  const classification = (item.classification || '').toLowerCase();
  const medium = (item.medium || '').toLowerCase();

  if (classification.includes('photograph')) return 'photograph';
  if (classification.includes('drawing')) return 'drawing';
  if (classification.includes('print')) return 'print';
  if (classification.includes('poster')) return 'poster';
  if (classification.includes('painting')) return 'painting';
  if (classification.includes('sculpture')) return 'sculpture';

  if (medium.includes('photograph')) return 'photograph';
  if (medium.includes('graphite') || medium.includes('charcoal')) return 'drawing';
  if (medium.includes('lithograph') || medium.includes('etching')) return 'print';

  return null;
}

function mapArticItem(item) {
  const classification = (item.classification || '').toLowerCase();
  const objectType = (item.objectType || '').toLowerCase();

  if (classification.includes('photograph') || objectType.includes('photograph')) return 'photograph';
  if (classification.includes('print') || objectType.includes('print')) return 'print';
  if (classification.includes('drawing') || objectType.includes('drawing')) return 'drawing';
  if (classification.includes('poster') || objectType.includes('poster')) return 'poster';
  if (classification.includes('painting') || objectType.includes('painting')) return 'painting';

  return null;
}

function mapVAItem(item) {
  const classification = (item.classification || item.objectType || '').toLowerCase();

  if (classification.includes('photograph')) return 'photograph';
  if (classification.includes('print')) return 'print';
  if (classification.includes('drawing')) return 'drawing';
  if (classification.includes('poster')) return 'poster';
  if (classification.includes('painting')) return 'painting';
  if (classification.includes('sculpture')) return 'sculpture';
  if (classification.includes('furniture')) return 'furniture';
  if (classification.includes('textile')) return 'textile';

  return null;
}

function mapCooperHewittItem(item) {
  const classification = (item.classification || item.objectType || '').toLowerCase();
  
  if (classification.includes('print') || classification.includes('poster')) return 'print';
  if (classification.includes('drawing')) return 'drawing';
  if (classification.includes('photograph')) return 'photograph';
  if (classification.includes('furniture')) return 'furniture';
  if (classification.includes('textile')) return 'textile';

  return null;
}

function mapGenericItem(item) {
  // For zurich.json and other generic sources
  const classification = (item.classification || item.objectType || '').toLowerCase();
  const medium = (item.medium || '').toLowerCase();

  if (classification.includes('photograph') || medium.includes('photograph')) return 'photograph';
  if (classification.includes('print') || medium.includes('print')) return 'print';
  if (classification.includes('drawing') || medium.includes('drawing')) return 'drawing';
  if (classification.includes('poster')) return 'poster';
  if (classification.includes('painting')) return 'painting';

  return 'print'; // Default for graphic design work
}

function mapItem(item) {
  const source = (item.source || '').toLowerCase();

  if (source.includes('moma') || source.includes('museum of modern art')) return mapMoMAItem(item);
  if (source.includes('metropolitan') || source.includes('met museum')) return mapMETItem(item);
  if (source.includes('art institute') || source.includes('chicago')) return mapArticItem(item);
  if (source.includes('v&a') || source.includes('victoria')) return mapVAItem(item);
  if (source.includes('cooper hewitt')) return mapCooperHewittItem(item);
  
  // Generic mapping for other sources
  return mapGenericItem(item);
}

function buildDatabase() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Building Artwork Database');
  console.log('═══════════════════════════════════════════════════════════\n');

  const DB_PATH = path.join(__dirname, '../artworks.db');
  const MANIFEST_DIR = path.join(__dirname, '../public/manifests');

  // Delete existing database
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('  → Deleted existing artworks.db\n');
  }

  // Create database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      author      TEXT,
      year        TEXT,
      imageUrl    TEXT NOT NULL,
      source      TEXT NOT NULL,
      link        TEXT,
      type        TEXT,
      classification  TEXT,
      objectType      TEXT,
      medium          TEXT,
      created_at  INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_type ON artworks(type);
    CREATE INDEX IF NOT EXISTS idx_source ON artworks(source);
  `);

  console.log('  → Created artworks table with indexes\n');

  // Prepare insert
  const insert = db.prepare(`
    INSERT OR REPLACE INTO artworks
      (id, title, author, year, imageUrl, source, link, type, classification, objectType, medium)
    VALUES
      (@id, @title, @author, @year, @imageUrl, @source, @link, @type, @classification, @objectType, @medium)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item);
    }
  });

  // ⚠️ WHEN YOU ADD NEW HARVESTS: Add the filename here
  const manifests = [
    'moma.json',
    'met.json',
    'artic.json',
    'va.json',
    'cooperhewitt.json',
    'zurich.json',
    // Add new harvest files here as you create them:
    // 'archive.json',
    // 'designreviewed.json',
    // 'newmuseum.json',
  ];

  let totalItems = 0;

  for (const file of manifests) {
    const filePath = path.join(MANIFEST_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  Skipping ${file} (not found)`);
      continue;
    }

    process.stdout.write(`  Loading ${file}...`);

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const items = JSON.parse(raw);

      const toInsert = [];

      for (const item of items) {
        if (!item.imageUrl || !item.imageUrl.trim()) continue;

        const type = mapItem(item);

        toInsert.push({
          id:             item.id || `unknown-${Math.random()}`,
          title:          (item.title || 'Untitled').substring(0, 500),
          author:         (item.author || 'Unknown').substring(0, 300),
          year:           (item.year || 'Unknown').substring(0, 50),
          imageUrl:       item.imageUrl.trim(),
          source:         item.source || 'Unknown',
          link:           item.link || '',
          type:           type,
          classification: (item.classification || '').substring(0, 200),
          objectType:     (item.objectType || '').substring(0, 200),
          medium:         (item.medium || '').substring(0, 500),
        });
      }

      insertMany(toInsert);
      totalItems += toInsert.length;

      console.log(` ✓ ${toInsert.length} items`);

    } catch (e) {
      console.log(` ✗ Error: ${e.message}`);
    }
  }

  // Stats
  const typeBreakdown = db.prepare(`
    SELECT type, COUNT(*) as count 
    FROM artworks 
    WHERE type IS NOT NULL
    GROUP BY type 
    ORDER BY count DESC
  `).all();

  db.close();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DATABASE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total artworks: ${totalItems.toLocaleString()}`);
  console.log('\n  By Category:');
  typeBreakdown.forEach(({ type, count }) => {
    const bar = '█'.repeat(Math.min(30, Math.floor(count / totalItems * 30)));
    console.log(`    ${(type || 'unmapped').padEnd(15)} ${String(count).padStart(6)}  ${bar}`);
  });
  console.log('\n  Next: Update route.js and restart your app');
  console.log('═══════════════════════════════════════════════════════════\n');
}

buildDatabase();