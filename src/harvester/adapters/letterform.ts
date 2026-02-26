import { ArchiveItem } from '../types.js';

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

const REJECT_TAGS = new Set([
  'typespecimen', 'typeephemera', 'boundspecimen',
  'calligraphy', 'penmanship', 'handwriting',
]);

const REJECT_PREFIXES = [
  'lfa_writingmanuals', 'lfa_calligraphy', 'lfa_tholenaar', 'lfa_linotype',
];

function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function cleanTitle(text: string): string {
  // Raw LFA title format: "Emigre Magazine Rudy VanderLans Item date: 1984. Courtesy of..."
  // Strip everything from "Item date:" onwards
  let t = text.split(/\s+Item date:/i)[0].trim();
  // Also strip "Courtesy of..." if it appears standalone
  t = t.split(/\s+Courtesy\s+of/i)[0].trim();
  // Take only the first 200 chars
  return t.slice(0, 200) || 'Untitled';
}

export const letterformAdapter = (raw: any): ArchiveItem | null => {
  const text = stripHtml(raw.content || '');

  const workIDMatch = text.match(/workID=(lfa_[a-zA-Z0-9_]+)/);
  if (!workIDMatch) return null;
  const workID = workIDMatch[1];

  if (REJECT_PREFIXES.some(p => workID.startsWith(p))) return null;

  const tags: string[] = (raw.tags || []).map((t: any) =>
    (t.name || '').toLowerCase().replace(/\s+/g, '')
  );

  if (tags.some(t => REJECT_TAGS.has(t))) return null;

  const imageUrl = raw.media_attachments?.[0]?.url || '';
  if (!imageUrl) return null;

  const title = cleanTitle(text.split(/\s+#/)[0].split('https://')[0].trim());

  const yearMatch = text.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  const year = yearMatch?.[1] || 'n.d.';

  const classification = tags.reduce<string>((acc, tag) => {
    return acc === 'Graphic Design' && TAG_CLASSIFICATION[tag]
      ? TAG_CLASSIFICATION[tag]
      : acc;
  }, 'Graphic Design');

  // Medium: just the meaningful content tags, no "letterformarchive" or "graphicdesign" noise
  const NOISE_TAGS = new Set(['letterformarchive', 'graphicdesign', 'lfa', 'lfaimagebot']);
  const mediumTags = tags
    .filter(t => !REJECT_TAGS.has(t) && !NOISE_TAGS.has(t))
    .map(t => TAG_CLASSIFICATION[t] || t)
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .slice(0, 2);

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
    medium: mediumTags.join(', ') || 'Print',
    culture: 'Unknown',
  };
};