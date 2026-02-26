import { ArchiveItem } from '../types.js';

export const metAdapter = (raw: any): ArchiveItem => ({
  id:             `met-${raw.objectID}`,
  title:          raw.title || 'Untitled',
  author:         raw.artistDisplayName || 'Unknown',
  year:           raw.objectDate || 'n.d.',
  imageUrl:       raw.primaryImage || raw.primaryImageSmall || '',
  source:         'The Metropolitan Museum of Art',
  link:           `https://www.metmuseum.org/art/collection/search/${raw.objectID}`,
  department:     raw.department || 'Met',
  classification: raw.objectName || raw.classification || 'Unknown',
  medium:         raw.medium || 'Unknown',
  culture:        raw.culture || raw.artistNationality || 'Unknown',
});