import { ArchiveItem } from '../types';

export const nyplAdapter = (raw: any): ArchiveItem => ({
  id: `nypl-${raw.uuid}`,
  title: raw.title,
  author: "Unknown / NYPL", 
  year: "n.d.", 
  // t=w parameter provides the wide/large version
  imageUrl: `https://images.nypl.org/index.php?id=${raw.imageID}&t=w`,
  source: "New York Public Library",
  link: raw.itemLink,
  department: "Digital Collections",
  classification: raw.typeOfResource || "Print",
  medium: "Unknown",
  culture: "Unknown",
  _raw: raw
});