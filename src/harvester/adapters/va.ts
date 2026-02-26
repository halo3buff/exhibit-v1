// ─── va.ts ────────────────────────────────────────────────────────────────────
// Victoria and Albert Museum adapter.
//
// V&A categories (from thesaurus IDs in mapping):
//   THES48943 = Posters
//   THES48876 = Graphic Art (printed ephemera, advertisements)
//   THES49308 = Photographs
//   THES48852 = Ceramics
//   THES49006 = Furniture
//   THES48881 = Textiles
//   THES48991 = Fashion and Dress
//   THES48858 = Metalwork
//   THES49232 = Jewellery
//   THES48927 = Prints
//   THES49144 = Drawings
//   THES48960 = Paintings
//
// V&A objectType and categories[] fields carry the classification.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

// Map V&A category names to our SubCategory
const VA_CAT_MAP: Record<string, SubCategory> = {
  'Posters':           'Poster',
  'Graphic Art':       'Advertising',
  'Photographs':       'Photography',
  'Ceramics':          'Ceramics & Glass',
  'Glass':             'Ceramics & Glass',
  'Furniture':         'Furniture',
  'Textiles':          'Textiles & Fashion',
  'Fashion and Dress': 'Textiles & Fashion',
  'Dress':             'Textiles & Fashion',
  'Fashion':           'Textiles & Fashion',
  'Metalwork':         'Metalwork & Jewelry',
  'Jewellery':         'Metalwork & Jewelry',
  'Jewelry':           'Metalwork & Jewelry',
  'Prints':            'Print',
  'Drawings':          'Drawing',
  'Paintings':         'Painting',
};

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  // Try category names first
  for (const cat of (raw.categories || [])) {
    const name = cat.name || '';
    const mapped = VA_CAT_MAP[name];
    if (mapped) return mapped;
    // Partial match
    for (const [key, val] of Object.entries(VA_CAT_MAP)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return val;
    }
  }
  // Fall back to objectType
  const ot = (raw.objectType || '').toLowerCase();
  if (ot.includes('poster'))      return 'Poster';
  if (ot.includes('photograph'))  return 'Photography';
  if (ot.includes('ceramic') || ot.includes('porcelain') || ot.includes('pottery')) return 'Ceramics & Glass';
  if (ot.includes('furniture'))   return 'Furniture';
  if (ot.includes('textile') || ot.includes('fabric') || ot.includes('tapestry')) return 'Textiles & Fashion';
  if (ot.includes('dress') || ot.includes('garment') || ot.includes('fashion')) return 'Textiles & Fashion';
  if (ot.includes('jewel') || ot.includes('metal'))  return 'Metalwork & Jewelry';
  if (ot.includes('print'))       return 'Print';
  if (ot.includes('drawing'))     return 'Drawing';
  if (ot.includes('painting'))    return 'Painting';
  return 'Decorative Arts';
}

export const vaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const author       = raw._primaryMaker?.name || 'Unknown';
  const classification = raw.categories?.[0]?.name || raw.objectType || 'Unknown';
  const imageId      = raw._primaryImageId;
  const imageUrl     = imageId
    ? `https://framemark.vam.ac.uk/collections/${imageId}/full/1200,/0/default.jpg`
    : raw._images?._primary_thumbnail || '';

  return {
    id:             `va-${raw.systemNumber}`,
    title:          raw._primaryTitle || 'Untitled',
    author,
    year:           (raw._primaryDate || '').match(/\b\d{4}\b/)?.[0] || 'n.d.',
    imageUrl,
    source:         'Victoria and Albert Museum',
    link:           `https://collections.vam.ac.uk/item/${raw.systemNumber}/`,
    mainCategory:   mainCategory || 'DECORATIVE_ARTS',
    subCategory:    deriveSubCategory(raw, hint),
    department:     'V&A Museum',
    classification,
    medium:         raw.materialsAndTechniques || 'Unknown',
    culture:        raw._primaryPlace || 'Unknown',
  };
};
