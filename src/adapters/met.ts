// src/adapters/met.ts
// ═══════════════════════════════════════════════════════════════════════════
// METROPOLITAN MUSEUM OF ART ADAPTER
// Native Taxonomy Fields: department, classification, objectName, medium
// Department IDs: 11 (Drawings & Prints), 21 (Photographs), 
//                 9 (American Decorative Arts), 16 (European Sculpture & Decorative Arts)

import { MainCategory, SubCategory, Source } from '../types/categories.js';
import { ArchiveItem } from '../types/schema.js';
import { AdapterFn, FetchFn } from '../harvester/types.js';

export const MET_DEPARTMENT_MAP: Record<number, string> = {
  9: 'American Decorative Arts',
  11: 'Drawings and Prints',
  16: 'European Sculpture and Decorative Arts',
  19: 'European Paintings',
  21: 'Photographs',
} as const;

export const MET_CLASSIFICATION_FILTERS = {
  graphicDesign: ['Commercial Art', 'Visual Communication', 'Poster', 'Advertisement', 
                  'Book Jacket', 'Magazine Cover', 'Typography', 'Logo'],
  painting: ['Painting', 'Oil Painting', 'Watercolor', 'Tempera', 'Fresco'],
  printsDrawings: ['Print', 'Drawing', 'Etching', 'Engraving', 'Woodcut', 
                   'Lithograph', 'Screenprint', 'Collage'],
  photography: ['Photograph', 'Photography', 'Daguerreotype', 'Negative', 'Cyanotype'],
  decorativeArts: ['Furniture', 'Ceramics', 'Glass', 'Textile', 'Metalwork', 'Jewelry'],
} as const;

export const MET_MEDIUM_FILTERS = {
  graphicDesign: ['Lithograph', 'Offset lithograph', 'Screenprint', 'Letterpress'],
  painting: ['Oil on canvas', 'Oil on panel', 'Watercolor on paper', 'Tempera on panel', 
             'Acrylic on canvas', 'Gouache on paper'],
  printsDrawings: ['Etching', 'Engraving', 'Lithograph', 'Woodcut', 'Screenprint', 
                   'Charcoal on paper', 'Graphite on paper', 'Ink on paper'],
  photography: ['Gelatin silver print', 'Albumen print', 'Cyanotype', 'Daguerreotype', 
                'Chromogenic print', 'Digital C-print'],
  decorativeArts: ['Wood', 'Ceramic', 'Glass', 'Metal', 'Textile', 'Porcelain', 'Silver'],
} as const;

export const metAdapter: AdapterFn = (
  raw: any, 
  mainCategory?: MainCategory, 
  hint?: SubCategory
): ArchiveItem | null => {
  try {
    const objectID = raw.objectID;
    if (!objectID) return null;

    const imageUrl = raw.primaryImage || raw.primaryImageSmall || null;
    if (!imageUrl) return null;

    const id = `met-${objectID}`;
    const title = raw.title?.trim() || 'Untitled';
    
    let author = 'Unknown';
    if (raw.artistDisplayName && raw.artistDisplayName !== '') {
      author = raw.artistDisplayName;
    } else if (raw.artistName && Array.isArray(raw.artistName) && raw.artistName.length > 0) {
      author = raw.artistName.join(', ');
    }

    const year = raw.objectDate || 'n.d.';
    const culture = raw.culture || raw.country || 'Unknown';
    const department = raw.department || 'Unknown';
    const classification = raw.classification || raw.objectName || 'Unknown';
    const medium = raw.medium || 'Unknown';

    return {
      id,
      title,
      author,
      year,
      imageUrl,
      source: Source.MET,
      link: raw.objectURL || `https://www.metmuseum.org/art/collection/search/${objectID}`,
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

export const metFetch: FetchFn = async (
  params: Record<string, unknown>, 
  limit: number
): Promise<unknown[]> => {
  const items: any[] = [];
  let page = 1;
  const baseUrl = 'https://collectionapi.metmuseum.org/public/collection/v1';

  while (items.length < limit && page <= 5) {
    const url = `${baseUrl}/search?${new URLSearchParams({ 
      ...params, 
      page: String(page) 
    })}`;
    
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      const data = await res.json();
      
      const objectIDs = data.objectIDs || [];
      if (!objectIDs.length) break;

      // Fetch object details in batches
      for (const objectID of objectIDs.slice(0, 20)) {
        try {
          const objRes = await fetch(
            `${baseUrl}/objects/${objectID}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (objRes.ok) {
            const obj = await objRes.json();
            if (obj.primaryImage || obj.primaryImageSmall) {
              items.push(obj);
            }
          }
        } catch {
          continue;
        }
      }

      page++;
      await new Promise(r => setTimeout(r, 500)); // Rate limiting
    } catch {
      break;
    }
  }

  return items.slice(0, limit);
};

export default { metAdapter, metFetch };