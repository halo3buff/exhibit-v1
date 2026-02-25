import { ArchiveItem } from '../types';

export const rijksAdapter = (raw: any): ArchiveItem => ({
  id: `rijks-${raw.objectNumber}`,
  title: raw.title,
  author: raw.principalOrFirstMaker || "Unknown Artist",
  year: raw.dating?.presentingDate || "n.d.",
  imageUrl: raw.webImage?.url || "",
  source: "Rijksmuseum",
  link: raw.links?.web,
  department: "Fine Art",
  classification: raw.objectTypes?.[0] || "Unknown",
  medium: raw.physicalMedium || "Unknown",
  culture: raw.productionPlaces?.[0] || "Netherlands",
  _raw: raw
});