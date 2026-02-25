import { ArchiveItem } from '../types';

export const raveAdapter = ($: any): ArchiveItem => ({
  id: `rave-${$('.flyer-id').text() || Math.random()}`,
  title: $('.flyer-title').text() || "Rave Flyer",
  author: $('.artist-name').text() || "Unknown Designer",
  year: $('.event-date').text().match(/\d{4}/)?.[0] || "90s/00s",
  imageUrl: $('.main-flyer-image').attr('src') || "",
  source: "Rave Preservation Project",
  link: "https://ravepreservationproject.com", 
  department: "Subculture Graphics",
  classification: "Flyer",
  medium: "Print",
  culture: "Techno / Electronic",
  _raw: {} 
});