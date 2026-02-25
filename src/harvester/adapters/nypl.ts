// ─── nypl.ts ─────────────────────────────────────────────────────────────────
// Fixes from original:
//   1. imageID is an array in NYPL API v2 — must use imageID[0]
//   2. title can also be an array — must use title[0]
//   3. dateIssued is the correct year field (not date)

import { ArchiveItem } from '../types.js';

export const nyplAdapter = (raw: any): ArchiveItem => {
  // imageID is an array in NYPL API v2
  const imageId = Array.isArray(raw.imageID) ? raw.imageID[0] : raw.imageID;
  // title can also be an array
  const title = Array.isArray(raw.title) ? raw.title[0] : raw.title || 'Untitled';

  return {
    id: `nypl-${raw.uuid}`,
    title,
    author: raw.creator || raw.contributor || 'Unknown',
    year: raw.dateIssued || raw.date || 'n.d.',
    imageUrl: imageId ? `https://images.nypl.org/index.php?id=${imageId}&t=w` : '',
    source: 'New York Public Library',
    link: raw.itemLink || `https://digitalcollections.nypl.org/items/${raw.uuid}`,
    department: 'NYPL Digital Collections',
    classification: raw.typeOfResource || 'Print',
    medium: raw.physicalDescription?.[0] || 'Unknown',
    culture: raw.geographic?.[0] || 'Unknown',
    _raw: raw,
  };
};
