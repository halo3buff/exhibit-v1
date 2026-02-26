import { ArchiveItem } from '../types.js';

function cleanYear(raw: any): string {
  const s = Array.isArray(raw) ? raw[0] : String(raw || '');
  return s.match(/\b(1[5-9]\d{2}|20[012]\d)\b/)?.[1] || 'n.d.';
}

function cleanAuthor(raw: any): string {
  const s = (Array.isArray(raw) ? raw[0] : String(raw || '')).trim();
  if (!s || s.toLowerCase() === 'unknown') return 'Unknown';
  // "Reynolds, Lloyd, 1902-1978" → "Lloyd Reynolds"
  const m = s.match(/^([^,]+),\s+([^,]+),?\s+\d{4}/);
  return m ? `${m[2].trim()} ${m[1].trim()}` : s.replace(/,?\s+\d{4}[-–]?\d{0,4}$/, '').trim();
}

export const iaAdapter = (raw: any): ArchiveItem => ({
  id:             `ia-${raw.identifier}`,
  title:          (Array.isArray(raw.title) ? raw.title[0] : raw.title || 'Untitled').replace(/\s*[/:]\s*$/, ''),
  author:         cleanAuthor(raw.creator),
  year:           cleanYear(raw.date),
  imageUrl:       `https://archive.org/services/img/${raw.identifier}`,
  source:         'Internet Archive',
  link:           `https://archive.org/details/${raw.identifier}`,
  department:     'Internet Archive',
  classification: 'Poster',
  medium:         'Print',
  culture:        'Unknown',
});