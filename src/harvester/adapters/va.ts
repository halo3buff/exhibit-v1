// src/harvester/adapters/va.ts
// ⚠️ GOLDEN RULE 1: DUMB FETCHING — SPONGE STRATEGY
//
// V&A API reality (confirmed from working original scriptz/harvest_va.js):
// - q=drawing, q=print, q=photograph etc  → CONFIRMED WORKING
// - id_category=THES48437 etc             → RETURNS 0 RESULTS (these IDs do nothing)
// - images_exist=true                     → CONFIRMED WORKING (string "true")
// - page + page_size                      → CONFIRMED WORKING for pagination

import { sleep } from '../utils/http.js';
import { saveRawItem } from '../utils/fs.js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = 'va' as const;
const BASE_URL = 'https://api.vam.ac.uk/v2/objects/search';
const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'va');

export async function vaFetch(
  params: Record<string, unknown>,
  limit: number,
): Promise<{ newCount: number; duplicateCount: number }> {
  console.log(`\n📥 V&A Fetch: ${JSON.stringify(params)} (limit: ${limit})`);

  let page = 1;
  let newCount = 0;
  let duplicateCount = 0;

  while (newCount + duplicateCount < limit && page <= 100) {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(page));
    queryParams.set('page_size', '100');

    // Pass ALL params through generically
    for (const [k, v] of Object.entries(params)) {
      if (v != null) queryParams.set(k, String(v));
    }

    const url = `${BASE_URL}?${queryParams.toString()}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        headers: { 'User-Agent': 'ArtHarvester/2.0', 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[V&A] HTTP ${res.status}`);
        break;
      }

      const data = await res.json() as { records?: unknown[] };

      if (!data?.records?.length) {
        console.log('→ No more results');
        break;
      }

      for (const item of data.records) {
        if (newCount + duplicateCount >= limit) break;
        const systemNumber = (item as Record<string, unknown>).systemNumber;
        if (!systemNumber) continue;

        const idStr = String(systemNumber);
        const filePath = path.join(RAW_DIR, `${idStr}.json`);

        if (fs.existsSync(filePath)) {
          duplicateCount++;
          continue;
        }

        saveRawItem(SOURCE, idStr, item);
        newCount++;
        console.log(`  ✓ Saved raw: va-${idStr}`);
      }

      page++;
      await sleep(500);
    } catch (e: any) {
      console.warn(`[V&A] Error on page ${page}:`, e.message);
      break;
    }
  }

  console.log(`✅ V&A Complete: ${newCount} new, ${duplicateCount} duplicates`);
  return { newCount, duplicateCount };
}