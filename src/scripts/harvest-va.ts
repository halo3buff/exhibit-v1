// src/scripts/harvest-va.ts
// ─────────────────────────────────────────────────────────────────────────────
// V&A SPONGE HARVEST — Fetch Broad, Classify Later
//
// Uses q= keyword search, exactly like the original working scriptz/harvest_va.js.
// id_category with THES IDs returns 0 results — do not use.
// ─────────────────────────────────────────────────────────────────────────────

import { vaFetch } from '../harvester/adapters/va.js';

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  V&A SPONGE HARVEST — Fetch Broad, Classify Later        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const tasks = [
    { desc: 'Posters & Graphic Design',  params: { q: 'poster',      images_exist: 'true' }, limit: 2000 },
    { desc: 'Prints',                    params: { q: 'print',       images_exist: 'true' }, limit: 2000 },
    { desc: 'Drawings',                  params: { q: 'drawing',     images_exist: 'true' }, limit: 2000 },
    { desc: 'Photography',               params: { q: 'photograph',  images_exist: 'true' }, limit: 2000 },
    { desc: 'Painting',                  params: { q: 'painting',    images_exist: 'true' }, limit: 2000 },
    { desc: 'Textiles',                  params: { q: 'textile',     images_exist: 'true' }, limit: 1500 },
    { desc: 'Ceramics',                  params: { q: 'ceramic',     images_exist: 'true' }, limit: 1500 },
    { desc: 'Furniture',                 params: { q: 'furniture',   images_exist: 'true' }, limit: 1000 },
    { desc: 'Jewellery',                 params: { q: 'jewellery',   images_exist: 'true' }, limit: 1000 },
  ];

  let totalNew = 0;
  let totalDupes = 0;

  for (const task of tasks) {
    console.log(`\n📌 ${task.desc}`);
    const result = await vaFetch(task.params, task.limit);
    totalNew += result.newCount;
    totalDupes += result.duplicateCount;
    console.log(`   ✓ ${result.newCount} new, ${result.duplicateCount} duplicates`);
    await sleep(2000);
  }

  console.log(`\n✅ V&A SPONGE HARVEST COMPLETE`);
  console.log(`   Total: ${totalNew} new items, ${totalDupes} duplicates skipped`);
  console.log(`   📁 /data/raw/va/\n`);
}

main().catch(console.error);