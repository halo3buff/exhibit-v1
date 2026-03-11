// src/scripts/harvest-met.ts
// ─────────────────────────────────────────────────────────────────────────────
// MET SPONGE HARVEST — Fetch Broad, Classify Later
// Strategy: Fetch entire departments, let the classifier filter later
// ─────────────────────────────────────────────────────────────────────────────

import { metFetch } from '../harvester/adapters/met.js';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  MET SPONGE HARVEST — Fetch Broad, Classify Later        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  // ✅ isPublicDomain: true filters the SEARCH results to only open-access items.
  // Without it, the search returns all 99k IDs in a dept, but ~60% return 403
  // when you try to fetch them (copyrighted, restricted access).
  // With it, only fetchable items are returned — near-zero 403s.
  const tasks = [
    { 
      desc: 'Graphic Design Scope (Dept 9: Drawings & Prints)',
      params: { departmentId: 9, hasImages: true, isPublicDomain: true }, 
      limit: 2000 
    },
    { 
      desc: 'Painting Scope (Dept 11: European Paintings)',
      params: { departmentId: 11, hasImages: true, isPublicDomain: true }, 
      limit: 2000 
    },
    { 
      desc: 'Painting Scope (Dept 21: Modern Art)',
      params: { departmentId: 21, hasImages: true, isPublicDomain: true }, 
      limit: 1500 
    },
    { 
      desc: 'Photography Scope (Dept 19)',
      params: { departmentId: 19, hasImages: true, isPublicDomain: true }, 
      limit: 2000 
    },
    { 
      desc: 'Decorative Arts (Dept 12: Euro Sculpture & Dec Arts)',
      params: { departmentId: 12, hasImages: true, isPublicDomain: true }, 
      limit: 2000 
    },
    { 
      desc: 'Decorative Arts (Dept 1: American Dec Arts)',
      params: { departmentId: 1, hasImages: true, isPublicDomain: true }, 
      limit: 1500 
    },
  ];
  
  const savedIds = new Set<string>();
  let totalNew = 0;
  let totalDupes = 0;
  
  for (const task of tasks) {
    console.log(`\n📌 ${task.desc}`);
    const result = await metFetch(task.params, task.limit, savedIds);
    totalNew += result.newCount;
    totalDupes += result.duplicateCount;
    console.log(`   ✓ ${result.newCount} new, ${result.duplicateCount} duplicates`);
    await sleep(2000);
  }
  
  console.log(`\n✅ MET SPONGE HARVEST COMPLETE`);
  console.log(`   Total: ${totalNew} new items, ${totalDupes} duplicates skipped`);
  console.log(`   Unique saved: ${savedIds.size}`);
  console.log(`   📁 /data/raw/met/\n`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(console.error);