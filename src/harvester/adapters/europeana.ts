import { ArchiveItem } from '../types';

export const europeanaAdapter = (raw: any): ArchiveItem => ({
  id: `europeana-${raw.id.replace(/\//g, '-')}`,
  title: raw.title?.[0] || "Untitled",
  author: raw.dcCreator?.[0] || "Unknown",
  year: raw.year?.[0] || "n.d.",
  // edmPreview is reliable, edmIsShownBy is higher res but sometimes requires a proxy
  imageUrl: raw.edmPreview?.[0] || raw.edmIsShownBy?.[0] || "",
  source: `Europeana (${raw.dataProvider?.[0] || "EU Archives"})`,
  link: `https://www.europeana.eu/item${raw.id}`,
  department: "European Heritage",
  classification: raw.type || "Unknown",
  medium: raw.dcDescription?.[0] || "Digital Record",
  culture: raw.country?.[0] || "European",
  _raw: raw
});