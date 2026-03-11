// src/scripts/debug-rijks-image.ts
// Run: npx tsx src/scripts/debug-rijks-image.ts

import * as fs from 'fs';
import * as path from 'path';

const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'rijks');

function extractInventoryNumber(d: any): string {
  for (const entry of (d?.identified_by ?? [])) {
    if (entry.type !== 'Identifier') continue;
    if ((entry.classified_as ?? []).some((c: any) => String(c.id ?? '').includes('300312355'))) {
      if (entry.content) return String(entry.content);
    }
  }
  return '';
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) { console.log(`  HTTP ${res.status}`); return null; }
    return await res.text();
  } catch (e: any) {
    console.log(`  Error: ${e.message}`); return null;
  }
}

function findImages(html: string): void {
  // og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) console.log(`  og:image → ${og[1]}`);

  // twitter:image
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) console.log(`  twitter:image → ${tw[1]}`);

  // Any lh3 URLs
  const lh3 = [...html.matchAll(/https:\/\/lh3\.[^\s"'<>]+/g)].map(m => m[0]).slice(0, 3);
  lh3.forEach(u => console.log(`  lh3 URL → ${u}`));

  // Any cdn/image URLs with common image extensions
  const cdnUrls = [...html.matchAll(/https?:\/\/[^\s"'<>]+(\.jpg|\.jpeg|\.png|=s\d+)[^\s"'<>]*/gi)]
    .map(m => m[0]).slice(0, 5);
  cdnUrls.forEach(u => console.log(`  img URL → ${u}`));

  // JSON-LD
  const jsonld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonld) {
    try {
      const data = JSON.parse(jsonld[1]);
      const img = data.image || data.thumbnail || data.contentUrl;
      if (img) console.log(`  JSON-LD image → ${img}`);
    } catch {}
  }

  if (!og && !tw && lh3.length === 0 && cdnUrls.length === 0) {
    console.log(`  ⚠️  No image found in HTML`);
    // Show a chunk of html to understand the structure
    const chunk = html.slice(0, 500);
    console.log(`  HTML preview: ${chunk.replace(/\s+/g, ' ')}`);
  }
}

async function main() {
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json')).slice(0, 5);

  for (const file of files) {
    const rawItem = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
    const inv = extractInventoryNumber(rawItem.data);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Inventory: ${inv}`);

    if (!inv) { console.log('  No inventory number'); continue; }

    const url = `https://www.rijksmuseum.nl/en/collection/${encodeURIComponent(inv)}`;
    console.log(`Fetching: ${url}`);
    const html = await fetchHtml(url);
    if (html) findImages(html);
  }
}

main().catch(console.error);