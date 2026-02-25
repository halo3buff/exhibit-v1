import { ArchiveItem } from '../types';

export const iaAdapter = (raw: any): ArchiveItem => ({
  id: `ia-${raw.identifier}`,
  title: raw.title || "Untitled",
  author: raw.creator || "Unknown",
  year: raw.date || "n.d.",
  // IA provides a reliable thumbnail/service for every item
  imageUrl: `https://archive.org/services/img/${raw.identifier}`,
  source: "Internet Archive",
  link: `https://archive.org/details/${raw.identifier}`,
  department: raw.collection?.[0] || "Archive",
  classification: raw.mediatype || "Unknown",
  medium: "Unknown",
  culture: raw.language || "Global",
  _raw: raw
});