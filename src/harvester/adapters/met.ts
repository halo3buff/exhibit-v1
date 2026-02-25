import { ArchiveItem } from '../types';

export const metAdapter = (raw: any): ArchiveItem => ({
  id: `met-${raw.objectID}`,
  title: raw.title || "Untitled",
  author: raw.artistDisplayName || "Unknown Artist",
  year: raw.objectDate || "n.d.",
  imageUrl: raw.primaryImage || raw.primaryImageSmall,
  source: "The Metropolitan Museum of Art",
  link: `https://www.metmuseum.org/art/collection/search/${raw.objectID}`,
  department: raw.department,
  classification: raw.objectName || raw.classification,
  medium: raw.medium,
  culture: raw.culture || "Unknown",
  _raw: raw
});