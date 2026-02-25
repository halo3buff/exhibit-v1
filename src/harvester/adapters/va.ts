import { ArchiveItem } from '../types';

export const vaAdapter = (raw: any): ArchiveItem => ({
  id: `va-${raw.systemNumber}`,
  title: raw._primaryTitle || "Untitled",
  author: raw._primaryMaker__name || "Unknown Artist",
  year: raw._primaryDate || "n.d.",
  // V&A images use a specific IIIF format. 700 width is usually safe.
  imageUrl: raw._primaryImageId 
    ? `https://framemark.vam.ac.uk/collections/${raw._primaryImageId}/full/700,/0/default.jpg` 
    : "",
  source: "Victoria and Albert Museum",
  link: `https://collections.vam.ac.uk/item/${raw.systemNumber}`,
  department: raw.collection || "Unknown",
  classification: raw.objectType,
  medium: raw._sampleMaterial || "Unknown",
  culture: raw._primaryPlace || "Unknown",
  _raw: raw
});