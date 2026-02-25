import { ArchiveItem } from '../types';

export const locAdapter = (raw: any): ArchiveItem => ({
  id: `loc-${raw.id || raw.pk}`,
  title: raw.title || "Untitled",
  author: raw.creators?.[0] || "Unknown",
  year: raw.date || "n.d.",
  // We grab the last URL in the array, which is typically the highest resolution
  imageUrl: raw.image_url?.[raw.image_url.length - 1] || "",
  source: "Library of Congress",
  link: raw.url || `https://www.loc.gov/item/${raw.id}`,
  department: raw.location?.[0] || "Prints & Photographs Division",
  classification: raw.original_format?.[0] || "Unknown",
  medium: raw.medium?.[0] || "Unknown",
  culture: "USA / Global",
  _raw: raw
});