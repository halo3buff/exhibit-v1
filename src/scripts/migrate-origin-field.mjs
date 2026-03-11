// src/scripts/migrate-origin-field.mjs
// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION: Add `origin` column and separate place attributions from author.
//
// Problem: backfill-unknowns wrote place names ("France", "Lucknow", etc.)
// into the `author` field as a fallback. These are legitimate museum
// attributions but should be displayed as "Origin", not "Artist".
//
// This script:
//   1. Adds an `origin` column to artworks table
//   2. Identifies rows where `author` looks like a place (not a person name)
//   3. Moves those values to `origin`, resets `author` to 'Unknown'
//   4. Logs every row changed for audit
//
// Safe to re-run — uses INSERT OR IGNORE / UPDATE WHERE logic.
// Run: node src/scripts/migrate-origin-field.mjs
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..', '..');
const DB_PATH  = path.join(ROOT, 'artworks.db');
const LOG_PATH = path.join(ROOT, 'data', 'origin-migration-log.json');

// ── Place-name detection ───────────────────────────────────────────────────
// These are values the backfill wrote into `author` that are actually origins.
// Covers everything written by the V&A, Smithsonian, Met, and Rijks extractors.
const KNOWN_PLACE_AUTHORS = new Set([
  // Countries / regions
  'France', 'Germany', 'Italy', 'England', 'Britain', 'Great Britain',
  'United Kingdom', 'Netherlands', 'Europe', 'America', 'American',
  'Japan', 'China', 'India', 'Korea', 'Iran', 'Turkey', 'Egypt',
  'Spain', 'Portugal', 'Belgium', 'Austria', 'Switzerland', 'Russia',
  'Scandinavia', 'Denmark', 'Sweden', 'Norway', 'Finland',
  'Mexico', 'Peru', 'Colombia', 'Brazil',
  'Africa', 'West Africa', 'East Africa', 'South Africa',

  // Cities
  'London', 'Paris', 'Rome', 'Florence', 'Venice', 'Milan',
  'Amsterdam', 'Antwerp', 'Brussels', 'Vienna', 'Prague',
  'New York', 'Boston', 'Philadelphia',
  'Lucknow', 'Kolkata', 'Mumbai', 'Delhi', 'Jaipur', 'Varanasi',
  'Hyderabad', 'Deccan', 'Kangra', 'Rajasthan', 'Dunhuang',
  'Lahore', 'Ramsgate', 'Cuddalore', 'Astana', 'Shache',
  'Trichinopoly', 'Mughal Empire', 'Malay Peninsula',
  'The Limes Watchtowers',

  // Met nationality strings (written to author as culture fallback)
  'Chinese, for American market',
  'American, 19th century',
  'French, 18th century',
  'Dutch, 17th century',
  'British, 19th century',
  'Italian, 17th century',
  'German, 18th century',
  'Japanese, Edo period',
  'Korean, Joseon dynasty',
  'Chinese, Qing dynasty',
]);

// Also catch the pattern "Adjective, period" (e.g. "French, ca. 1750")
// and multi-word place-like strings that aren't people names
function looksLikePlace(author) {
  if (!author) return false;
  const a = author.trim();
  if (KNOWN_PLACE_AUTHORS.has(a)) return true;

  // Pattern: "Nationality, date-or-period"  e.g. "American, 18th century"
  if (/^[A-Z][a-z]+,\s*(ca?\.\s*)?\d/.test(a)) return true;
  if (/^[A-Z][a-z]+,\s*(early|late|mid|circa)/.test(a)) return true;

  // All-caps country abbreviation-style values
  if (/^[A-Z]{2,6}$/.test(a)) return true;

  return false;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION — Separating "Origin" from "Author"            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌  Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  // Step 1 — add `origin` column if it doesn't exist yet
  const cols = db.prepare(`PRAGMA table_info(artworks)`).all().map(r => r.name);
  if (!cols.includes('origin')) {
    db.exec(`ALTER TABLE artworks ADD COLUMN origin TEXT`);
    console.log('✓ Added `origin` column to artworks table\n');
  } else {
    console.log('ℹ  `origin` column already exists — skipping ALTER TABLE\n');
  }

  // Step 2 — add index for origin queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_origin ON artworks(origin)`);

  // Step 3 — find rows where author looks like a place
  const rows = db.prepare(`
    SELECT id, source, author, origin
    FROM artworks
    WHERE author IS NOT NULL AND author != 'Unknown' AND author != ''
  `).all();

  console.log(`Scanning ${rows.length.toLocaleString()} rows with a non-empty author...\n`);

  const updateStmt = db.prepare(`
    UPDATE artworks SET author = 'Unknown', origin = ? WHERE id = ?
  `);

  const log = [];
  let moved = 0;
  let alreadyHasOrigin = 0;

  const migrate = db.transaction(() => {
    for (const row of rows) {
      if (!looksLikePlace(row.author)) continue;

      // If origin already has a real value from somewhere else, don't clobber it
      if (row.origin && row.origin !== 'Unknown' && row.origin !== '') {
        alreadyHasOrigin++;
        continue;
      }

      updateStmt.run(row.author, row.id);
      log.push({ id: row.id, source: row.source, movedToOrigin: row.author });
      moved++;
    }
  });

  migrate();

  // Write log
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION COMPLETE                                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`  Rows migrated (author → origin):  ${moved}`);
  console.log(`  Skipped (origin already set):     ${alreadyHasOrigin}`);
  console.log(`  Log: data/origin-migration-log.json\n`);

  // Show breakdown by source
  const breakdown = {};
  for (const entry of log) {
    breakdown[entry.source] = (breakdown[entry.source] || 0) + 1;
  }
  console.log('  By source:');
  for (const [src, count] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${src.padEnd(14)} ${count}`);
  }
  console.log('');

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
