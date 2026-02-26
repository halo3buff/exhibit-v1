import { ArchiveItem } from '../types.js';

export const wikimediaAdapter = (raw: any): ArchiveItem => {
  const meta = raw.imageinfo?.[0]?.extmetadata || {};
  const ii   = raw.imageinfo?.[0] || {};
  const author = (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Unknown';
  const title  = (raw.title || '').replace(/^File:/i,'').replace(/\.(jpe?g|png|gif|svg|webp)$/i,'').replace(/_/g,' ').trim() || 'Untitled';
  const rawDate = meta.DateTimeOriginal?.value || meta.DateTime?.value || meta.Date?.value || '';
  const year   = rawDate.match(/\b(1[5-9]\d{2}|20[012]\d)\b/)?.[1] || 'n.d.';

  return {
    id:             `wiki-${raw.pageid}`,
    title,
    author,
    year,
    imageUrl:       ii.thumburl || ii.url || '',
    source:         'Wikimedia Commons',
    link:           ii.descriptionurl || `https://commons.wikimedia.org/?curid=${raw.pageid}`,
    department:     'Wikimedia Commons',
    classification: 'Poster',
    medium:         'Print',
    culture:        meta.Country?.value || 'Unknown',
  };
};