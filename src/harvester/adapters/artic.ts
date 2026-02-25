import { ArchiveItem } from '../types';

export const articAdapter = (raw: any): ArchiveItem => ({
  id: `artic-${raw.id}`,
  title: raw.title,
  author: raw.artist_display || "Unknown Artist",
  year: raw.date_display || "n.d.",
  // Chicago uses IIIF: we request a width of 843px for high quality
  imageUrl: raw.image_id 
    ? `https://www.artic.edu/iiif/2/${raw.image_id}/full/843,/0/default.jpg` 
    : "",
  source: "Art Institute of Chicago",
  link: `https://www.artic.edu/artworks/${raw.id}`,
  department: raw.department_title,
  classification: raw.classification_title,
  medium: raw.medium_display,
  culture: raw.place_of_origin,
  _raw: raw
});