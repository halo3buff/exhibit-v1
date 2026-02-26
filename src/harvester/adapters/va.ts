import { ArchiveItem } from '../types.js';

export const vaAdapter = (raw: any): ArchiveItem => {
  const author = raw._primaryMaker?.name || 'Unknown';
  const classification = raw.categories?.[0]?.name || raw.objectType || 'Unknown';
  const imageId = raw._primaryImageId;
  const imageUrl = imageId
    ? `https://framemark.vam.ac.uk/collections/${imageId}/full/1200,/0/default.jpg`
    : raw._images?._primary_thumbnail || '';

  return {
    id:             `va-${raw.systemNumber}`,
    title:          raw._primaryTitle || 'Untitled',
    author,
    year:           (raw._primaryDate || '').match(/\b\d{4}\b/)?.[0] || 'n.d.',
    imageUrl,
    source:         'Victoria and Albert Museum',
    link:           `https://collections.vam.ac.uk/item/${raw.systemNumber}/`,
    department:     'V&A Museum',
    classification,
    medium:         raw.materialsAndTechniques || 'Unknown',
    culture:        raw._primaryPlace || 'Unknown',
  };
};