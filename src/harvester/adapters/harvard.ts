// ─── harvard.ts ───────────────────────────────────────────────────────────────
// Harvard Art Museums adapter.
//
// Harvard fields:
//   classification → "Prints" | "Photographs" | "Paintings" | "Drawings"
//                    "Posters" | "Textiles" | "Ceramics and Glass"
//                    "Metalwork and Jewelry" | "Furniture"
//   worktype       → "Poster" | "Photograph" | "Painting" | "Print" | "Drawing"
//   technique      → "Etching" | "Lithography" | "Photography" etc.
//   medium         → "Lithograph" | "Oil on canvas" etc.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const HARVARD_CLASS_MAP: Record<string, SubCategory> = {
  'Prints':                   'Print',
  'Photographs':              'Photography',
  'Paintings':                'Painting',
  'Drawings':                 'Drawing',
  'Posters':                  'Poster',
  'Textiles':                 'Textiles & Fashion',
  'Textiles and Fashion Arts':'Textiles & Fashion',
  'Ceramics and Glass':       'Ceramics & Glass',
  'Metalwork and Jewelry':    'Metalwork & Jewelry',
  'Furniture':                'Furniture',
};

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const cls = raw.classification || '';
  if (HARVARD_CLASS_MAP[cls]) return HARVARD_CLASS_MAP[cls];
  // worktype
  const wt = (raw.worktype || '').toLowerCase();
  if (wt.includes('poster'))     return 'Poster';
  if (wt.includes('photograph')) return 'Photography';
  if (wt.includes('painting'))   return 'Painting';
  if (wt.includes('print'))      return 'Print';
  if (wt.includes('drawing'))    return 'Drawing';
  // medium
  const med = (raw.medium || '').toLowerCase();
  if (med.includes('oil'))       return 'Oil';
  if (med.includes('watercolor'))return 'Watercolor';
  if (med.includes('etching'))   return 'Etching';
  if (med.includes('lithograph'))return 'Lithograph';
  if (med.includes('woodcut'))   return 'Woodcut';
  if (med.includes('engraving')) return 'Engraving';
  return 'Print';
}

export const harvardAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `harvard-${raw.id}`,
  title:          raw.title || 'Untitled',
  author:         raw.people?.find((p: any) => p.role === 'Artist')?.name
                  || raw.people?.[0]?.name
                  || 'Unknown',
  year:           raw.dated || 'n.d.',
  imageUrl:       raw.primaryimageurl || '',
  source:         'Harvard Art Museums',
  link:           raw.url || '',
  mainCategory:   mainCategory || 'PRINTS_AND_DRAWINGS',
  subCategory:    deriveSubCategory(raw, hint),
  department:     raw.division || raw.department || 'Harvard',
  classification: raw.classification || raw.worktype || 'Unknown',
  medium:         raw.medium || 'Unknown',
  culture:        raw.culture || 'Unknown',
});
