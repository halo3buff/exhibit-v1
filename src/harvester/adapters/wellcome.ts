import { ArchiveItem } from '../types.js';

function cleanMedium(s: string): string {
  if (!s) return 'Unknown';
  // Strip count prefix and dimension notation: "1 print : engraving ; 36.8 x 24 cm" → "engraving"
  return s
    .replace(/^\d+\s+\w+\s*:\s*/i, '')
    .replace(/\s*;\s*[\d.]+\s*x\s*[\d.]+\s*cm.*/i, '')
    .trim() || 'Print';
}

export const wellcomeAdapter = (raw: any): ArchiveItem => ({
  id:             `wellcome-${raw.id}`,
  title:          raw.title || 'Untitled',
  author:         raw.contributors?.[0]?.agent?.label || 'Unknown',
  year:           raw.createdDate?.label || 'n.d.',
  imageUrl:       (raw.thumbnail?.url || '').replace('/full/300,/', '/full/800,/'),
  source:         'Wellcome Collection',
  link:           `https://wellcomecollection.org/works/${raw.id}`,
  department:     'Wellcome Collection',
  classification: raw.workType?.label || 'Picture',
  medium:         cleanMedium(raw.physicalDescription || ''),
  culture:        'Unknown',
});