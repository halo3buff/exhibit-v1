import { ArchiveItem } from '../types';

export const gettyAdapter = (raw: any): ArchiveItem => ({
  id: `getty-${raw.id.split('/').pop()}`, // Extracts ID from URI
  title: raw._label || "Untitled",
  author: raw.produced_by?.carried_out_by?.[0]?._label || "Unknown Artist",
  year: raw.produced_by?.timespan?._label || "n.d.",
  imageUrl: raw.representation?.[0]?.id || "",
  source: "J. Paul Getty Museum",
  link: `https://www.getty.edu/art/collection/objects/${raw.id.split('/').pop()}`,
  department: "Art Collection",
  classification: raw.classified_as?.find((c: any) => c._label !== "HumanMadeObject")?._label || "Object",
  medium: raw.made_of?.[0]?._label || "Unknown",
  culture: "Unknown", 
  _raw: raw
});