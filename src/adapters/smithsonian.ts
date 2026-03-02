// src/adapters/smithsonian.ts
import { MainCategory, SubCategory, Source } from '../types/categories.js';
import { ArchiveItem } from '../types/schema.js';
import { AdapterFn, FetchFn } from '../harvester/types.js';

// FIX: correct helper to extract image from SI Open Access API response structure
function getImage(row: any): string {
  try {
    const media = row.content?.descriptiveNonRepeating?.online_media?.media ?? [];
    const img = media.find((m: any) => String(m.type ?? '').toLowerCase() === 'images') ?? media[0];
    return String(img?.content ?? '');
  } catch { return ''; }
}

// FIX: correct helper to read freetext fields
function ft(row: any, field: string): string {
  try {
    const arr = row.content?.freetext?.[field];
    return String(Array.isArray(arr) ? (arr[0]?.content ?? '') : (arr ?? ''));
  } catch { return ''; }
}

export const smithsonianAdapter: AdapterFn = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem | null => {
  try {
    if (!raw?.id) return null;
    // FIX: use correct field paths (not raw._source)
    const imageUrl = getImage(raw);
    if (!imageUrl) return null;

    const dnr = raw.content?.descriptiveNonRepeating ?? {};
    return {
      id:             `smithsonian-${raw.id}`,
      title:          String(raw.title ?? '').trim() || 'Untitled',
      author:         ft(raw, 'name') || 'Unknown',
      year:           ft(raw, 'date') || 'n.d.',
      imageUrl,
      source:         Source.SMITHSONIAN,
      link:           String(dnr.record_link ?? `https://collections.si.edu/search/results.htm?q=record_ID:${raw.id}`),
      department:     ft(raw, 'dataSource') || 'Smithsonian',
      classification: ft(raw, 'objectType') || 'Unknown',
      medium:         ft(raw, 'physicalDescription') || 'Unknown',
      culture:        ft(raw, 'place') || 'Unknown',
      mainCategory:   mainCategory!,
      subCategory:    hint!,
      _raw:           process.env.NODE_ENV === 'development' ? raw : undefined,
    };
  } catch { return null; }
};

export const smithsonianFetch: FetchFn = async (params: Record<string, unknown>, limit: number): Promise<unknown[]> => {
  const apiKey = process.env.SMITHSONIAN_API_KEY;
  if (!apiKey) {
    console.warn('[SMITHSONIAN] SMITHSONIAN_API_KEY not set — get a free key at api.data.gov/signup');
    return [];
  }

  const items: unknown[] = [];
  let start = 0;
  // FIX: correct endpoint + correct param name (api_key not apiKey)
  const baseUrl = 'https://api.si.edu/openaccess/api/v1.0/search';

  while (items.length < limit && start < 1000) {
    const qp = new URLSearchParams();
    qp.set('api_key', apiKey);  // FIX: was 'apiKey'
    qp.set('rows', String(Math.min(100, limit - items.length)));
    qp.set('start', String(start));
    qp.set('online_visual_material', 'true');
    for (const [k, v] of Object.entries(params)) {
      if (v != null) qp.set(k, String(v));
    }

    try {
      const res = await fetch(`${baseUrl}?${qp}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Smithsonian HTTP ${res.status}`);
      const data = await res.json();
      // FIX: correct response path (was data.response?.rows which was right actually)
      const results: any[] = data.response?.rows ?? [];
      if (!results.length) break;
      items.push(...results.filter(r => getImage(r) !== ''));
      start += 100;
      await new Promise(r => setTimeout(r, 300));
    } catch (e: any) {
      console.warn('[SMITHSONIAN] failed:', e.message);
      break;
    }
  }
  return items.slice(0, limit);
};

export default { smithsonianAdapter, smithsonianFetch };
