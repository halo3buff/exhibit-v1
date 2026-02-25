import { ArchiveItem } from '../types';

export const harvardMEAdapter = (raw: any): ArchiveItem => ({
  id: `harvard-me-${raw.id}`,
  title: raw.title,
  author: raw.names?.[0]?.namePart || "Unknown Designer",
  year: raw.originInfo?.dateCreated || "n.d.",
  imageUrl: raw.images?.[0]?.url || "",
  source: "Harvard Library (Middle East Posters)",
  link: `https://id.lib.harvard.edu/curiosity/middle-eastern-posters/${raw.id}`,
  department: "Graphic Design / Posters",
  classification: "Poster",
  medium: raw.physicalDescription?.form || "Lithograph",
  culture: raw.originInfo?.place || "Arabic / SWANA",
  _raw: raw
});