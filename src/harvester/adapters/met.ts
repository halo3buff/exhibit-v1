// ─── met.ts ──────────────────────────────────────────────────────────────────
// Metropolitan Museum of Art API adapter.
//
// The MET API returns rich classification data:
//   raw.objectName      → most specific type: "Poster", "Etching", "Photograph", etc.
//   raw.classification  → broader: "Prints", "Photographs", "Paintings"
//   raw.department      → "Drawings and Prints", "European Paintings", etc.
//   raw.medium          → "Lithograph on paper", "Oil on canvas", etc.
//
// Sub-category derivation from medium:
//   "oil" → Oil | "watercolor" → Watercolor | "etching" → Etching, etc.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const med = (raw.medium || '').toLowerCase();
  const obj = (raw.objectName || '').toLowerCase();
  const cls = (raw.classification || '').toLowerCase();
  if (obj.includes('poster') || obj.includes('advertisement')) return 'Poster';
  if (obj.includes('etching') || med.includes('etching'))       return 'Etching';
  if (obj.includes('woodcut') || med.includes('woodcut'))       return 'Woodcut';
  if (obj.includes('engraving') || med.includes('engraving'))   return 'Engraving';
  if (med.includes('lithograph'))                               return 'Lithograph';
  if (med.includes('screenprint') || med.includes('silkscreen')) return 'Screenprint';
  if (obj.includes('drawing') || cls.includes('drawing'))       return 'Drawing';
  if (obj.includes('photograph') || cls.includes('photograph')) return 'Photography';
  if (med.includes('oil') && med.includes('canvas'))            return 'Oil';
  if (med.includes('watercolor'))                               return 'Watercolor';
  if (med.includes('gouache'))                                  return 'Gouache';
  if (med.includes('tempera'))                                  return 'Tempera';
  if (cls.includes('print'))                                    return 'Print';
  if (cls.includes('photograph'))                               return 'Photography';
  if (cls.includes('painting'))                                 return 'Painting';
  return 'Print';
}

export const metAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `met-${raw.objectID}`,
  title:          raw.title || 'Untitled',
  author:         raw.artistDisplayName || 'Unknown',
  year:           raw.objectDate || 'n.d.',
  imageUrl:       raw.primaryImage || raw.primaryImageSmall || '',
  source:         'The Metropolitan Museum of Art',
  link:           `https://www.metmuseum.org/art/collection/search/${raw.objectID}`,
  mainCategory:   mainCategory || 'PRINTS_AND_DRAWINGS',
  subCategory:    deriveSubCategory(raw, hint),
  department:     raw.department || 'Met',
  classification: raw.objectName || raw.classification || 'Unknown',
  medium:         raw.medium || 'Unknown',
  culture:        raw.culture || raw.artistNationality || 'Unknown',
});
