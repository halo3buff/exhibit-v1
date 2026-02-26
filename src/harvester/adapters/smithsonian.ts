// ─── smithsonian.ts ───────────────────────────────────────────────────────────
// Smithsonian Open Access adapter.
//
// unit_code values used in mapping:
//   CHNDM  = Cooper Hewitt Design Museum
//   SAAM   = Smithsonian American Art Museum
//   NMAAHC = National Museum of African American History
//   NMAH   = National Museum of American History
//   NMAFA  = National Museum of African Art
//   NPG    = National Portrait Gallery
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const content  = raw.content || raw;
  const indexed  = content.indexedStructured || {};
  const objTypes = (indexed.object_type || []).join(' ').toLowerCase();
  if (objTypes.includes('poster') || objTypes.includes('graphic art')) return 'Poster';
  if (objTypes.includes('photograph'))  return 'Photography';
  if (objTypes.includes('painting'))    return 'Painting';
  if (objTypes.includes('print'))       return 'Print';
  if (objTypes.includes('drawing'))     return 'Drawing';
  if (objTypes.includes('textile') || objTypes.includes('fabric')) return 'Textiles & Fashion';
  if (objTypes.includes('ceramic') || objTypes.includes('pottery')) return 'Ceramics & Glass';
  if (objTypes.includes('furniture'))   return 'Furniture';
  if (objTypes.includes('jewel') || objTypes.includes('metal'))     return 'Metalwork & Jewelry';
  return 'Decorative Arts';
}

export const smithsonianAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const content  = raw.content || raw;
  const desData  = content.descriptiveNonRepeating || {};
  const indexed  = content.indexedStructured || {};
  const freetext = content.freetext || {};
  const img      = desData.online_media?.media?.[0]?.content
                || desData.online_media?.media?.[0]?.thumbnail
                || '';
  return {
    id:             `si-${raw.id || desData.record_ID || Math.random().toString(36).substr(2, 9)}`,
    title:          raw.title || desData.title || 'Untitled',
    author:         freetext.name?.[0]?.content || indexed.name?.[0] || 'Unknown',
    year:           freetext.date?.[0]?.content || indexed.date?.[0] || 'n.d.',
    imageUrl:       img,
    source:         desData.data_source || 'Smithsonian Institution',
    link:           desData.record_link || `https://collections.si.edu/search/detail/${raw.id}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory:    deriveSubCategory(raw, hint),
    department:     indexed.unit?.[0] || 'Smithsonian',
    classification: indexed.object_type?.[0] || 'Unknown',
    medium:         freetext.physicalDescription?.[0]?.content || 'Unknown',
    culture:        indexed.culture?.[0] || 'Unknown',
    _raw:           raw,
  };
};
