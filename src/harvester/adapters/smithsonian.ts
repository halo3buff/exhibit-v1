// src/harvester/adapters/smithsonian.ts
// ⚠️ GOLDEN RULE 1: DUMB FETCHING — SPONGE STRATEGY
//
// Smithsonian Open Access API filtering reality:
// - unit_code:CHNDM etc    → CONFIRMED WORKING (Lucene field filter)
// - online_visual_material → Filters to items that HAVE images
// - images=true            → Actually RETURNS the image URLs in online_media field
//
// Image URL lives at: data.content.descriptiveNonRepeating.online_media.media[0].content

import { fetchWithRetry, sleep } from '../utils/http.js';
import { saveRawItem } from '../utils/fs.js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = 'smithsonian' as const;
const BASE_URL = 'https://api.si.edu/openaccess/api/v1.0/search';
const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'smithsonian');

/** * Strict check: Only items that actually have images are valid.
 * Validates the deep structure required for rendering the gallery.
 */
function hasValidImage(item: any): boolean {
  try {
    const media = item?.content?.descriptiveNonRepeating?.online_media?.media;
    return Array.isArray(media) && media.length > 0;
  } catch {
    return false;
  }
}

export async function smithsonianFetch(
  params: Record<string, unknown>,
  limit: number,
  startOffset: number = 0
): Promise<{ newCount: number; duplicateCount: number }> {
  const API_KEY = process.env.SMITHSONIAN_API_KEY || '';
  if (!API_KEY) {
    console.warn('[SMITHSONIAN] Warning: SMITHSONIAN_API_KEY not set.');
  }
  console.log(`\n📥 Smithsonian Fetch: ${JSON.stringify(params)} (limit: ${limit}, offset: ${startOffset})`);

  let start = startOffset;
  let newCount = 0;
  let duplicateCount = 0;
  const maxStart = startOffset + limit + 500;

  while (newCount + duplicateCount < limit && start < maxStart && start < 10000) {
    const queryParams = new URLSearchParams();
    queryParams.set('api_key', API_KEY);
    queryParams.set('rows', '100');
    queryParams.set('start', String(start));
    queryParams.set('online_visual_material', 'true');
    queryParams.set('images', 'true');

    if (params.q) queryParams.set('q', String(params.q));

    const url = `${BASE_URL}?${queryParams.toString()}`;

    try {
      const data = await fetchWithRetry(url) as { response?: { rows?: unknown[] } } | null;

      if (!data?.response?.rows?.length) {
        console.log('→ No more results');
        break;
      }

      for (const item of data.response.rows) {
        if (newCount + duplicateCount >= limit) break;
        
        // 1. Ghost Record Filter
        if (!hasValidImage(item)) {
          continue; 
        }

        const id = (item as Record<string, unknown>).id;
        if (!id) continue;

        const idStr = String(id);
        const filePath = path.join(RAW_DIR, `${idStr}.json`);

        // 2. Stateful Check
        if (fs.existsSync(filePath)) {
          duplicateCount++;
          continue;
        }

        saveRawItem(SOURCE, idStr, item);
        newCount++;
        console.log(`  ✓ Saved valid image item: smithsonian-${idStr}`);
      }

      start += 100;
      await sleep(500);
    } catch (e: any) {
      console.warn(`[SMITHSONIAN] Error at start=${start}:`, e.message);
      break;
    }
  }

  console.log(`✅ Smithsonian Complete: ${newCount} new, ${duplicateCount} duplicates`);
  return { newCount, duplicateCount };
}