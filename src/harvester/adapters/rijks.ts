// src/harvester/adapters/rijks.ts
// ⚠️ GOLDEN RULE 1: DUMB FETCHING — SPONGE STRATEGY
//
// Rijksmuseum API v3 — NO API KEY NEEDED
//
// Two-step process:
// Step 1 — Search: GET https://data.rijksmuseum.nl/search/collection?type=painting
// Returns orderedItems: [{ id: "https://id.rijksmuseum.nl/200100988" }, ...]
// Paginate via response.next.id
//
// Step 2 — Resolve: GET https://data.rijksmuseum.nl/{numericId}
// ⚠️ Must use data.rijksmuseum.nl NOT id.rijksmuseum.nl
// id.rijksmuseum.nl = RWO identifier (physical object) → 400
// data.rijksmuseum.nl = MDO identifier (metadata) → 200 JSON-LD
//
// Stores _harvestType alongside raw data so the classifier can use it
// without having to re-derive it from Linked Art vocabulary IDs.

import { sleep } from '../utils/http.js';
import { saveRawItem } from '../utils/fs.js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = 'rijks' as const;
const SEARCH_BASE = 'https://data.rijksmuseum.nl/search/collection';
const RESOLVER_BASE = 'https://data.rijksmuseum.nl';
const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'rijks');

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, application/ld+json',
        'User-Agent': 'ArtHarvester/2.0 (Educational Project)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 429) {
      const wait = parseInt(res.headers.get('retry-after') || '60') * 1000;
      console.log(`\n⏸ Rate limited — waiting ${wait / 1000}s`);
      await sleep(wait);
      return fetchJson(url);
    }
    if (!res.ok) {
      console.warn(`[RIJKS] HTTP ${res.status}: ${url.slice(0, 80)}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      console.warn(`[RIJKS] Timeout: ${url.slice(0, 80)}`);
    } else {
      console.warn(`[RIJKS] Fetch error: ${e.message}`);
    }
    return null;
  }
}

export async function rijksFetch(
  params: Record<string, unknown>,
  limit: number,
): Promise<{ newCount: number; duplicateCount: number }> {
  console.log(`\n📥 Rijks Fetch: ${JSON.stringify(params)} (limit: ${limit})`);

  // Store the harvest type so the classifier can use it without re-deriving it
  const harvestType = String(params.type || '');

  let newCount = 0;
  let duplicateCount = 0;

  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) qp.set(k, String(v));
  }

  let nextUrl: string | null = `${SEARCH_BASE}?${qp.toString()}`;

  while (nextUrl && newCount + duplicateCount < limit) {
    const searchData = await fetchJson(nextUrl) as any;
    if (!searchData) break;

    const items: Array<{ id: string }> = searchData.orderedItems || [];
    nextUrl = searchData.next?.id ?? null;

    for (const item of items) {
      if (newCount + duplicateCount >= limit) break;

      // Extract numeric ID from: "https://id.rijksmuseum.nl/200100988" → "200100988"
      const numericId = item.id.split('/').pop();
      if (!numericId) continue;

      const filePath = path.join(RAW_DIR, `${numericId}.json`);
      if (fs.existsSync(filePath)) {
        duplicateCount++;
        continue;
      }

      // Resolve via data.rijksmuseum.nl plain — returns JSON-LD automatically
      // DO NOT add ?_profile=la — that returns n-triples, not JSON
      const resolveUrl = `${RESOLVER_BASE}/${numericId}`;
      const resolved = await fetchJson(resolveUrl) as Record<string, any> | null;

      if (!resolved) {
        await sleep(200);
        continue;
      }

      // CRITICAL: Store _harvestType in the raw data for classifier
      resolved._harvestType = harvestType;
      resolved._source = SOURCE;
      resolved._fetchedAt = new Date().toISOString();

      saveRawItem(SOURCE, numericId, resolved);
      newCount++;

      if (newCount % 50 === 0) {
        console.log(`  ✓ Saved ${newCount} items...`);
      }

      await sleep(300);
    }

    await sleep(500);
  }

  console.log(`✅ Rijks Complete: ${newCount} new, ${duplicateCount} duplicates`);
  return { newCount, duplicateCount };
}