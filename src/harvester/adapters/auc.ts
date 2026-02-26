import { ArchiveItem, MainCategory, SubCategory } from '../types.js';
export const aucAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => ({
  id:             `auc-${raw.pointer}`,
  title:          raw.title,
  author:         raw.creato || 'Unknown',
  year:           raw.date || 'n.d.',
  imageUrl:       `https://digitalcollections.aucegypt.edu/digital/api/singleitem/collection/${raw.collection}/id/${raw.pointer}/thumbnail`,
  source:         'AUC Digital Collections',
  link:           `https://digitalcollections.aucegypt.edu/digital/collection/${raw.collection}/id/${raw.pointer}`,
  mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
  subCategory:    hint || 'Editorial',
  department:     'Arabic Print History',
  classification: 'Periodical',
  medium:         'Paper',
  culture:        'Egyptian',
  _raw:           raw,
});
