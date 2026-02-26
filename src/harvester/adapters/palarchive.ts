import { ArchiveItem, MainCategory, SubCategory } from '../types.js';
export const palarchiveAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `pal-${raw.identifier}`,
  title:          raw.title || 'Untitled Archive Item',
  author:         raw.creator || 'Unknown',
  year:           raw.date || 'n.d.',
  imageUrl:       `https://palarchive.org/files/thumbnails/${raw.identifier}.jpg`,
  source:         'Palestinian Museum Digital Archive',
  link:           `https://palarchive.org/index.php/Detail/objects/${raw.identifier}`,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    hint || 'Poster',
  department:     'Social History & Graphics',
  classification: raw.type || 'Document',
  medium:         raw.medium || 'Print',
  culture:        'Palestinian',
  _raw:           raw,
});
