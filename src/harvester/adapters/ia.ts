// ─── ia.ts ────────────────────────────────────────────────────────────────────
// Internet Archive adapter.
//
// Subject queries in mapping:
//   "posters"          → Poster (GRAPHIC_DESIGN)
//   "rave flyer"       → Graphic Design (subculture)
//   "photographs"      → Photography
//   "lithograph"       → Lithograph (PRINTS_AND_DRAWINGS)
//
// The subject field tells us what sub-category to assign.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function cleanYear(raw: any): string {
  const s = Array.isArray(raw) ? raw[0] : String(raw || '');
  return s.match(/\b(1[5-9]\d{2}|20[012]\d)\b/)?.[1] || 'n.d.';
}

function cleanAuthor(raw: any): string {
  const s = (Array.isArray(raw) ? raw[0] : String(raw || '')).trim();
  if (!s || s.toLowerCase() === 'unknown') return 'Unknown';
  const m = s.match(/^([^,]+),\s+([^,]+),?\s+\d{4}/);
  return m ? `${m[2].trim()} ${m[1].trim()}` : s.replace(/,?\s+\d{4}[-–]?\d{0,4}$/, '').trim();
}

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const subj = [raw.subject].flat().join(' ').toLowerCase();
  if (subj.includes('rave') || subj.includes('flyer')) return 'Graphic Design';
  if (subj.includes('poster'))      return 'Poster';
  if (subj.includes('photograph'))  return 'Photography';
  if (subj.includes('lithograph'))  return 'Lithograph';
  if (subj.includes('etching'))     return 'Etching';
  if (subj.includes('woodcut'))     return 'Woodcut';
  if (subj.includes('drawing'))     return 'Drawing';
  return 'Poster';
}

export const iaAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `ia-${raw.identifier}`,
  title:          (Array.isArray(raw.title) ? raw.title[0] : raw.title || 'Untitled').replace(/\s*[/:]$/, ''),
  author:         cleanAuthor(raw.creator),
  year:           cleanYear(raw.date),
  imageUrl:       `https://archive.org/services/img/${raw.identifier}`,
  source:         'Internet Archive',
  link:           `https://archive.org/details/${raw.identifier}`,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    deriveSubCategory(raw, hint),
  department:     'Internet Archive',
  classification: hint || 'Poster',
  medium:         'Print',
  culture:        'Unknown',
});
