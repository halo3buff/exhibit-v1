import { ArchiveItem } from '../types';

export const cooperAdapter = (raw: any): ArchiveItem => {
  const img = raw.images?.[0]?.b?.url || raw.images?.[0]?.z?.url;
  
  return {
    id: `ch-${raw.id}`,
    title: raw.title || "Untitled",
    author: raw.participants?.[0]?.person_name || "Unknown",
    year: raw.date || "n.d.",
    imageUrl: img || "",
    source: "Cooper Hewitt Smithsonian Design Museum",
    link: `https://collection.cooperhewitt.org/objects/${raw.id}/`,
    department: raw.department || "Design",
    classification: raw.type || raw.classification || "Object",
    medium: raw.medium || "Unknown",
    culture: raw.country || "Unknown",
    _raw: raw
  };
};