import { ArchiveItem } from '../types';

export const harvardAdapter = (raw: any): ArchiveItem => ({
  id: `harvard-${raw.id}`,
  title: raw.title,
  author: raw.people?.[0]?.name || "Unknown",
  year: raw.dated || "n.d.",
  imageUrl: raw.primaryimageurl,
  source: "Harvard Art Museums",
  link: raw.url,
  department: raw.department,
  classification: raw.classification,
  medium: raw.medium,
  culture: raw.culture || "Unknown",
  _raw: raw
});