// ─── nga.ts ───────────────────────────────────────────────────────────────────
// National Gallery of Art adapter.
//
// NGA classification values (confirmed):
//   "Painting" | "Photograph" | "Print" | "Drawing" | "Decorative Arts"
//   "Ceramic" | "Glass" | "Textile" | "Furniture" | "Jewelry"
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const NGA_CLASS_MAP: Record<string, SubCategory> = {
  'Painting':        'Painting',
  'Photograph':      'Photography',
  'Print':           'Print',
  'Drawing':         'Drawing',
  'Decorative Arts': 'Decorative Arts',
  'Ceramic':         'Ceramics & Glass',
  'Glass':           'Ceramics & Glass',
  'Textile':         'Textiles & Fashion',
  'Furniture':       'Furniture',
  'Jewelry':         'Metalwork & Jewelry',
};

function buildNGAImageUrl(raw: any): string {
  if (raw.primaryImage) return raw.primaryImage;
  if (raw.imageURL)     return raw.imageURL;
  if (raw.thumbnail)    return raw.thumbnail;
  return '';
}

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const cls = raw.classification || raw.objecttype || '';
  if (NGA_CLASS_MAP[cls]) return NGA_CLASS_MAP[cls];
  const med = (raw.medium || '').toLowerCase();
  if (med.includes('oil'))         return 'Oil';
  if (med.includes('watercolor'))  return 'Watercolor';
  if (med.includes('etching'))     return 'Etching';
  if (med.includes('lithograph'))  return 'Lithograph';
  if (med.includes('woodcut'))     return 'Woodcut';
  if (med.includes('engraving'))   return 'Engraving';
  if (med.includes('photograph'))  return 'Photography';
  return 'Print';
}

export const ngaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `nga-${raw.objectid || raw.id}`,
  title:          raw.title || 'Untitled',
  author:         raw.attribution || raw.artist || 'Unknown Artist',
  year:           raw.displaydate || raw.beginYear?.toString() || 'n.d.',
  imageUrl:       buildNGAImageUrl(raw),
  source:         'National Gallery of Art',
  link:           `https://www.nga.gov/collection/art-object-page.${raw.objectid || raw.id}.html`,
  mainCategory:   mainCategory || 'PAINTING',
  subCategory:    deriveSubCategory(raw, hint),
  department:     raw.department || raw.classification || 'Unknown',
  classification: raw.classification || raw.objecttype || 'Unknown',
  medium:         raw.medium || 'Unknown',
  culture:        raw.nationality || raw.school || 'Unknown',
  _raw:           raw,
});
