// ─── letterform.ts ────────────────────────────────────────────────────────────
// Letterform Archive (Mastodon / typo.social) adapter.
//
// The entire LFA account is graphic design — posters, books, type specimens,
// magazines, ephemera, identity, packaging. Tag-based sub-classification.
//
// Tag → SubCategory mapping:
//   poster, print     → Poster
//   book, pamphlet    → Editorial
//   magazine, zine    → Editorial
//   typespecimen      → Typography
//   collateral, label → Advertising
//   packaging         → Packaging
//   brochure          → Editorial
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const TAG_SUB_MAP: Record<string, SubCategory> = {
  'poster':          'Poster',
  'print':           'Poster',
  'originalartwork': 'Poster',
  'book':            'Editorial',
  'booklet':         'Editorial',
  'pamphlet':        'Editorial',
  'looseleaf':       'Editorial',
  'periodical':      'Editorial',
  'magazine':        'Editorial',
  'zine':            'Editorial',
  'journal':         'Editorial',
  'brochure':        'Editorial',
  'typespecimen':    'Typography',
  'typeephemera':    'Typography',
  'collateral':      'Advertising',
  'announcement':    'Advertising',
  'ephemera':        'Advertising',
  'tradecard':       'Advertising',
  'calendar':        'Advertising',
  'luggagelabel':    'Advertising',
  'matchbook':       'Advertising',
  'sticker':         'Advertising',
  'leaflet':         'Advertising',
  'packaging':       'Packaging',
  'record':          'Packaging',
  'ukiyoe':          'Print',
};

const REJECT_PREFIXES = [
  'lfa_writingmanuals', 'lfa_calligraphy', 'lfa_tholenaar', 'lfa_linotype',
];
const REJECT_TAGS = new Set([
  'calligraphy', 'penmanship', 'handwriting', 'boundspecimen',
]);

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function cleanTitle(text: string): string {
  let t = text.split(/\s+Item date:/i)[0].trim();
  t = t.split(/\s+Courtesy\s+of/i)[0].trim();
  return t.slice(0, 200) || 'Untitled';
}

export const letterformAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem | null => {
  const text       = stripHtml(raw.content || '');
  const workIDMatch = text.match(/workID=(lfa_[a-zA-Z0-9_]+)/);
  if (!workIDMatch) return null;
  const workID     = workIDMatch[1];
  if (REJECT_PREFIXES.some(p => workID.startsWith(p))) return null;

  const tags: string[] = (raw.tags || []).map((t: any) =>
    (t.name || '').toLowerCase().replace(/\s+/g, '')
  );
  if (tags.some(t => REJECT_TAGS.has(t))) return null;

  const imageUrl = raw.media_attachments?.[0]?.url || '';
  if (!imageUrl) return null;

  const title     = cleanTitle(text.split(/\s+#/)[0].split('https://')[0].trim());
  const yearMatch = text.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  const year      = yearMatch?.[1] || 'n.d.';

  // Derive sub-category from tags
  let subCategory: SubCategory = hint || 'Graphic Design';
  for (const tag of tags) {
    if (TAG_SUB_MAP[tag]) { subCategory = TAG_SUB_MAP[tag]; break; }
  }

  const NOISE_TAGS = new Set(['letterformarchive', 'graphicdesign', 'lfa', 'lfaimagebot']);
  const mediumTags = tags
    .filter(t => !REJECT_TAGS.has(t) && !NOISE_TAGS.has(t))
    .slice(0, 2);

  return {
    id:             `lfa-${workID}`,
    title,
    author:         'Letterform Archive',
    year,
    imageUrl,
    source:         'Letterform Archive',
    link:           `https://oa.letterformarchive.org/item?workID=${workID}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory,
    department:     'Letterform Archive',
    classification: subCategory,
    medium:         mediumTags.join(', ') || 'Print',
    culture:        'Unknown',
  };
};
