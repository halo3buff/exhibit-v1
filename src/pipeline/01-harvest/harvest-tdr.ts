// src/pipeline/01-harvest/harvest-tdr.ts
//
// THE DESIGNERS REPUBLIC — Harvest from Are.na
//
// TDR doesn't have a public API, but Are.na (are.na) is a research/mood-board
// platform used heavily in graphic design circles. It has a fully public REST API
// with no auth required for public channels.
//
// Are.na API docs: https://dev.are.na/documentation
// Base: https://api.are.na/v2/
//
// Strategy: search Are.na for channels tagged with TDR / Designers Republic,
// then harvest blocks (images) from those channels.
// Also targets known graphic design channels with thousands of curated images.
//
// This gets you: posters, album art, print work, editorial, packaging — all
// tagged and sourced by design researchers and practitioners.
//
// Run:
//   npx tsx src/pipeline/01-harvest/harvest-tdr.ts
//
// Then:
//   npx tsx src/pipeline/02-transform/02-transform-tdr.ts
//   npx tsx src/pipeline/03-load/03-load-tdr.ts

import fs   from 'fs';
import path from 'path';

const OUT_DIR  = path.join('data', 'raw', 'tdr');
const BASE_URL = 'https://api.are.na/v2';
const PER_PAGE = 100;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArtHarvester/2.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        const wait = parseInt(res.headers.get('retry-after') || '30') * 1000;
        console.log(`   Rate limited — waiting ${wait/1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch(e: any) {
      if (i < retries - 1) { await sleep(1500 * (i + 1)); continue; }
      throw e;
    }
  }
}

// ── Known graphic design channels on Are.na ───────────────────────────────────
// These are public channels with thousands of curated, high-quality GD images.
// slug = the URL slug from are.na/channel/[slug]
const CHANNELS = [
  // Graphic design — broad and deep
  { slug: 'graphic-design-vjxbulcmflm',       desc: 'Graphic Design (large)'         },
  { slug: 'type-and-typography',               desc: 'Type & Typography'              },
  { slug: 'poster-design',                     desc: 'Poster Design'                  },
  { slug: 'swiss-graphic-design',              desc: 'Swiss Graphic Design'           },
  { slug: 'book-design-and-typography',        desc: 'Book Design'                    },
  { slug: 'editorial-design-and-layout',       desc: 'Editorial Design'               },
  { slug: 'album-art',                         desc: 'Album Art'                      },
  { slug: 'packaging-design',                  desc: 'Packaging Design'               },
  { slug: 'corporate-identity',                desc: 'Corporate Identity'             },
  { slug: 'brutalist-design',                  desc: 'Brutalist Design'               },
  { slug: 'psychedelic-posters',               desc: 'Psychedelic Posters'            },
  { slug: 'bauhaus',                           desc: 'Bauhaus'                        },
  { slug: 'constructivism',                    desc: 'Constructivism'                 },
  { slug: 'designers-republic',                desc: 'The Designers Republic'         },
  { slug: 'warp-records',                      desc: 'Warp Records Artwork'           },
];

const seen = new Set<string>();
let fileIndex = 0;

async function harvestChannel(slug: string, desc: string): Promise<{ saved: number; skipped: number }> {
  console.log(`\n📌 ${desc} (${slug})`);

  // First get channel metadata to find total pages
  let channelData: any;
  try {
    channelData = await fetchJson(`${BASE_URL}/channels/${slug}?per=${PER_PAGE}&page=1`);
  } catch(e: any) {
    console.log(`   ✗ Channel not found or private: ${e.message}`);
    return { saved: 0, skipped: 0 };
  }

  const totalBlocks = channelData.length ?? 0;
  const totalPages  = Math.ceil(totalBlocks / PER_PAGE);
  console.log(`   ${totalBlocks} blocks, ${totalPages} pages`);

  let saved = 0, skipped = 0;

  for (let page = 1; page <= totalPages; page++) {
    let data: any;
    try {
      data = await fetchJson(`${BASE_URL}/channels/${slug}/contents?per=${PER_PAGE}&page=${page}`);
    } catch(e: any) {
      console.warn(`   Page ${page} failed: ${e.message}`);
      continue;
    }

    const blocks = data.contents ?? [];

    for (const block of blocks) {
      // Only Image blocks
      if (block.class !== 'Image') { skipped++; continue; }

      const id = `tdr-arena-${block.id}`;
      if (seen.has(id)) { skipped++; continue; }

      // Get the largest available image
      const imageUrl =
        block.image?.large?.url  ??
        block.image?.square?.url ??
        block.image?.thumb?.url  ??
        block.image?.original?.url ?? '';

      if (!imageUrl) { skipped++; continue; }

      // Title: use block title, or description, or channel title
      const title =
        block.title?.trim() ||
        block.description?.replace(/<[^>]+>/g, '').trim().slice(0, 120) ||
        `${desc} — ${block.id}`;

      // Try to extract year from title or description
      const yearMatch = (block.title + ' ' + (block.description ?? '')).match(/\b(19[0-9]{2}|20[0-2][0-9])\b/);
      const year = yearMatch ? yearMatch[1] : '';

      const record = {
        id,
        source:      'tdr',
        title,
        author:      block.user?.username ?? '',
        year,
        imageUrl,
        url:         `https://www.are.na/block/${block.id}`,
        channel:     slug,
        channelDesc: desc,
        tags:        (block.tags ?? []).map((t: any) => t.name ?? t),
        createdAt:   block.created_at ?? '',
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `tdr-${String(fileIndex++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      saved++;
    }

    process.stdout.write(`\r   Page ${page}/${totalPages} — saved: ${saved}`);
    await sleep(300); // Are.na is generous but be polite
  }

  console.log(`\n   ✓ saved: ${saved} skipped: ${skipped}`);
  return { saved, skipped };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ARE.NA GRAPHIC DESIGN HARVEST                           ║');
  console.log('║  Sourcing curated GD images from public Are.na channels  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let totalSaved = 0;

  for (const channel of CHANNELS) {
    const { saved } = await harvestChannel(channel.slug, channel.desc);
    totalSaved += saved;
    await sleep(1000);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total saved: ${totalSaved.toLocaleString()} image blocks`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('   Next steps:');
  console.log("   1. Add 'tdr' to SourceName in src/harvester/types.ts");
  console.log('   2. npx tsx src/pipeline/02-transform/02-transform-tdr.ts');
  console.log('   3. npx tsx src/pipeline/03-load/03-load-tdr.ts');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);