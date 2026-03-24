// scripts/nsfw-purge.mjs
// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: After reviewing nsfw-flagged.json, run this to delete flagged items.
//
// Before running:
//   1. Open scripts/nsfw-flagged.json
//   2. Remove any items you want to KEEP from the "flagged" array
//      (false positives — classical nudes, artistic figure studies you want)
//   3. Save the file
//   4. Run: node scripts/nsfw-purge.mjs
//
// This will permanently delete all remaining flagged IDs from artworks.db.
// It also removes them from any exhibit_items they appear in.
//
// Usage:
//   node scripts/nsfw-purge.mjs
//   node scripts/nsfw-purge.mjs --dry-run     ← shows what would be deleted
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH    = path.join(__dirname, '..', 'artworks.db');
const INPUT      = path.join(__dirname, 'nsfw-flagged.json');
const LOG_PATH   = path.join(__dirname, 'nsfw-purge-log.json');

const isDryRun   = process.argv.includes('--dry-run');

// ── Confirm prompt ────────────────────────────────────────────────────────────
function confirm(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🗑️  NSFW Purge — Exhibit Archive');
  console.log('─────────────────────────────────\n');

  if (isDryRun) {
    console.log('⚠️  DRY RUN — nothing will be deleted\n');
  }

  // Load flagged list
  if (!fs.existsSync(INPUT)) {
    console.error(`❌ ${INPUT} not found. Run nsfw-scan.mjs first.`);
    process.exit(1);
  }

  const data    = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const flagged = data.flagged || [];

  if (flagged.length === 0) {
    console.log('✅ No flagged items to delete.');
    process.exit(0);
  }

  // Show summary
  console.log(`📋 Items queued for deletion: ${flagged.length.toLocaleString()}`);
  console.log('');

  // Group by trigger category for a clear summary
  const byTrigger = {};
  for (const item of flagged) {
    for (const t of item.triggeredBy) {
      byTrigger[t] = (byTrigger[t] || 0) + 1;
    }
  }
  for (const [cls, count] of Object.entries(byTrigger)) {
    console.log(`   ${cls.padEnd(8)} ${count.toLocaleString()} items`);
  }
  console.log('');

  // Show first 10 as a sanity check
  console.log('First 10 items queued:');
  flagged.slice(0, 10).forEach((item, i) => {
    const scoreStr = item.scores
      ? Object.entries(item.scores).filter(([, v]) => v > 0.05).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(' · ')
      : (item.triggeredBy || []).join(', ');
    console.log(`  ${i + 1}. [${item.source}] ${item.title || 'Untitled'} — ${scoreStr}`);
  });
  if (flagged.length > 10) console.log(`  ... and ${flagged.length - 10} more`);
  console.log('');

  if (!isDryRun) {
    const answer = await confirm(`⚠️  Permanently delete ${flagged.length} items from artworks.db? Type "yes" to confirm: `);
    if (answer !== 'yes') {
      console.log('\nAborted. Nothing was deleted.\n');
      process.exit(0);
    }
  }

  // Open DB
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ artworks.db not found'); process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const ids = flagged.map(f => f.id);

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would delete ${ids.length} rows from artworks table`);
    console.log(`[DRY RUN] Would delete associated exhibit_items entries`);
  } else {
    console.log('\nDeleting...');

    // Run in a transaction for atomicity
    const purge = db.transaction((ids) => {
      let artworkCount    = 0;
      let exhibitItemCount = 0;

      // Delete in chunks of 500 (SQLite limit)
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk       = ids.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');

        // Remove from exhibit_items first (FK constraint)
        const eiResult = db.prepare(
          `DELETE FROM exhibit_items WHERE artworkId IN (${placeholders})`
        ).run(...chunk);
        exhibitItemCount += eiResult.changes;

        // Delete from artworks
        const aResult = db.prepare(
          `DELETE FROM artworks WHERE id IN (${placeholders})`
        ).run(...chunk);
        artworkCount += aResult.changes;
      }

      return { artworkCount, exhibitItemCount };
    });

    const { artworkCount, exhibitItemCount } = purge(ids);

    // Write audit log
    const log = {
      purgedAt:           new Date().toISOString(),
      artworksDeleted:    artworkCount,
      exhibitItemsRemoved: exhibitItemCount,
      ids,
      items:              flagged,
    };
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

    console.log(`\n✅ Purge complete`);
    console.log(`   Artworks deleted:      ${artworkCount.toLocaleString()}`);
    console.log(`   Exhibit items removed: ${exhibitItemCount.toLocaleString()}`);
    console.log(`   Audit log written to:  scripts/nsfw-purge-log.json`);
  }

  db.close();
  console.log('');
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
