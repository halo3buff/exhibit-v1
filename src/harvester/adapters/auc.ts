import { ArchiveItem } from '../types';

export const aucAdapter = (raw: any): ArchiveItem => ({
  id: `auc-${raw.pointer}`,
  title: raw.title,
  author: raw.creato || "Unknown",
  year: raw.date || "n.d.",
  // CONTENTdm image URL pattern
  imageUrl: `https://digitalcollections.aucegypt.edu/digital/api/singleitem/collection/${raw.collection}/id/${raw.pointer}/thumbnail`,
  source: "AUC Digital Collections",
  link: `https://digitalcollections.aucegypt.edu/digital/collection/${raw.collection}/id/${raw.pointer}`,
  department: "Arabic Print History",
  classification: "Periodical",
  medium: "Paper",
  culture: "Egyptian",
  _raw: raw
});