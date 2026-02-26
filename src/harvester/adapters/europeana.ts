import { ArchiveItem } from '../types.js';

function directImage(raw: any): string {
  // edmPreview is a proxy URL: decode the uri= param to get the actual image
  const preview = raw.edmPreview?.[0] || '';
  if (preview.includes('uri=')) {
    try {
      const direct = decodeURIComponent(preview.split('uri=')[1].split('&')[0]);
      if (direct.startsWith('http')) return direct;
    } catch {}
  }
  return raw.edmIsShownBy?.[0] || preview || '';
}

export const europeanaAdapter = (raw: any): ArchiveItem => ({
  id:             `europeana-${(raw.id || '').replace(/\//g, '-')}`,
  title:          (Array.isArray(raw.title) ? raw.title[0] : raw.title) || 'Untitled',
  author:         raw.dcCreator?.[0] || 'Unknown',
  year:           raw.year?.[0] || 'n.d.',
  imageUrl:       directImage(raw),
  source:         `Europeana / ${raw.dataProvider?.[0] || 'European Heritage'}`,
  link:           `https://www.europeana.eu/item${raw.id}`,
  department:     raw.dataProvider?.[0] || 'European Heritage',
  classification: 'Poster',
  medium:         'Print',
  culture:        raw.country?.[0] || 'European',
});