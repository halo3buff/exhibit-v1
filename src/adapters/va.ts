// src/adapters/va.ts
import { MainCategory, SubCategory, Source } from '../types/categories.js';
import { ArchiveItem } from '../types/schema.js';
import { AdapterFn, FetchFn } from '../harvester/types.js';

// V&A IIIF thumbnails are tiny (!100,100). Upgrade to !1280,1280 for full res.
function upgradeSize(url: string): string {
  return url.replace(/\/full\/![\d,]+\//, '/full/!1280,1280/');
}

export const vaAdapter: AdapterFn = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem | null => {
  try {
    const systemNumber = raw.systemNumber;
    if (!systemNumber) return null;

    const images = raw._images;
    let imageUrl = '';
    if (images?.iiif_url) {
      imageUrl = `${images.iiif_url}/full/!1280,1280/0/default.jpg`;
    } else if (images?._primary_thumbnail) {
      imageUrl = upgradeSize(images._primary_thumbnail);
    }
    if (!imageUrl) return null;

    const maker = raw._primaryMaker;
    const yearMatch = String(raw._primaryDate ?? '').match(/\b\d{4}\b/);

    return {
      id:             `va-${systemNumber}`,
      title:          String(raw._primaryTitle ?? '').trim() || 'Untitled',
      author:         String(maker?.name ?? 'Unknown'),
      year:           yearMatch ? yearMatch[0] : 'n.d.',
      imageUrl,
      source:         Source.VA,
      link:           `https://collections.vam.ac.uk/item/${systemNumber}/`,
      department:     'V&A Museum',
      classification: String(raw.objectType ?? raw._primaryCategory ?? 'Unknown'),
      medium:         String(raw.materialsAndTechniques ?? 'Unknown'),
      culture:        String(raw._primaryPlace ?? 'Unknown'),
      mainCategory:   mainCategory!,
      subCategory:    hint!,
      _raw:           process.env.NODE_ENV === 'development' ? raw : undefined,
    };
  } catch { return null; }
};

export const vaFetch: FetchFn = async (params: Record<string, unknown>, limit: number): Promise<unknown[]> => {
  const items: unknown[] = [];
  let page = 1;
  const baseUrl = 'https://api.vam.ac.uk/v2/objects/search';

  while (items.length < limit && page <= 10) {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null) qp.set(k, String(v));
    }
    qp.set('page', String(page));
    qp.set('page_size', String(Math.min(100, limit - items.length)));

    try {
      const res = await fetch(`${baseUrl}?${qp}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`V&A HTTP ${res.status}`);
      const data = await res.json();
      const results: any[] = data.records ?? [];
      if (!results.length) break;
      items.push(...results.filter((r: any) => r._images?._primary_thumbnail || r._images?.iiif_url));
      page++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e: any) {
      console.warn('[VA] failed:', e.message);
      break;
    }
  }
  return items.slice(0, limit);
};

export default { vaAdapter, vaFetch };
