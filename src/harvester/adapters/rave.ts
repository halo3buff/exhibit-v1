// ─── rave.ts ─────────────────────────────────────────────────────────────────
// Full rewrite from original. Original used Cheerio selectors for CSS classes
// that don't exist on the Rave Preservation Project site.
//
// Rave flyers are primarily sourced from Internet Archive collections — this is
// where the real archive lives. The fetcher routes 'rave' through fetchIA()
// pointing at the rave-flyers collection, so raw here is an IA Solr document
// (same shape as ia.ts).
//
// Sub-classification is derived from collection/subject text for richer taxonomy.

import { ArchiveItem } from '../types.js';

export const raveAdapter = (raw: any): ArchiveItem => {
  const title = (Array.isArray(raw.title) ? raw.title[0] : raw.title) || 'Untitled';
  const creator = (Array.isArray(raw.creator) ? raw.creator[0] : raw.creator) || 'Unknown Designer';

  const dateRaw = Array.isArray(raw.date) ? raw.date[0] : raw.date;
  const yearMatch = String(dateRaw || '').match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : '1990s';

  // Sub-classify by collection/subject tags for richer categorisation
  const subject    = (Array.isArray(raw.subject)    ? raw.subject.join(' ')    : raw.subject    || '').toLowerCase();
  const collection = (Array.isArray(raw.collection) ? raw.collection.join(' ') : raw.collection || '').toLowerCase();
  const ctx = subject + ' ' + collection;

  const classification =
    /jungle|drum.*bass|dnb/.test(ctx)   ? 'Jungle / Drum & Bass Flyer' :
    /techno/.test(ctx)                  ? 'Techno Flyer'                :
    /house/.test(ctx)                   ? 'House Music Flyer'           :
    /acid/.test(ctx)                    ? 'Acid House Flyer'            :
    /gabber|hardcore/.test(ctx)         ? 'Hardcore Flyer'              :
    /trance/.test(ctx)                  ? 'Trance Flyer'                :
    /ambient/.test(ctx)                 ? 'Ambient / Chillout Flyer'    :
                                          'Rave Flyer';

  return {
    id: `rave-${raw.identifier}`,
    title,
    author: creator,
    year,
    imageUrl: `https://archive.org/services/img/${raw.identifier}`,
    source: 'Internet Archive / Rave Preservation',
    link: `https://archive.org/details/${raw.identifier}`,
    department: 'Subculture Graphics',
    classification,
    medium: 'Print / Flyer',
    culture: 'Electronic Music Subculture',
    _raw: raw,
  };
};
