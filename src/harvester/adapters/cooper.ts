// ─── cooper.ts ────────────────────────────────────────────────────────────────
// Cooper Hewitt Smithsonian Design Museum adapter.
// Source: GitHub raw collection dump (https://github.com/cooperhewitt/collection)
//
// Cooper Hewitt type field values (from dump):
//   "Poster" | "Drawing" | "Print" | "Photograph" | "Textile" | "Furniture"
//   "Product" | "Wallcovering" | "Sample" | "Jewelry" | "Ceramic"
// classification values:
//   "Graphic design" | "Product design" | "Interior design"
//   "Drawings, Sketches and Plans" | "Prints"
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const CREATOR_ROLES = new Set([
  'Designer','Artist','Maker','Manufacturer','Engraver','Illustrator',
  'Printmaker','Lithographer','Photographer','Architect'
]);
const SKIP_WORDS = ['fund','gift','donor','bequest','library','association',
                    'purchase','collection','museum'];

function getAuthor(raw: any): string {
  const parts = raw.participants || [];
  for (const p of parts) {
    if (CREATOR_ROLES.has(p.role_name)) return p.person_name;
  }
  for (const p of parts) {
    if (!SKIP_WORDS.some(w => p.person_name?.toLowerCase().includes(w))) return p.person_name;
  }
  return 'Unknown';
}

const TYPE_PREFIXES = [
  'Drawing, ','Print, ','Poster, ','Textile, ','Photograph, ','Painting, ',
  'Sample, ','Album, ','Book, ','Plate, ','Card, ','Label, ','Model, ','Product, ','Jewelry, '
];
function cleanTitle(t: string): string {
  for (const p of TYPE_PREFIXES) if (t.startsWith(p)) return t.slice(p.length);
  return t;
}

const COOPER_TYPE_MAP: Record<string, SubCategory> = {
  'poster':       'Poster',
  'drawing':      'Drawing',
  'print':        'Print',
  'photograph':   'Photography',
  'textile':      'Textiles & Fashion',
  'furniture':    'Furniture',
  'product':      'Decorative Arts',
  'wallcovering': 'Textiles & Fashion',
  'jewelry':      'Metalwork & Jewelry',
  'ceramic':      'Ceramics & Glass',
  'glass':        'Ceramics & Glass',
  'metalwork':    'Metalwork & Jewelry',
  'graphic design':'Graphic Design',
};

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const type = (raw.type || '').toLowerCase();
  const cls  = (raw.classification || '').toLowerCase();
  for (const [key, val] of Object.entries(COOPER_TYPE_MAP)) {
    if (type.includes(key) || cls.includes(key)) return val;
  }
  const med = (raw.medium || '').toLowerCase();
  if (med.includes('lithograph'))   return 'Lithograph';
  if (med.includes('screenprint'))  return 'Screenprint';
  if (med.includes('etching'))      return 'Etching';
  if (med.includes('photograph'))   return 'Photography';
  return 'Graphic Design';
}

export const cooperAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `ch-${raw.id}`,
  title:          cleanTitle(raw.title || 'Untitled'),
  author:         getAuthor(raw),
  year:           raw.date || 'n.d.',
  imageUrl:       raw.images?.[0]?.b?.url || raw.images?.[0]?.z?.url || '',
  source:         'Cooper Hewitt Smithsonian Design Museum',
  link:           `https://collection.cooperhewitt.org/objects/${raw.id}/`,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    deriveSubCategory(raw, hint),
  department:     'Cooper Hewitt',
  classification: raw.type || raw.classification || 'Object',
  medium:         raw.medium || 'Unknown',
  culture:        raw.woe_country_name || 'Unknown',
});
