import { ArchiveItem } from '../types';

export const aifAdapter = (raw: any): ArchiveItem => ({
  id: `aif-${raw.item_id}`,
  title: raw.title || "Untitled Photograph",
  author: raw.photographer || raw.creator || "Unknown",
  year: raw.date?.text || raw.date || "n.d.",
  imageUrl: raw.image?.url || "",
  source: "Arab Image Foundation",
  link: `https://archive.arabimagefoundation.org/items/${raw.item_id}`,
  department: "Photography",
  classification: raw.format || "Photograph",
  medium: raw.physical_description || "Gelatin Silver Print",
  culture: raw.location?.country || "SWANA",
  _raw: raw
});