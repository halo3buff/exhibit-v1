// ─── rave.ts ─────────────────────────────────────────────────────────────────
// Rave/Electronic Music Flyer adapter (via Internet Archive).
// These are subcultural graphic design — classified under GRAPHIC_DESIGN > Graphic Design
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

export const raveAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const title   = (Array.isArray(raw.title) ? raw.title[0] : raw.title || 'Untitled').replace(/\s*[/:]$/, '');
  const year    = String(Array.isArray(raw.date) ? raw.date[0] : raw.date || '').match(/\b(19|20)\d{2}\b/)?.[0] || '1990s';
  const subject = [raw.subject].flat().join(' ').toLowerCase();
  const classification =
    /jungle|drum.*bass|dnb/.test(subject) ? 'Jungle / Drum & Bass' :
    /techno/.test(subject)                ? 'Techno' :
    /house/.test(subject)                 ? 'House Music' :
    /acid/.test(subject)                  ? 'Acid House' :
    /gabber|hardcore/.test(subject)       ? 'Hardcore' :
    /trance/.test(subject)                ? 'Trance' :
                                            'Rave Flyer';
  return {
    id:             `rave-${raw.identifier}`,
    title,
    author:         (Array.isArray(raw.creator) ? raw.creator[0] : raw.creator) || 'Unknown',
    year,
    imageUrl:       `https://archive.org/services/img/${raw.identifier}`,
    source:         'Internet Archive / Rave Preservation',
    link:           `https://archive.org/details/${raw.identifier}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory:    hint || 'Graphic Design',
    department:     'Subculture Graphics',
    classification,
    medium:         'Flyer',
    culture:        'Electronic Music',
  };
};
