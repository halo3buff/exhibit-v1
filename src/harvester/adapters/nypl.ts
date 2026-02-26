// ─── nypl.ts ──────────────────────────────────────────────────────────────────
// New York Public Library Digital Collections adapter.
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

function deriveSubCategory(raw: any, hint?: SubCategory): SubCategory {
  if (hint) return hint;
  const type = (raw.typeOfResource || '').toLowerCase();
  const phys = ((raw.physicalDescription || [])[0] || '').toLowerCase();
  if (type.includes('still image') && phys.includes('poster')) return 'Poster';
  if (type.includes('photograph') || phys.includes('photograph')) return 'Photography';
  if (phys.includes('print') || phys.includes('engraving')) return 'Print';
  if (phys.includes('drawing')) return 'Drawing';
  return 'Poster';
}

export const nyplAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const imageId = Array.isArray(raw.imageID) ? raw.imageID[0] : raw.imageID;
  const title   = Array.isArray(raw.title) ? raw.title[0] : raw.title || 'Untitled';
  return {
    id:             `nypl-${raw.uuid}`,
    title,
    author:         raw.creator || raw.contributor || 'Unknown',
    year:           raw.dateIssued || raw.date || 'n.d.',
    imageUrl:       imageId ? `https://images.nypl.org/index.php?id=${imageId}&t=w` : '',
    source:         'New York Public Library',
    link:           raw.itemLink || `https://digitalcollections.nypl.org/items/${raw.uuid}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory:    deriveSubCategory(raw, hint),
    department:     'NYPL Digital Collections',
    classification: raw.typeOfResource || 'Print',
    medium:         raw.physicalDescription?.[0] || 'Unknown',
    culture:        raw.geographic?.[0] || 'Unknown',
    _raw:           raw,
  };
};
