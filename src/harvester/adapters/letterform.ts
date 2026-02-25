// ─── letterform.ts ───────────────────────────────────────────────────────────
// Full rewrite from original. Original mapped raw.primary_image_url,
// raw.creators[0].name etc. — none of these fields exist on a Mastodon status.
//
// Raw is a Mastodon status object from typo.social API:
//   /api/v1/accounts/{ACCOUNT_ID}/statuses
//
// The LFA bot posts each item as a status with:
//   - content: HTML text containing workID=(lfa_xxx) and #hashtags
//   - media_attachments: array of image objects
//   - tags: array of { name, url } tag objects
//
// Returns null for rejected posts (type specimens, calligraphy, no image).
// The engine filters out nulls after mapping.
//
// Confirmed from old harvest_letterform.js + lfa_diag.js.

import { ArchiveItem } from '../types.js';

// Tag → classification mapping (confirmed from live diagnostic)
const TAG_CLASSIFICATION: Record<string, string> = {
  'poster':          'Poster',
  'print':           'Print',
  'originalartwork': 'Original Artwork',
  'collateral':      'Advertising',
  'brochure':        'Brochure',
  'leaflet':         'Ephemera',
  'announcement':    'Ephemera',
  'ephemera':        'Ephemera',
  'tradecard':       'Ephemera',
  'calendar':        'Ephemera',
  'luggagelabel':    'Ephemera',
  'matchbook':       'Ephemera',
  'sticker':         'Ephemera',
  'book':            'Book',
  'periodical':      'Magazine',
  'magazine':        'Magazine',
  'zine':            'Magazine',
  'journal':         'Magazine',
  'booklet':         'Book',
  'pamphlet':        'Book',
  'looseleaf':       'Book',
  'ukiyoe':          'Print',
};

// Tags that indicate pure type craft — not visual graphic design artefacts
const REJECT_TAGS = new Set([
  'typespecimen', 'typeephemera', 'boundspecimen',
  'calligraphy', 'penmanship', 'handwriting',
]);

// WorkID prefixes that are 100% type/calligraphy collections
const REJECT_PREFIXES = [
  'lfa_writingmanuals',
  'lfa_calligraphy',
  'lfa_tholenaar',  // Jan Tholenaar — pure type specimens
  'lfa_linotype',   // Linotype master drawings — technical
];

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

export const letterformAdapter = (raw: any): ArchiveItem | null => {
  const text = stripHtml(raw.content || '');

  // workID is the canonical LFA identifier embedded in the post text
  const workIDMatch = text.match(/workID=(lfa_[a-zA-Z0-9_]+)/);
  if (!workIDMatch) return null;
  const workID = workIDMatch[1];

  // Reject by collection prefix
  if (REJECT_PREFIXES.some(p => workID.startsWith(p))) return null;

  // Tags: normalise from Mastodon tags array
  const tags: string[] = (raw.tags || []).map((t: any) =>
    (t.name || '').toLowerCase().replace(/\s+/g, '')
  );

  // Reject posts dominated by type-craft tags
  if (tags.some(t => REJECT_TAGS.has(t))) return null;

  // Must have an image
  const imageUrl = raw.media_attachments?.[0]?.url || '';
  if (!imageUrl) return null;

  // Title: text before first hashtag or URL
  const titleRaw = text.split(/\s+#/)[0].split('https://')[0].trim();
  const title = titleRaw.slice(0, 200) || 'Untitled';

  // Year: first 4-digit year found in text
  const yearMatch = text.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  const year = yearMatch?.[1] || 'n.d.';

  // Classification: first tag that maps to a known type
  const classification = tags.reduce<string>((acc, tag) => {
    return acc === 'Graphic Design' && TAG_CLASSIFICATION[tag]
      ? TAG_CLASSIFICATION[tag]
      : acc;
  }, 'Graphic Design');

  return {
    id: `lfa-${workID}`,
    title,
    author: 'Letterform Archive',
    year,
    imageUrl,
    source: 'Letterform Archive',
    link: `https://oa.letterformarchive.org/item?workID=${workID}`,
    department: 'Letterform Archive',
    classification,
    medium: tags.filter(t => !REJECT_TAGS.has(t)).slice(0, 3).join(', ') || 'Print',
    culture: 'Unknown',
    _raw: raw,
  };
};
