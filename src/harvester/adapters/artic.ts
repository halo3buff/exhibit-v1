// src/harvester/adapters/artic.ts
// ⚠️ GOLDEN RULE 1: DUMB FETCHING — SPONGE STRATEGY
//
// ARTIC API filtering reality:
// - query[term][is_public_domain]=true  → WORKS (confirmed by original script)
// - query[term][department_id]=N        → SILENTLY IGNORED on list endpoint
// - department_title param              → SILENTLY IGNORED on list endpoint
//
// The only way to get distinct items across tasks is to use different startPage
// values so each task covers a non-overlapping slice of the result set.

import { fetchWithRetry, sleep } from '../utils/http.js';
import { saveRawItem } from '../utils/fs.js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = 'artic' as const;
const BASE_URL = 'https://api.artic.edu/api/v1/artworks';
const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'artic');
const FIELDS = 'id,title,artist_display,date_display,department_title,department_id,artwork_type_title,classification_title,medium_display,image_id,is_public_domain,place_of_origin';

export async function articFetch(
  params: Record<string, unknown>,
  limit: number,
  startPage: number = 1
): Promise<{ newCount: number; duplicateCount: number }> {
  console.log(`\n📥 ARTIC Fetch: pages ${startPage}–${startPage + Math.ceil(limit / 100) - 1} (limit: ${limit})`);

  let page = startPage;
  const endPage = startPage + Math.ceil(limit / 100) - 1;
  let newCount = 0;
  let duplicateCount = 0;

  while (page <= endPage) {
    let url = `${BASE_URL}?fields=${FIELDS}&limit=100&page=${page}`;

    if (params.is_public_domain) {
      url += `&query[term][is_public_domain]=true`;
    }

    try {
      const data = await fetchWithRetry(url) as { data?: unknown[] } | null;

      if (!data?.data?.length) {
        console.log('→ No more results');
        break;
      }

      for (const item of data.data) {
        const id = (item as Record<string, unknown>).id;
        if (!id) continue;

        const idStr = String(id);
        const filePath = path.join(RAW_DIR, `${idStr}.json`);

        // Stateful disk check — skip already-saved items without HTTP request
        if (fs.existsSync(filePath)) {
          duplicateCount++;
          continue;
        }

        saveRawItem(SOURCE, idStr, item);
        newCount++;
        console.log(`  ✓ Saved raw: artic-${idStr}`);
      }

      page++;
      await sleep(400);
    } catch (e: any) {
      console.warn(`[ARTIC] Error on page ${page}:`, e.message);
      break;
    }
  }

  console.log(`✅ ARTIC Complete: ${newCount} new, ${duplicateCount} duplicates`);
  return { newCount, duplicateCount };
}