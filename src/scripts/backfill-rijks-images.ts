// src/scripts/backfill-rijks-images.ts
// ─────────────────────────────────────────────────────────────────────────────
// Scrapes the og:image meta tag from each Rijksmuseum collection page.
// Images are served from iiif.micr.io — a live IIIF server.
//
// The og:image comes back as:
//   https://iiif.micr.io/{shortId}/full/^1024,538/0/default.webp
// We upgrade to full resolution:
//   https://iiif.micr.io/{shortId}/full/max/0/default.jpg
//
// Run:  npx tsx src/scripts/backfill-rijks-images.ts
// Then: npx tsx src/scripts/02-transform.ts
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'rijks');

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function extractInventoryNumber(d: any): string {
  for (const entry of (d?.identified_by ?? [])) {
    if (entry.type !== 'Identifier') continue;
    if ((entry.classified_as ?? []).some((c: any) => String(c.id ?? '').includes('300312355'))) {
      if (entry.content) return String(entry.content);
    }
  }
  return '';
}

async function fetchOgImage(inventoryNumber: string): Promise<string | null> {
  const url = `https://www.rijksmuseum.nl/en/collection/${encodeURIComponent(inventoryNumber)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Match og:image in either attribute order
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!match) return null;

    // Upgrade from social preview size to full resolution
    // https://iiif.micr.io/{id}/full/^1024,538/0/default.webp
    // →  https://iiif.micr.io/{id}/full/max/0/default.jpg
    return match[1].replace(/\/full\/[^/]+\/0\/default\.\w+$/, '/full/max/0/default.jpg');
  } catch {
    return null;
  }
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`No directory: ${RAW_DIR}`); process.exit(1);
  }

  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
  console.log(`\nFound ${files.length} raw Rijks files`);
  console.log(`Scraping og:image from collection pages (iiif.micr.io)\n`);

  let hasRepresentation = 0;
  let alreadyPatched    = 0;
  let patched           = 0;
  let noInventory       = 0;
  let noImage           = 0;
  let errors            = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(RAW_DIR, files[i]);
    let rawItem: any;
    try {
      rawItem = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { errors++; continue; }

    const d = rawItem.data;

    if (d.representation?.length) { hasRepresentation++; continue; }
    if (d._webImageUrl) { alreadyPatched++; continue; }

    const inventory = extractInventoryNumber(d);
    if (!inventory) { noInventory++; continue; }

    const imageUrl = await fetchOgImage(inventory);

    if (!imageUrl) {
      noImage++;
    } else {
      d._webImageUrl = imageUrl;
      fs.writeFileSync(filePath, JSON.stringify(rawItem, null, 2), 'utf8');
      patched++;
    }

    if ((i + 1) % 100 === 0) {
      const pct = ((i + 1) / files.length * 100).toFixed(0);
      console.log(`  ${i + 1}/${files.length} (${pct}%) — patched: ${patched}, no-image: ${noImage}, skipped: ${hasRepresentation + alreadyPatched}`);
    }

    await sleep(300); // be polite — 3 req/sec
  }

  const total = patched + hasRepresentation + alreadyPatched;
  console.log(`\n✅ Backfill complete`);
  console.log(`   Has representation[]:  ${hasRepresentation}`);
  console.log(`   Already patched:       ${alreadyPatched}`);
  console.log(`   Patched this run:      ${patched}`);
  console.log(`   No inventory number:   ${noInventory}`);
  console.log(`   No image found:        ${noImage}`);
  console.log(`   Errors:                ${errors}`);
  console.log(`\n   Total with image: ${total} / ${files.length}`);
  console.log(`\nNext: npx tsx src/scripts/02-transform.ts`);
}

main().catch(console.error);