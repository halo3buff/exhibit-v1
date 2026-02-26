import { ArchiveItem, MainCategory, SubCategory } from '../types.js';
export const adaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `ada-${raw.id || Math.random().toString(36).substr(2, 9)}`,
  title:          raw.title || 'Untitled',
  author:         raw.designer || raw.creator || 'Unknown',
  year:           raw.date || 'n.d.',
  imageUrl:       raw.image_url || '',
  source:         'Arabic Design Archive',
  link:           raw.permalink || 'https://arabicdesignarchive.com/',
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    hint || 'Poster',
  department:     'Arabic Graphic Design',
  classification: raw.genre || raw.type || 'Print',
  medium:         raw.medium || 'Ink on paper',
  culture:        raw.country || 'Arab World',
  _raw:           raw,
});
