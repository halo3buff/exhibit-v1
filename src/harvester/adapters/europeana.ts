// ─── europeana.ts ─────────────────────────────────────────────────────────────
// Europeana API adapter.
//
// Europeana aggregates from European museums. The `query` param in mapping
// determines what category of content is fetched.
//
// edmPreview → decode uri= param to get actual image (not Europeana proxy)
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function directImage(raw: any): string {
  const preview = raw.edmPreview?.[0] || '';
  if (preview.includes('uri=')) {
    try {
      const direct = decodeURIComponent(preview.split('uri=')[1].split('&')[0]);
      if (direct.startsWith('http')) return direct;
    } catch {}
  }
  return raw.edmIsShownBy?.[0] || preview || '';
}

export const europeanaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `europeana-${(raw.id || '').replace(/\//g, '-')}`,
  title:          (Array.isArray(raw.title) ? raw.title[0] : raw.title) || 'Untitled',
  author:         raw.dcCreator?.[0] || 'Unknown',
  year:           raw.year?.[0] || 'n.d.',
  imageUrl:       directImage(raw),
  source:         `Europeana / ${raw.dataProvider?.[0] || 'European Heritage'}`,
  link:           `https://www.europeana.eu/item${raw.id}`,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    hint || 'Poster',
  department:     raw.dataProvider?.[0] || 'European Heritage',
  classification: raw.dcType?.[0] || hint || 'Unknown',
  medium:         raw.dcFormat?.[0] || 'Print',
  culture:        raw.country?.[0] || 'European',
});
