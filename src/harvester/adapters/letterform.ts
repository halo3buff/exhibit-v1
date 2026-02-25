import { ArchiveItem } from '../types';

export const letterformAdapter = (raw: any): ArchiveItem => ({
  id: `lfa-${raw.id}`,
  title: raw.title,
  author: raw.creators?.[0]?.name || "Unknown",
  year: raw.date || "n.d.",
  imageUrl: raw.primary_image_url || "",
  source: "Letterform Archive",
  link: `https://oa.letterformarchive.org/item?workID=${raw.id}`,
  department: "Typography & Design",
  classification: raw.format?.[0] || "Graphic Design",
  medium: raw.materials || "Print",
  culture: raw.countries?.[0] || "Unknown",
  _raw: raw
});