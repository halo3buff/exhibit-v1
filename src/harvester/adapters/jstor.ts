import { ArchiveItem } from '../types';

export const jstorAdapter = (raw: any): ArchiveItem => ({
  id: `jstor-${raw.id}`,
  title: raw.title || "Untitled",
  author: raw.creator?.[0] || "Unknown",
  year: raw.date || "n.d.",
  // Note: High-res images often require auth, so we pull the largest available thumb
  imageUrl: raw.thumbnail_url?.replace('size1', 'size3') || "", 
  source: "JSTOR / Artstor",
  link: `https://www.jstor.org/stable/${raw.id}`,
  department: raw.collection_name || "Community Collections",
  classification: raw.work_type?.[0] || "Unknown",
  medium: raw.medium?.[0] || "Unknown",
  culture: raw.culture?.[0] || "Unknown",
  _raw: raw
});