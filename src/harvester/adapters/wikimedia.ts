// ─── wikimedia.ts ─────────────────────────────────────────────────────────────
// Wikimedia Commons adapter.
//
// Category queries in mapping:
//   "Propaganda posters" | "Travel posters" | "WPA posters" → Poster
//   "Black and white photographs"                            → Photography
//   "Paintings"                                              → Painting
//   "Etchings" | "Woodcuts" | "Lithographs"                 → specific print type
//   "Ceramics" | "Textile arts"                              → Decorative Arts
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const WIKIMEDIA_CAT_MAP: Record<string, SubCategory> = {
  'Propaganda posters':          'Poster',
  'Travel posters':              'Poster',
  'WPA posters':                 'Poster',
  'Posters':                     'Poster',
  'Black and white photographs': 'Photography',
  'Photographs':                 'Photography',
  'Paintings':                   'Painting',
  'Etchings':                    'Etching',
  'Woodcuts':                    'Woodcut',
  'Lithographs':                 'Lithograph',
  'Engravings':                  'Engraving',
  'Screenprints':                'Screenprint',
  'Ceramics':                    'Ceramics & Glass',
  'Textile arts':                'Textiles & Fashion',
};

export const wikimediaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const meta   = raw.imageinfo?.[0]?.extmetadata || {};
  const ii     = raw.imageinfo?.[0] || {};
  const author = (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Unknown';
  const title  = (raw.title || '')
    .replace(/^File:/i, '')
    .replace(/\.(jpe?g|png|gif|svg|webp)$/i, '')
    .replace(/_/g, ' ')
    .trim() || 'Untitled';
  const rawDate = meta.DateTimeOriginal?.value || meta.DateTime?.value || meta.Date?.value || '';
  const year   = rawDate.match(/\b(1[5-9]\d{2}|20[012]\d)\b/)?.[1] || 'n.d.';
  // Infer sub-category from category or hint
  let subCategory: SubCategory = hint || 'Poster';
  if (!hint) {
    const cats = (raw._categories || []) as string[];
    for (const cat of cats) {
      if (WIKIMEDIA_CAT_MAP[cat]) { subCategory = WIKIMEDIA_CAT_MAP[cat]; break; }
    }
  }

  return {
    id:             `wiki-${raw.pageid}`,
    title,
    author,
    year,
    imageUrl:       ii.thumburl || ii.url || '',
    source:         'Wikimedia Commons',
    link:           ii.descriptionurl || `https://commons.wikimedia.org/?curid=${raw.pageid}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory,
    department:     'Wikimedia Commons',
    classification: hint || 'Unknown',
    medium:         'Print',
    culture:        meta.Country?.value || 'Unknown',
  };
};
