// ─── nga.ts ──────────────────────────────────────────────────────────────────
// Fixes from original:
//   1. display_date → displaydate  (NGA API uses camelCase, not snake_case)
//   2. object_type → objecttype    (same issue)
//   3. inventory_number → objectid (NGA's primary ID field)
//   4. image_url does not exist — NGA images come from their media CDN
//      The API does return primaryImage in some endpoints; fall back gracefully.
//   5. nationality is on artist records, not object records — use school instead

import { ArchiveItem } from '../types.js';

function buildNGAImageUrl(raw: any): string {
  // Some NGA API endpoints return primaryImage directly
  if (raw.primaryImage) return raw.primaryImage;
  if (raw.imageURL)     return raw.imageURL;
  if (raw.thumbnail)    return raw.thumbnail;
  // NGA IIIF pattern — requires knowing the filename, which we often don't have
  // without a separate media call, so we return empty and let the engine filter it
  return '';
}

export const ngaAdapter = (raw: any): ArchiveItem => ({
  id: `nga-${raw.objectid || raw.id}`,
  title: raw.title || 'Untitled',
  author: raw.attribution || raw.artist || 'Unknown Artist',
  // NGA uses displaydate not display_date
  year: raw.displaydate || raw.beginYear?.toString() || 'n.d.',
  imageUrl: buildNGAImageUrl(raw),
  source: 'National Gallery of Art',
  link: `https://www.nga.gov/collection/art-object-page.${raw.objectid || raw.id}.html`,
  department: raw.department || raw.classification || 'Unknown',
  // NGA uses classification not object_type
  classification: raw.classification || raw.objecttype || 'Unknown',
  medium: raw.medium || 'Unknown',
  // nationality is on artist records; school is on object records
  culture: raw.nationality || raw.school || 'Unknown',
  _raw: raw,
});
