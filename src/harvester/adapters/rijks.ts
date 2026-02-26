import { ArchiveItem } from '../types.js';

export const rijksAdapter = (raw: any): ArchiveItem => ({
  id:             `rijks-${raw.objectNumber}`,
  title:          raw.title || 'Untitled',
  author:         raw.principalOrFirstMaker || 'Unknown',
  year:           raw.dating?.presentingDate || 'n.d.',
  imageUrl:       raw.webImage?.url || '',
  source:         'Rijksmuseum',
  link:           raw.links?.web || `https://www.rijksmuseum.nl/en/collection/${raw.objectNumber}`,
  department:     'Rijksmuseum',
  classification: raw.objectTypes?.[0] || 'Unknown',
  medium:         raw.physicalMedium || 'Unknown',
  culture:        raw.productionPlaces?.[0] || 'Dutch',
});