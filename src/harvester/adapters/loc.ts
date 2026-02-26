// ─── loc.ts ───────────────────────────────────────────────────────────────────
// Library of Congress adapter.
//
// LOC collection slugs → our sub-categories:
//   posters                          → Poster
//   fsa-owi-color-photographs        → Documentary
//   fsa-owi-black-and-white-negatives→ Documentary
//   ansel-adams-manzanar             → Fine Art Photography
//   gottlieb-collection              → Portraiture
//   fine-prints-american-before-1940 → Print
//   prints-photographs               → Print
//
// original_format[] from LOC often contains: "poster" | "photo" | "print"
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const LOC_COLLECTION_MAP: Record<string, SubCategory> = {
  'posters':                           'Poster',
  'fsa-owi-color-photographs':         'Documentary',
  'fsa-owi-black-and-white-negatives': 'Documentary',
  'ansel-adams-manzanar':              'Fine Art Photography',
  'gottlieb-collection':               'Portraiture',
  'fine-prints-american-before-1940':  'Print',
  'prints-photographs':                'Print',
  'look-magazine':                     'Photojournalism',
  'historic-american-buildings':       'Drawing',
};

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  // Try to infer from collection slug in the item's ID or subject
  const id = raw.id || '';
  for (const [slug, sub] of Object.entries(LOC_COLLECTION_MAP)) {
    if (id.includes(slug)) return sub;
  }
  // original_format
  const fmt = (raw.original_format || []).join(' ').toLowerCase();
  if (fmt.includes('poster'))         return 'Poster';
  if (fmt.includes('photo'))          return 'Photography';
  if (fmt.includes('print'))          return 'Print';
  if (fmt.includes('drawing'))        return 'Drawing';
  return 'Print';
}

export const locAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const idMatch  = (raw.id || '').match(/\/item\/([^/]+)\/?$/);
  const itemId   = idMatch ? idMatch[1] : raw.id;
  const author   = (raw.contributor_names || []).join(', ') || 'Unknown';
  const year     = String(raw.date || '').match(/\b\d{4}\b/)?.[0] || 'n.d.';
  const imageUrl = raw._imageUrl || (raw.image_url || [])[0] || '';

  return {
    id:             `loc-${itemId}`,
    title:          raw.title || 'Untitled',
    author,
    year,
    imageUrl,
    source:         'Library of Congress',
    link:           raw.id || `https://www.loc.gov/item/${itemId}/`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory:    deriveSubCategory(raw, hint),
    department:     'Library of Congress',
    classification: raw.original_format?.[0] || 'Unknown',
    medium:         'Print',
    culture:        'American',
  };
};
