// src/scripts/harvest-smithsonian.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
// ─────────────────────────────────────────────────────────────────────────────
// SMITHSONIAN TARGETED HARVEST — Graphic Design Focus
//
// CHNDM STRATEGY:
//   Cooper Hewitt organises its 215k collection into departments.
//   ALL graphic design work — posters, book jackets, labels, trade cards,
//   type specimens, advertisements, magazine covers, letterheads — lives in
//   the "Drawings, Prints, and Graphic Design" department (129k objects).
//   Furniture, ceramics, textiles are in a separate department entirely.
//
//   Query: unit_code:CHNDM AND "Drawings, Prints, and Graphic Design"
//   This phrase matches the setName field in the raw JSON which reads
//   "Drawings, Prints, and Graphic Design Department" for every GD item.
//
//   Smithsonian API hard ceiling: 10k items per offset window.
//   We paginate 8 batches × 10k = up to 80k items from the GD dept pool.
//   Realistic yield with images: ~40k–60k items.
// ─────────────────────────────────────────────────────────────────────────────

import { smithsonianFetch } from '../../harvester/adapters/smithsonian.js';

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Targets ONLY the Drawings, Prints, and Graphic Design department at CHNDM.
// Excludes Product Design and Decorative Arts, Wallcoverings, Textiles, etc.
const chndmGD = 'unit_code:CHNDM AND "Drawings, Prints, and Graphic Design"';

const broadQuery =
  '(poster OR advertisement OR broadside OR "graphic design" OR ephemera OR print OR lithograph OR drawing OR photograph)';

const tasks = [
  // ── COOPER HEWITT — Graphic Design department, 8 paginated batches ────────
  { desc: 'CHNDM GD Dept — Batch 1 (offset 0)',      params: { q: chndmGD }, limit: 10000, startOffset: 0     },
  { desc: 'CHNDM GD Dept — Batch 2 (offset 10000)',  params: { q: chndmGD }, limit: 10000, startOffset: 10000 },
  { desc: 'CHNDM GD Dept — Batch 3 (offset 20000)',  params: { q: chndmGD }, limit: 10000, startOffset: 20000 },
  { desc: 'CHNDM GD Dept — Batch 4 (offset 30000)',  params: { q: chndmGD }, limit: 10000, startOffset: 30000 },
  { desc: 'CHNDM GD Dept — Batch 5 (offset 40000)',  params: { q: chndmGD }, limit: 10000, startOffset: 40000 },
  { desc: 'CHNDM GD Dept — Batch 6 (offset 50000)',  params: { q: chndmGD }, limit: 10000, startOffset: 50000 },
  { desc: 'CHNDM GD Dept — Batch 7 (offset 60000)',  params: { q: chndmGD }, limit: 10000, startOffset: 60000 },
  { desc: 'CHNDM GD Dept — Batch 8 (offset 70000)',  params: { q: chndmGD }, limit: 10000, startOffset: 70000 },

  // ── HISTORY & ART MUSEUMS (unchanged) ─────────────────────────────────────
  { desc: 'NMAH — Posters, Ads & Print Ephemera',    params: { q: `unit_code:NMAH AND ${broadQuery}` }, limit: 2000, startOffset: 0    },
  { desc: 'SAAM — Graphics & Ephemera Batch 1',      params: { q: `unit_code:SAAM AND ${broadQuery}` }, limit: 2000, startOffset: 0    },
  { desc: 'Portrait Gallery (NPG)',                  params: { q: 'unit_code:NPG' },                   limit: 1500, startOffset: 0    },
  { desc: 'SAAM — Graphics & Ephemera Batch 2',      params: { q: `unit_code:SAAM AND ${broadQuery}` }, limit: 1500, startOffset: 2000 },
];

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  SMITHSONIAN TARGETED HARVEST — Graphic Design Focus     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`   Running ${tasks.length} tasks...\n`);

  let totalNew   = 0;
  let totalDupes = 0;
  const results: { desc: string; newCount: number; duplicateCount: number }[] = [];

  for (const task of tasks) {
    console.log(`\n📌 ${task.desc}`);
    const result = await smithsonianFetch(task.params, task.limit, task.startOffset);
    totalNew   += result.newCount;
    totalDupes += result.duplicateCount;
    results.push({ desc: task.desc, newCount: result.newCount, duplicateCount: result.duplicateCount });
    console.log(`   ✓ ${result.newCount} new, ${result.duplicateCount} duplicates`);
    await sleep(2000);
  }

  const descWidth = Math.max(...results.map(r => r.desc.length));

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  BATCH BREAKDOWN                                          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  results.forEach((r, i) => {
    const num    = String(i + 1).padStart(2, ' ');
    const desc   = r.desc.padEnd(descWidth, ' ');
    const newStr = String(r.newCount).padStart(6, ' ');
    const dupStr = String(r.duplicateCount).padStart(5, ' ');
    console.log(`  ${num}. ${desc}   ${newStr} new   ${dupStr} dupes`);
  });
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`      ${'TOTAL'.padEnd(descWidth, ' ')}   ${String(totalNew).padStart(6, ' ')} new   ${String(totalDupes).padStart(5, ' ')} dupes`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n✅ SMITHSONIAN HARVEST COMPLETE`);
  console.log(`   📁 /data/raw/smithsonian/\n`);
}

main().catch(console.error);