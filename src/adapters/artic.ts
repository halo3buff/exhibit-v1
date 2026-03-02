// src/adapters/artic.ts
// ═══════════════════════════════════════════════════════════════════════════
// ART INSTITUTE OF CHICAGO ADAPTER
// Native Taxonomy Fields: department_title, artwork_type_title, 
//                         classification_title, medium_display
// Classification IDs: PC-1 (Paintings), PC-14 (Prints & Drawings), 
//                     PC-12 (Photography), PC-2 (Architecture & Design)

import { MainCategory, SubCategory, Source } from '../types/categories.js';
import { ArchiveItem } from '../types/schema.js';
import { AdapterFn, FetchFn } from '../harvester/types.js';

export const ARTIC_DEPARTMENT_MAP: Record<string, string> = {
  'Painting and Sculpture of Europe': 'European Paintings',
  'Prints and Drawings': 'Prints & Drawings',
  'Photography and Media': 'Photography',
  'Architecture and Design': 'Design',
  'Applied Arts of Europe': 'Decorative Arts',
  'Modern and Contemporary Art': 'Contemporary',
} as const;

export const ARTIC_CLASSIFICATION_IDS = {
  painting: ['PC-1', 'PC-3', 'PC-7'],
  printsDrawings: ['PC-14'],
  photography: ['PC-12'],
  graphicDesign: ['PC-2', 'PC-15'],
  decorativeArts: ['PC-2', 'PC-15', 'PC-21'],
} as const;

export const ARTIC_ARTWORK_TYPES = {
  graphicDesign: ['Graphic Design', 'Commercial Art', 'Poster', 'Typography', 
                  'Logo', 'Book Cover', 'Magazine Cover'],
  painting: ['Painting', 'Oil Painting', 'Watercolor', 'Tempera'],
  printsDrawings: ['Print', 'Drawing', 'Etching', 'Engraving', 'Lithograph', 
                   'Woodcut', 'Screenprint', 'Collage'],
  photography: ['Photograph', 'Photography', 'Daguerreotype', 'Cyanotype', 'Photogram'],
  decorativeArts: ['Furniture', 'Ceramics', 'Glass', 'Textile', 'Metalwork', 'Jewelry'],
} as const;

export const articAdapter: AdapterFn = (
  raw: any, 
  mainCategory?: MainCategory, 
  hint?: SubCategory
): ArchiveItem | null => {
  try {
    const id = raw.id;
    if (!id) return null;

    const imageId = raw.image_id;
    if (!imageId) return null;

    const imageUrl = `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
    const title = raw.title?.trim() || 'Untitled';
    const author = raw.artist_display || 'Unknown';
    const year = raw.date_display || 'Unknown';
    
    const department = raw.department_title || 'ARTIC';
    const classification = raw.artwork_type_title || raw.classification_title || 'Unknown';
    const medium = raw.medium_display || 'Unknown';
    const culture = raw.place_of_origin || 'Unknown';

    return {
      id: `artic-${id}`,
      title,
      author,
      year,
      imageUrl,
      source: Source.ARTIC,
      link: `https://www.artic.edu/artworks/${id}`,
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

export const articFetch: FetchFn = async (
  params: Record<string, unknown>, 
  limit: number
): Promise<unknown[]> => {
  const items: unknown[] = [];
  let page = 1;
  
  const isSearch = Object.keys(params).some(k => k.startsWith('query['));
  const base = isSearch 
    ? 'https://api.artic.edu/api/v1/artworks/search' 
    : 'https://api.artic.edu/api/v1/artworks';

  while (items.length < limit && page <= 10) {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null) qp.append(k, String(v));
    }
    qp.set('fields', 'id,title,image_id,artist_display,date_display,medium_display,artwork_type_title,classification_title,department_title,place_of_origin');
    qp.set('page', String(page));
    qp.set('limit', String(Math.min(100, limit - items.length)));

    const url = `${base}?${qp.toString()}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      const data = await res.json();
      
      const results = data.data || [];
      if (!results.length) break;

      for (const item of results) {
        if (item.image_id) {
          items.push(item);
        }
      }

      page++;
      await new Promise(r => setTimeout(r, 300));
    } catch {
      break;
    }
  }

  return items.slice(0, limit);
};

export default { articAdapter, articFetch };