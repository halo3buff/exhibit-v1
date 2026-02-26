import { ArchiveItem } from '../types.js';

export const articAdapter = (raw: any): ArchiveItem => ({
  id:             `artic-${raw.id}`,
  title:          raw.title || 'Untitled',
  // artist_display has nationality on a second line: "Pablo Picasso\nSpanish, 1881–1973"
  author:         (raw.artist_display || 'Unknown').split('\n')[0].trim(),
  year:           raw.date_display || 'n.d.',
  imageUrl:       raw.image_id ? `https://www.artic.edu/iiif/2/${raw.image_id}/full/843,/0/default.jpg` : '',
  source:         'Art Institute of Chicago',
  link:           `https://www.artic.edu/artworks/${raw.id}`,
  department:     raw.department_title || 'ARTIC',
  classification: raw.artwork_type_title || raw.classification_title || 'Unknown',
  medium:         raw.medium_display || 'Unknown',
  culture:        raw.place_of_origin || 'Unknown',
});