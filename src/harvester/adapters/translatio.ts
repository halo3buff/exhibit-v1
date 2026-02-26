import { ArchiveItem, MainCategory, SubCategory } from '../types.js';
export const translatioAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `trans-${raw.id}`,
  title:          raw.periodical_title,
  author:         raw.editor || 'Unknown',
  year:           raw.publication_year || 'n.d.',
  imageUrl:       raw.cover_image_url || '',
  source:         'Project Translatio',
  link:           raw.view_url,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    hint || 'Editorial',
  department:     'Arabic Periodicals',
  classification: 'Magazine / Journal',
  medium:         'Digital Scan',
  culture:        'SWANA / Ottoman',
  _raw:           raw,
});
