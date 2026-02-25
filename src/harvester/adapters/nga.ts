import { ArchiveItem } from '../types';

export const ngaAdapter = (raw: any): ArchiveItem => ({
  id: `nga-${raw.inventory_number || raw.id}`,
  title: raw.title,
  author: raw.attribution || "Unknown Artist",
  year: raw.display_date || "n.d.",
  imageUrl: raw.image_url || "",
  source: "National Gallery of Art",
  link: `https://www.nga.gov/collection/art-object-page.${raw.id}.html`,
  department: raw.department || "Unknown",
  classification: raw.object_type || "Unknown",
  medium: raw.medium || "Unknown",
  culture: raw.nationality || "Unknown",
  _raw: raw
});