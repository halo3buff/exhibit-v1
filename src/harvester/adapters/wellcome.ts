// ─── wellcome.ts ──────────────────────────────────────────────────────────────
// Wellcome Collection adapter.
//
// Wellcome has remarkable health/social history posters, documentary photography,
// prints, and drawings. workType=k (Pictures/Visual Works) is the right filter.
//
// workType.label values: "Pictures", "Digital Images", "Moving Image"
// subjects and contributors give context for sub-category.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function cleanMedium(s: string): string {
  if (!s) return 'Unknown';
  return s
    .replace(/^\d+\s+\w+\s*:\s*/i, '')
    .replace(/\s*;\s*[\d.]+\s*x\s*[\d.]+\s*cm.*/i, '')
    .trim() || 'Print';
}

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const phys = (raw.physicalDescription || '').toLowerCase();
  const subj = (raw.subjects || []).map((s: any) => s.label?.toLowerCase() || '').join(' ');
  if (phys.includes('photograph') || subj.includes('photograph')) return 'Documentary';
  if (phys.includes('poster') || subj.includes('poster'))         return 'Poster';
  if (phys.includes('oil') || subj.includes('painting'))          return 'Painting';
  if (phys.includes('etching'))  return 'Etching';
  if (phys.includes('woodcut'))  return 'Woodcut';
  if (phys.includes('engraving'))return 'Engraving';
  if (phys.includes('lithograph'))return 'Lithograph';
  if (phys.includes('drawing'))  return 'Drawing';
  return 'Print';
}

export const wellcomeAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `wellcome-${raw.id}`,
  title:          raw.title || 'Untitled',
  author:         raw.contributors?.[0]?.agent?.label || 'Unknown',
  year:           raw.createdDate?.label || 'n.d.',
  imageUrl:       (raw.thumbnail?.url || '').replace('/full/300,/', '/full/800,/'),
  source:         'Wellcome Collection',
  link:           `https://wellcomecollection.org/works/${raw.id}`,
  mainCategory:   mainCategory || 'PRINTS_AND_DRAWINGS',
  subCategory:    deriveSubCategory(raw, hint),
  department:     'Wellcome Collection',
  classification: raw.workType?.label || 'Picture',
  medium:         cleanMedium(raw.physicalDescription || ''),
  culture:        'Unknown',
});
