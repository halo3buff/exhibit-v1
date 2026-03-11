// src/scripts/revert-bad-years.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Reverts two classes of bad data introduced by backfill-unknowns.mjs:
//
//   1. Met year ranges — backfill incorrectly used objectBeginDate/objectEndDate
//      which are the ARTIST'S lifespan, not the artwork's date.
//      Fix: revert any Met row whose year was changed to a "c. YYYY–YYYY" range
//      back to 'n.d.' (honest unknown is better than wrong data)
//
//   2. Smithsonian inverted ranges — indexedStructured.date isn't reliably
//      ordered begin→end, producing nonsense like "c. 1930–1850".
//      Fix: revert any Smithsonian range where begin > end.
//
// Run: node src/scripts/revert-bad-years.mjs
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const LOG_PATH  = path.join(ROOT, 'data', 'backfill-log.json');

function yearToSort(y) {
  if (!y) return null;
  const m = y.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? parseInt(m[0]) : null;
}

function isInverted(yearStr) {
  // matches "c. 1930–1850" style — range where begin > end
  const m = yearStr.match(/c\.\s*(\d{4})[–-](\d{4})/);
  if (!m) return false;
  return parseInt(m[1]) > parseInt(m[2]);
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  REVERT — Fixing bad Met years & inverted SI ranges       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌  Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db     = new Database(DB_PATH);
  const update = db.prepare(`UPDATE artworks SET year = ?, year_sort = ? WHERE id = ?`);

  let metReverted = 0;
  let siReverted  = 0;

  // ── 1. Revert Met artist-lifespan ranges ──────────────────────────────────
  // These were written as "c. YYYY–YYYY" where neither year was in objectDate.
  // The safest revert: any Met row whose year is now a "c. YYYY–YYYY" range
  // AND whose year_sort could not have come from objectDate (heuristic: if the
  // year_sort matches the begin year of the range, it came from objectBeginDate).
  // Simplest safe approach: revert ALL Met "c. YYYY–YYYY" rows, since the
  // original transform would have set a real year if objectDate had one.

  const metRanges = db.prepare(`
    SELECT id, year FROM artworks
    WHERE source = 'met'
      AND year LIKE 'c. %–%'
  `).all();

  console.log(`Found ${metRanges.length} Met rows with range years to revert`);

  const metBatch = db.transaction(() => {
    for (const row of metRanges) {
      update.run('n.d.', null, row.id);
      metReverted++;
    }
  });
  metBatch();

  console.log(`✓ Reverted ${metReverted} Met rows → 'n.d.'\n`);

  // ── 2. Revert inverted Smithsonian ranges ─────────────────────────────────
  const siRanges = db.prepare(`
    SELECT id, year FROM artworks
    WHERE source = 'smithsonian'
      AND year LIKE 'c. %–%'
  `).all();

  console.log(`Found ${siRanges.length} Smithsonian range rows, checking for inversions...`);

  const siBatch = db.transaction(() => {
    for (const row of siRanges) {
      if (isInverted(row.year)) {
        update.run('n.d.', null, row.id);
        siReverted++;
      }
    }
  });
  siBatch();

  console.log(`✓ Reverted ${siReverted} inverted Smithsonian ranges → 'n.d.'\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  REVERT COMPLETE                                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`  Met rows reverted:          ${metReverted}`);
  console.log(`  Smithsonian rows reverted:  ${siReverted}`);
  console.log(`  Total reverted:             ${metReverted + siReverted}`);
  console.log(`\n  Rows NOT reverted (kept as correct):`);
  console.log(`    - V&A, ARTIC, Rijks, CooperHewitt range years (source date fields)`);
  console.log(`    - Place-origin author values (France, Lucknow, etc.) — legitimate museum attribution\n`);

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
