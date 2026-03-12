// src/scripts/harvest-artic.ts
// ─────────────────────────────────────────────────────────────────────────────
// ARTIC SPONGE HARVEST — Fetch Broad, Classify Later
//
// IMPORTANT: The ARTIC list endpoint does NOT support department filtering.
// query[term][department_id] and department_title are both silently ignored.
// The only working filter is query[term][is_public_domain]=true.
//
// Strategy: Fetch public domain items in sequential page batches.
// Raw JSON includes department_id, so the classifier sorts them later.
// ─────────────────────────────────────────────────────────────────────────────

import { articFetch } from '../../harvester/adapters/artic.js';
import * as fs from 'fs';
import * as path from 'path';

const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'artic');

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ARTIC SPONGE HARVEST — Fetch Broad, Classify Later      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Each task covers a distinct page range so there are no cross-task duplicates.
  // Pages are 100 items each. startPage is 1-indexed.
  const tasks = [
    { desc: 'Batch 1 (pages  1–20)',   startPage: 1,   limit: 2000 },
    { desc: 'Batch 2 (pages 21–35)',   startPage: 21,  limit: 1500 },
    { desc: 'Batch 3 (pages 36–55)',   startPage: 36,  limit: 2000 },
    { desc: 'Batch 4 (pages 56–70)',   startPage: 56,  limit: 1500 },
    { desc: 'Batch 5 (pages 71–90)',   startPage: 71,  limit: 2000 },
    { desc: 'Batch 6 (pages 91–110)',  startPage: 91,  limit: 2000 },
    { desc: 'Batch 7 (pages 111–125)', startPage: 111, limit: 1500 },
  ];

  let totalNew = 0;
  let totalDupes = 0;

  for (const task of tasks) {
    console.log(`\n📌 ${task.desc}`);
    const result = await articFetch(
      { is_public_domain: true },
      task.limit,
      task.startPage
    );
    totalNew += result.newCount;
    totalDupes += result.duplicateCount;
    console.log(`   ✓ ${result.newCount} new, ${result.duplicateCount} duplicates`);
    await sleep(2000);
  }

  console.log(`\n✅ ARTIC SPONGE HARVEST COMPLETE`);
  console.log(`   Total: ${totalNew} new items, ${totalDupes} duplicates skipped`);
  console.log(`   📁 /data/raw/artic/\n`);
}

main().catch(console.error);