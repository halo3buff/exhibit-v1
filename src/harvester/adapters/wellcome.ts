import { ArchiveItem } from '../types';

export const wellcomeAdapter = (raw: any): ArchiveItem => ({
  id: `wellcome-${raw.id}`,
  title: raw.title,
  author: raw.contributors?.[0]?.agent?.label || "Unknown",
  year: raw.createdDate?.label || "n.d.",
  imageUrl: raw.thumbnail?.url || "",
  source: "Wellcome Collection",
  link: `https://wellcomecollection.org/works/${raw.id}`,
  department: "Visual Culture",
  classification: raw.workType?.label || "Unknown",
  medium: raw.physicalDescription || "Unknown",
  culture: "Unknown",
  _raw: raw
});