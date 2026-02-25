// ─── loc.ts ──────────────────────────────────────────────────────────────────
// Fixes from original:
//   1. contributor_names (not creators) — confirmed from old harvest_loc.js
//   2. Image upgrade: _150px → _1024px (confirmed working from old script)
//   3. ID extracted from item URL path

import { ArchiveItem } from '../types.js';

function upgradeLocImage(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  url = url.split('?')[0];
  return url
    .replace(/_150px\.(jpg|jpeg|png|gif)/i, '_1024px.$1')
    .replace(/_75px\.(jpg|jpeg|png|gif)/i,  '_1024px.$1')
    .replace(/_thumb\.(jpg|jpeg|png|gif)/i, '_1024px.$1');
}

function getBestLocImage(raw: any): string {
  const urls: string[] = raw.image_url || [];
  for (const u of urls) {
    const upgraded = upgradeLocImage(u);
    if (upgraded && upgraded.includes('cdn.loc.gov')) return upgraded;
  }
  return '';
}

export const locAdapter = (raw: any): ArchiveItem => {
  // ID lives in the item URL: "/item/2004665241/" → "2004665241"
  const idMatch = (raw.id || '').match(/\/item\/([^/]+)\/?$/);
  const itemId  = idMatch ? idMatch[1] : (raw.pk || Math.random().toString(36).slice(2));

  // LOC uses contributor_names[], not creators[]
  const author = (raw.contributor_names || raw.creators || []).join(', ') || 'Unknown';

  const year = raw.date
    ? String(raw.date).match(/\d{4}/)?.[0] || 'n.d.'
    : 'n.d.';

  return {
    id: `loc-${itemId}`,
    title: raw.title || 'Untitled',
    author,
    year,
    imageUrl: getBestLocImage(raw),
    source: 'Library of Congress',
    link: raw.id || `https://www.loc.gov/item/${itemId}/`,
    department: 'Prints & Photographs Division',
    classification: raw.original_format?.[0] || 'Poster',
    medium: (raw.subject || []).slice(0, 3).join(', ') || 'Unknown',
    culture: 'USA / Global',
    _raw: raw,
  };
};
