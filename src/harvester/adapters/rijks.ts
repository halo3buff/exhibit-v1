// ─── rijks.ts ─────────────────────────────────────────────────────────────────
// Rijksmuseum adapter.
//
// Dutch type= values mapped to our SubCategory:
//   affiche    → Poster
//   schilderij → Painting (Oil)
//   aquarel    → Watercolor
//   prent      → Engraving/Print
//   tekening   → Drawing
//   foto       → Photography
//   aardewerk  → Ceramics & Glass
//   meubilair  → Furniture
//   textiel    → Textiles & Fashion
//   zilverwerk → Metalwork & Jewelry
//   goud       → Metalwork & Jewelry
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const RIJKS_TYPE_MAP: Record<string, SubCategory> = {
  affiche:    'Poster',
  schilderij: 'Oil',
  aquarel:    'Watercolor',
  prent:      'Engraving',
  ets:        'Etching',
  houtsnede:  'Woodcut',
  lithografie:'Lithograph',
  zeefdruk:   'Screenprint',
  tekening:   'Drawing',
  foto:       'Photography',
  aardewerk:  'Ceramics & Glass',
  porselein:  'Ceramics & Glass',
  glas:       'Ceramics & Glass',
  meubilair:  'Furniture',
  textiel:    'Textiles & Fashion',
  kant:       'Textiles & Fashion',
  tapijt:     'Textiles & Fashion',
  zilverwerk: 'Metalwork & Jewelry',
  goud:       'Metalwork & Jewelry',
  sieraad:    'Metalwork & Jewelry',
};

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const types = (raw.objectTypes || []).map((t: string) => t.toLowerCase());
  for (const t of types) {
    if (RIJKS_TYPE_MAP[t]) return RIJKS_TYPE_MAP[t];
  }
  // Also check physicalMedium
  const med = (raw.physicalMedium || '').toLowerCase();
  if (med.includes('etching') || med.includes('ets'))          return 'Etching';
  if (med.includes('lithograph') || med.includes('lithografie')) return 'Lithograph';
  if (med.includes('woodcut') || med.includes('houtsnede'))    return 'Woodcut';
  if (med.includes('oil') || med.includes('olieverf'))         return 'Oil';
  if (med.includes('watercolor') || med.includes('waterverf')) return 'Watercolor';
  return 'Print';
}

export const rijksAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `rijks-${raw.objectNumber}`,
  title:          raw.title || 'Untitled',
  author:         raw.principalOrFirstMaker || 'Unknown',
  year:           raw.dating?.presentingDate || 'n.d.',
  imageUrl:       raw.webImage?.url || '',
  source:         'Rijksmuseum',
  link:           raw.links?.web || `https://www.rijksmuseum.nl/en/collection/${raw.objectNumber}`,
  mainCategory:   mainCategory || 'PRINTS_AND_DRAWINGS',
  subCategory:    deriveSubCategory(raw, hint),
  department:     'Rijksmuseum',
  classification: raw.objectTypes?.[0] || 'Unknown',
  medium:         raw.physicalMedium || 'Unknown',
  culture:        raw.productionPlaces?.[0] || 'Dutch',
});
