import { ArchiveItem } from '../types';

export const translatioAdapter = (raw: any): ArchiveItem => ({
  id: `trans-${raw.id}`,
  title: raw.periodical_title,
  author: raw.editor || "Unknown",
  year: raw.publication_year || "n.d.",
  imageUrl: raw.cover_image_url || "",
  source: "Project Translatio",
  link: raw.view_url,
  department: "Arabic Periodicals",
  classification: "Magazine / Journal",
  medium: "Digital Scan",
  culture: "SWANA / Ottoman",
  _raw: raw
});