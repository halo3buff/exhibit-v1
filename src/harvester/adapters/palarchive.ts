import { ArchiveItem } from '../types';

export const palarchiveAdapter = (raw: any): ArchiveItem => ({
  id: `pal-${raw.identifier}`,
  title: raw.title || "Untitled Archive Item",
  author: raw.creator || "Unknown",
  year: raw.date || "n.d.",
  // Metadata here often requires a custom URL builder for the assets
  imageUrl: `https://palarchive.org/files/thumbnails/${raw.identifier}.jpg`,
  source: "Palestinian Museum Digital Archive",
  link: `https://palarchive.org/index.php/Detail/objects/${raw.identifier}`,
  department: "Social History & Graphics",
  classification: raw.type || "Document",
  medium: raw.medium || "Print",
  culture: "Palestinian",
  _raw: raw
});