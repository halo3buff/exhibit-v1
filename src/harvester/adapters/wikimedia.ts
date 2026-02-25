import { ArchiveItem } from '../types';

export const wikimediaAdapter = (raw: any): ArchiveItem => {
  const meta = raw.imageinfo?.[0]?.extmetadata || {};
  return {
    id: `wiki-${raw.pageid}`,
    title: raw.title?.replace('File:', '') || "Untitled",
    author: meta.Artist?.value?.replace(/<[^>]*>?/gm, '') || "Unknown", // Strip HTML
    year: meta.DateTimeOriginal?.value || "n.d.",
    imageUrl: raw.imageinfo?.[0]?.url || "",
    source: "Wikimedia Commons",
    link: raw.imageinfo?.[0]?.descriptionurl,
    department: "Commons",
    classification: "Media File",
    medium: "Digital",
    culture: "Global",
    _raw: raw
  };
};