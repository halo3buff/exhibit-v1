// ─── artic.ts ─────────────────────────────────────────────────────────────────
// Art Institute of Chicago adapter.
//
// ARTIC fields:
//   artwork_type_title → "Poster", "Photograph", "Painting", "Print and Drawing",
//                        "Drawing and Watercolor on Paper", "Textile", "Decorative Arts"
//   classification_title → more specific e.g. "Photography"
//   medium_display → "Oil on canvas", "Lithograph on paper", etc.
//   department_title → "Photography and Media", "Prints and Drawings",
//                      "Architecture and Design", "Applied Arts of Europe", etc.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const type = (raw.artwork_type_title || '').toLowerCase();
  const med  = (raw.medium_display || '').toLowerCase();
  const dept = (raw.department_title || '').toLowerCase();
  if (type.includes('poster'))      return 'Poster';
  if (type.includes('photograph'))  return 'Photography';
  if (type.includes('painting'))    return 'Painting';
  if (type.includes('textile'))     return 'Textiles & Fashion';
  if (type.includes('decorative'))  return 'Decorative Arts';
  if (type.includes('drawing') || type.includes('watercolor')) return 'Drawing';
  if (type.includes('print'))       return 'Print';
  if (dept.includes('photography')) return 'Fine Art Photography';
  if (dept.includes('textiles'))    return 'Textiles & Fashion';
  if (dept.includes('applied arts') || dept.includes('decorative')) return 'Decorative Arts';
  if (med.includes('oil'))          return 'Oil';
  if (med.includes('watercolor'))   return 'Watercolor';
  if (med.includes('etching'))      return 'Etching';
  if (med.includes('lithograph'))   return 'Lithograph';
  if (med.includes('screenprint'))  return 'Screenprint';
  return 'Print';
}

// Items to reject regardless of what the query returned — these are never graphic design
const GRAPHIC_DESIGN_REJECT_TYPES = new Set([
  'Ceramics', 'Ceramic', 'Sculpture', 'Textile', 'Furniture', 'Vessel',
  'Metalwork', 'Jewelry', 'Glass', 'Arms and Armor', 'Ancient Art',
]);

const GRAPHIC_DESIGN_REJECT_DEPTS = new Set([
  'Arts of the Americas', 'Arts of Asia', 'African Art', 'Ancient Art',
  'Applied Arts of Europe', 'Textiles', 'European Decorative Arts',
]);

export const articAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  // Hard reject non-graphic-design items that slip through bad API filtering
  if (mainCategory === 'GRAPHIC_DESIGN') {
    const type = (raw.artwork_type_title || raw.classification_title || '');
    const dept = (raw.department_title || '');
    if (GRAPHIC_DESIGN_REJECT_TYPES.has(type)) return null as any;
    if (GRAPHIC_DESIGN_REJECT_DEPTS.has(dept)) return null as any;
  }
  return ({
  id:             `artic-${raw.id}`,
  title:          raw.title || 'Untitled',
  author:         (raw.artist_display || 'Unknown').split('\n')[0].trim(),
  year:           raw.date_display || 'n.d.',
  imageUrl:       raw.image_id
    ? `https://www.artic.edu/iiif/2/${raw.image_id}/full/843,/0/default.jpg`
    : '',
  source:         'Art Institute of Chicago',
  link:           `https://www.artic.edu/artworks/${raw.id}`,
  mainCategory:   mainCategory || 'PRINTS_AND_DRAWINGS',
  subCategory:    deriveSubCategory(raw, hint),
  department:     raw.department_title || 'ARTIC',
  classification: raw.artwork_type_title || raw.classification_title || 'Unknown',
  medium:         raw.medium_display || 'Unknown',
  culture:        raw.place_of_origin || 'Unknown',
  });
};
