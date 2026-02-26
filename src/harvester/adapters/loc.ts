import { ArchiveItem } from '../types.js';

export const locAdapter = (raw: any): ArchiveItem => {
  const idMatch = (raw.id || '').match(/\/item\/([^/]+)\/?$/);
  const itemId  = idMatch ? idMatch[1] : raw.id;
  const author  = (raw.contributor_names || []).join(', ') || 'Unknown';
  const year    = String(raw.date || '').match(/\b\d{4}\b/)?.[0] || 'n.d.';
  const imageUrl = raw._imageUrl || (raw.image_url || [])[0] || '';

  return {
    id:             `loc-${itemId}`,
    title:          raw.title || 'Untitled',
    author,
    year,
    imageUrl,
    source:         'Library of Congress',
    link:           raw.id || `https://www.loc.gov/item/${itemId}/`,
    department:     'Library of Congress',
    classification: raw.original_format?.[0] || 'Poster',
    medium:         'Print',
    culture:        'American',
  };
};