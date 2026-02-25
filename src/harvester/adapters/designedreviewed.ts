import { ArchiveItem } from '../types';

export const designReviewedAdapter = ($: any): ArchiveItem => ({
  id: `dr-${$('.post-id').text()}`,
  title: $('h1.entry-title').text().trim(),
  author: $('.designer-link').text() || "Various",
  year: $('.year-tag').text() || "n.d.",
  imageUrl: $('figure img').attr('src') || "",
  source: "Design Reviewed",
  link: "https://designreviewed.com",
  department: "Graphic Design",
  classification: "Modernist Print",
  medium: "Unknown",
  culture: "Global / Modernist",
  _raw: {}
});