// src/harvester/adapters/met.ts
// ⚠️ GOLDEN RULE 1: DUMB FETCHING — SPONGE STRATEGY

import { fetchWithRetry, sleep } from '../utils/http.js';
import { saveRawItem } from '../utils/fs.js';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = 'met' as const;
const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'met');

export async function metFetch(
  params: Record<string, unknown>,
  limit: number,
  existingIds?: Set<string>
): Promise<{ newCount: number; duplicateCount: number }> {
  console.log(`\n📥 MET Fetch: ${JSON.stringify(params)} (limit: ${limit})`);
  
  const searchParams = new URLSearchParams();
  if (params.departmentId)   searchParams.set('departmentId', String(params.departmentId));
  if (params.hasImages)      searchParams.set('hasImages', 'true');
  if (params.isPublicDomain) searchParams.set('isPublicDomain', 'true');
  searchParams.set('q', params.q ? String(params.q) : '*');

  const searchUrl = `${BASE_URL}/search?${searchParams.toString()}`;
  
  try {
    const searchData = await fetchWithRetry(searchUrl) as { objectIDs?: number[] } | null;
    
    if (!searchData?.objectIDs?.length) {
      console.log('⚠ No results found');
      return { newCount: 0, duplicateCount: 0 };
    }
    
    console.log(`→ Found ${searchData.objectIDs.length} object IDs`);

    const idsToFetch = searchData.objectIDs
      .sort(() => 0.5 - Math.random())
      .slice(0, limit);

    let newCount = 0;
    let duplicateCount = 0;

    for (const id of idsToFetch) {
      const idStr = `met-${id}`;

      // ── STATEFUL CHECK ─────────────────────────────────────────────────────
      // If the file already exists on disk, skip it — no HTTP request needed.
      // This means if the script crashes at item 800 and restarts, it resumes
      // from where it left off instead of starting over from zero.
      const filePath = path.join(RAW_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        duplicateCount++;
        existingIds?.add(idStr);
        continue;
      }
      // ───────────────────────────────────────────────────────────────────────

      if (existingIds?.has(idStr)) {
        duplicateCount++;
        continue;
      }

      const objectUrl = `${BASE_URL}/objects/${id}`;
      const objectData = await fetchWithRetry(objectUrl);

      if (objectData) {
        saveRawItem(SOURCE, id, objectData);
        existingIds?.add(idStr);
        newCount++;
        console.log(`  ✓ Saved raw: ${idStr}`);
      } else {
        console.log(`  ⊘ Failed to fetch: ${idStr}`);
      }

      await sleep(750);
    }

    console.log(`✅ MET Complete: ${newCount} new, ${duplicateCount} duplicates`);
    return { newCount, duplicateCount };
    
  } catch (e: any) {
    console.warn('[MET] Error:', e.message);
    return { newCount: 0, duplicateCount: 0 };
  }
}