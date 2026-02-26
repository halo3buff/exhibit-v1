// ─── getty.ts ─────────────────────────────────────────────────────────────────
// J. Paul Getty Museum adapter (Linked Art JSON).
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function unwrapLabel(label: any): string {
  if (!label) return '';
  if (typeof label === 'string') return label;
  if (typeof label === 'object') {
    const en = label.en || label.EN || Object.values(label)[0];
    if (Array.isArray(en)) return en[0] || '';
    return String(en || '');
  }
  return '';
}

function buildGettyImageUrl(raw: any): string {
  const rep = raw.representation?.[0];
  if (!rep) return '';
  const repId = rep.id || rep['@id'] || '';
  if (/\.(jpg|jpeg|png)/i.test(repId)) return repId;
  const serviceId = rep.service?.[0]?.id || rep.service?.[0]?.['@id'] || '';
  if (serviceId) return `${serviceId}/full/!800,800/0/default.jpg`;
  return repId;
}

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const SKIP = new Set(['Type of Work', 'HumanMadeObject', 'VisualItem', '']);
  const classifications = (raw.classified_as || [])
    .map((c: any) => unwrapLabel(c._label))
    .filter((l: string) => l && !SKIP.has(l));
  const cls = (classifications[0] || '').toLowerCase();
  if (cls.includes('poster'))      return 'Poster';
  if (cls.includes('photograph'))  return 'Photography';
  if (cls.includes('painting'))    return 'Painting';
  if (cls.includes('watercolor'))  return 'Watercolor';
  if (cls.includes('drawing'))     return 'Drawing';
  if (cls.includes('etching'))     return 'Etching';
  if (cls.includes('lithograph'))  return 'Lithograph';
  if (cls.includes('print'))       return 'Print';
  return 'Print';
}

export const gettyAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const objectId = (raw.id || raw['@id'] || '').split('/').pop() || '';
  const SKIP = new Set(['Type of Work', 'HumanMadeObject', 'VisualItem', '']);
  const classifications = (raw.classified_as || [])
    .map((c: any) => unwrapLabel(c._label))
    .filter((l: string) => l && !SKIP.has(l));
  const medium = (raw.made_of || [])
    .map((m: any) => unwrapLabel(m._label))
    .filter(Boolean)
    .join(', ') || 'Unknown';

  return {
    id:             `getty-${objectId}`,
    title:          unwrapLabel(raw._label) || 'Untitled',
    author:         unwrapLabel(raw.produced_by?.carried_out_by?.[0]?._label) || 'Unknown Artist',
    year:           unwrapLabel(raw.produced_by?.timespan?._label) || 'n.d.',
    imageUrl:       buildGettyImageUrl(raw),
    source:         'J. Paul Getty Museum',
    link:           `https://www.getty.edu/art/collection/object/${objectId}`,
    mainCategory:   mainCategory || 'PAINTING',
    subCategory:    deriveSubCategory(raw, hint),
    department:     'Getty Museum',
    classification: classifications[0] || 'Unknown',
    medium,
    culture:        'Unknown',
    _raw:           raw,
  };
};
