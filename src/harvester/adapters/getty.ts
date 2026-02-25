// ─── getty.ts ────────────────────────────────────────────────────────────────
// Fixes from original:
//   1. _label can be a string OR a Linked Art language map {en: [...]}
//   2. representation[0].id is NOT the image URL — Getty images are IIIF services
//      Must use representation[0].service[0].id + IIIF path suffix
//   3. produced_by._label also needs the language map unwrap
//   4. classified_as needs filtering to skip generic type labels
//
// Raw is a full Linked Art JSON object fetched by the fetcher's enrichment step.

import { ArchiveItem } from '../types.js';

// Unwrap a Linked Art _label which can be a string or {en: ['value']}
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

  // Direct image URL (jpg/png)
  if (/\.(jpg|jpeg|png)/i.test(repId)) return repId;

  // IIIF image service — append standard size suffix
  const serviceId =
    rep.service?.[0]?.id ||
    rep.service?.[0]?.['@id'] ||
    '';
  if (serviceId) return `${serviceId}/full/!800,800/0/default.jpg`;

  return repId;
}

export const gettyAdapter = (raw: any): ArchiveItem => {
  // ID is a URI like "https://data.getty.edu/museum/collection/object/12345"
  const objectId = (raw.id || raw['@id'] || '').split('/').pop() || '';

  const title = unwrapLabel(raw._label) || 'Untitled';

  const author =
    unwrapLabel(raw.produced_by?.carried_out_by?.[0]?._label) ||
    'Unknown Artist';

  const year =
    unwrapLabel(raw.produced_by?.timespan?._label) ||
    'n.d.';

  // Classification: skip generic Linked Art type labels
  const SKIP = new Set(['Type of Work', 'HumanMadeObject', 'VisualItem', '']);
  const classifications = (raw.classified_as || [])
    .map((c: any) => unwrapLabel(c._label))
    .filter((l: string) => l && !SKIP.has(l));

  const medium = (raw.made_of || [])
    .map((m: any) => unwrapLabel(m._label))
    .filter(Boolean)
    .join(', ') || 'Unknown';

  return {
    id: `getty-${objectId}`,
    title,
    author,
    year,
    imageUrl: buildGettyImageUrl(raw),
    source: 'J. Paul Getty Museum',
    link: `https://www.getty.edu/art/collection/object/${objectId}`,
    department: 'Getty Museum',
    classification: classifications[0] || 'Unknown',
    medium,
    culture: 'Unknown',
    _raw: raw,
  };
};
