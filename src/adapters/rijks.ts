// src/adapters/rijks.ts
// ═══════════════════════════════════════════════════════════════════════════
// RIJKSMUSEUM ADAPTER
// Native Taxonomy Fields: type, objectType, f.material.term, techniques
// Dutch Terms: affiche (poster), schilderij (painting), fotografie (photography),
//              ets (etching), gravure (engraving), lithografie, houtsnede (woodcut)

import { MainCategory, SubCategory, Source } from '../types/categories.js';
import { ArchiveItem } from '../types/schema.js';
import { AdapterFn, FetchFn } from '../harvester/types.js';

export const RIJKS_TYPE_MAP: Record<string, string> = {
  'affiche': 'Poster',
  'poster': 'Poster',
  'schilderij': 'Painting',
  'fotografie': 'Photography',
  'prent': 'Print',
  'tekening': 'Drawing',
  'meubilair': 'Furniture',
  'keramiek': 'Ceramics',
  'glas': 'Glass',
  'textiel': 'Textile',
  'sieraad': 'Jewelry',
  'metaal': 'Metalwork',
} as const;

export const RIJKS_CLASSIFICATION_FILTERS = {
  graphicDesign: ['affiche', 'poster', 'trade card', 'book jacket', 
                  'magazine cover', 'label', 'logo', 'reclame'],
  painting: ['schilderij', 'paneel', 'doek', 'olieverf'],
  printsDrawings: ['prent', 'ets', 'gravure', 'lithografie', 'houtsnede', 
                   'tekening', 'collage'],
  photography: ['fotografie', 'daguerreotype', 'negatief', 'cyanotype'],
  decorativeArts: ['meubilair', 'keramiek', 'glas', 'textiel', 'sieraad', 
                   'metaal', 'porselein'],
} as const;

export const RIJKS_MATERIAL_FILTERS = {
  graphicDesign: ['papier', 'lithografie', 'zeefdruk'],
  painting: ['olieverf', 'tempera', 'aquarel', 'paneel', 'doek'],
  printsDrawings: ['ets', 'gravure', 'lithografie', 'houtsnede', 
                   'koolstof', 'grafiet', 'inkt'],
  photography: ['gelatinezilver', 'albumine', 'cyanotype', 'daguerreotype'],
  decorativeArts: ['hout', 'keramiek', 'glas', 'metaal', 'textiel', 
                   'porselein', 'zilver'],
} as const;

export const rijksAdapter: AdapterFn = (
  raw: any, 
  mainCategory?: MainCategory, 
  hint?: SubCategory
): ArchiveItem | null => {
  try {
    const objectNumber = raw.objectNumber;
    if (!objectNumber) return null;

    const imageUrl = raw.webImage?.url;
    if (!imageUrl) return null;

    const id = `rijks-${objectNumber}`;
    const title = raw.title?.trim() || raw.longTitle || 'Untitled';
    
    let author = 'Unknown';
    if (Array.isArray(raw.principalMakers) && raw.principalMakers.length > 0) {
      author = raw.principalMakers[0].name || 'Unknown';
    } else if (raw.principalOrFirstMaker) {
      author = raw.principalOrFirstMaker;
    }

    const year = raw.dating?.presentingDate || 'Unknown';
    const culture = raw.history?.[0]?.label || 'Unknown';
    const department = raw.collection || 'Rijksmuseum';
    const classification = raw.type || raw.objectTypes?.[0] || 'Unknown';
    const medium = raw.materials?.[0] || raw.f?.material?.term || 'Unknown';

    return {
      id,
      title,
      author,
      year,
      imageUrl,
      source: Source.RIJKS,
      link: raw.links?.web || `https://www.rijksmuseum.nl/en/collection/${objectNumber}`,
      department,
      classification,
      medium,
      culture,
      mainCategory: mainCategory!,
      subCategory: hint!,
      _raw: process.env.NODE_ENV === 'development' ? raw : undefined,
    };
  } catch {
    return null;
  }
};

export const rijksFetch: FetchFn = async (
  params: Record<string, unknown>, 
  limit: number
): Promise<unknown[]> => {
  const items: any[] = [];
  let page = 1;
  const apiKey = process.env.RIJKS_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ RIJKS_API_KEY not set — Rijksmuseum fetch will fail');
    return [];
  }

  const baseUrl = 'https://www.rijksmuseum.nl/api/en/collection';

  while (items.length < limit && page <= 10) {
    const qp = new URLSearchParams({
      key: apiKey,
      imgonly: 'true',
      ps: String(Math.min(50, limit - items.length)),
      p: String(page),
      ...Object.entries(params).reduce((acc, [k, v]) => {
        if (v != null) acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>),
    });

    const url = `${baseUrl}?${qp.toString()}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      const data = await res.json();
      
      const results = data.artObjects || [];
      if (!results.length) break;

      items.push(...results.filter((r: any) => r.webImage?.url));
      page++;
      await new Promise(r => setTimeout(r, 600));
    } catch {
      break;
    }
  }

  return items.slice(0, limit);
};

export default { rijksAdapter, rijksFetch };