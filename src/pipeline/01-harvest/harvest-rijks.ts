// src/scripts/harvest-rijks.ts
// ─────────────────────────────────────────────────────────────────────────────
// RIJKS SPONGE HARVEST — Fetch Broad, Classify Later
//
// Uses Rijksmuseum Data Services v3 Search API — NO API KEY NEEDED.
// Old rijksmuseum.nl/api/en/collection endpoint returns 410 Gone (deprecated).
// New endpoint: data.rijksmuseum.nl/search/collection
//
// Supported params (Dutch or English both work):
//   type=painting / schilderij
//   type=print / prent
//   material=oil+paint
//   etc.
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { rijksFetch } from '../../harvester/adapters/rijks.js';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RIJKS SPONGE HARVEST — Fetch Broad, Classify Later       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const tasks = [
    // Graphic Design — Rijksmuseum has one of the world's best poster collections
    { desc: 'Graphic Design: Posters',        params: { type: 'poster' },       limit: 1500 },
    { desc: 'Graphic Design: Prints',         params: { type: 'print' },        limit: 2000 },
    { desc: 'Graphic Design: Drawings',       params: { type: 'drawing' },      limit: 1500 },

    // Painting
    { desc: 'Painting',                       params: { type: 'painting' },     limit: 2000 },
    { desc: 'Painting: Watercolor',           params: { type: 'watercolor' },   limit: 800  },

    // Photography
    { desc: 'Photography',                    params: { type: 'photograph' },   limit: 1500 },

    // Decorative Arts
    { desc: 'Decorative Arts: Ceramics',      params: { type: 'ceramic' },      limit: 800  },
    { desc: 'Decorative Arts: Furniture',     params: { type: 'furniture' },    limit: 600  },
    { desc: 'Decorative Arts: Textiles',      params: { type: 'textile' },      limit: 800  },
    { desc: 'Decorative Arts: Jewelry',       params: { type: 'jewelry' },      limit: 500  },
  ];

  let totalNew = 0;
  let totalDupes = 0;

  for (const task of tasks) {
    console.log(`\n📌 ${task.desc}`);
    const result = await rijksFetch(task.params, task.limit);
    totalNew += result.newCount;
    totalDupes += result.duplicateCount;
    console.log(`   ✓ ${result.newCount} new, ${result.duplicateCount} duplicates`);
    await sleep(2000);
  }

  console.log(`\n✅ RIJKS SPONGE HARVEST COMPLETE`);
  console.log(`   Total: ${totalNew} new items, ${totalDupes} duplicates skipped`);
  console.log(`   📁 /data/raw/rijks/\n`);
}

main().catch(console.error);