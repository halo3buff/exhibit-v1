// ─── va.ts ───────────────────────────────────────────────────────────────────
// Fixes from original:
//   1. _primaryMaker__name (double underscore) was WRONG — field is
//      _primaryMaker.name (nested object). This returned undefined for every item.
//   2. _sampleMaterial is not a real V&A field — correct field is materialsAndTechniques
//   3. Classification now uses categories[0].name from the detail call (real taxonomy)
//   4. Image URL uses framemark.vam.ac.uk at 1200px (confirmed from old harvest_va.js)
//
// NOTE: The fetcher does the two-step search+detail fetch and merges both
// records into one object before passing to this adapter. That merged object
// is what raw refers to here.

import { ArchiveItem } from '../types.js';

function upgradeVAImage(raw: any): string {
  // _primaryImageId from search results → framemark IIIF at 1200px
  if (raw._primaryImageId) {
    return `https://framemark.vam.ac.uk/collections/${raw._primaryImageId}/full/1200,/0/default.jpg`;
  }
  // Fallback: upgrade existing thumbnail if present
  const thumb = raw._images?._primary_thumbnail || '';
  if (thumb && thumb.includes('framemark.vam.ac.uk')) {
    return thumb.replace(/\/full\/[^/]+\//, '/full/1200,/');
  }
  return thumb;
}

function extractVAYear(dateStr: string): string {
  if (!dateStr) return 'n.d.';
  const match = dateStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? match[0] : dateStr;
}

export const vaAdapter = (raw: any): ArchiveItem => {
  // _primaryMaker is a nested object — NOT _primaryMaker__name (that was the bug)
  const author =
    raw._primaryMaker?.name ||
    raw._primaryMaker?.maker?.name ||
    'Unknown';

  // Classification: categories[] from detail call → _primaryCategory → objectType
  // categories[0].name is the real V&A taxonomy term (e.g. "Posters", "Drawings")
  const classification =
    raw.categories?.[0]?.name ||
    raw._primaryCategory ||
    raw.objectType ||
    'Unknown';

  return {
    id: `va-${raw.systemNumber}`,
    title: raw._primaryTitle || raw.title || 'Untitled',
    author,
    year: extractVAYear(raw._primaryDate || ''),
    imageUrl: upgradeVAImage(raw),
    source: 'Victoria and Albert Museum',
    link: `https://collections.vam.ac.uk/item/${raw.systemNumber}/`,
    department: raw.collection || 'V&A Museum',
    classification,
    // materialsAndTechniques is the correct field (not _sampleMaterial)
    medium: raw.materialsAndTechniques || raw._sampleMaterial__wmr || 'Unknown',
    culture: raw._primaryPlace || 'Unknown',
    _raw: raw,
  };
};
