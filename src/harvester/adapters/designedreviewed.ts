// ─── designedreviewed.ts ─────────────────────────────────────────────────────
// Design Reviewed (WordPress REST API) adapter.
//
// Entire site is graphic design — Swiss modernism, mid-century, editorial.
// Format taxonomy terms → SubCategory:
//   magazine, book, exhibition catalogue → Editorial
//   type specimen                        → Typography
//   poster, stamp                        → Poster
//   record cover, packaging              → Packaging
//   brochure, calendar                   → Advertising
// ─────────────────────────────────────────────────────────────────────────────
import { ArchiveItem, MainCategory, SubCategory } from '../types.js';

const HOST = 'designreviewed.com';

const FORMAT_SUB_MAP: Record<string, SubCategory> = {
  'magazine':               'Editorial',
  'book':                   'Editorial',
  'brochure':               'Editorial',
  'brochures and guides':   'Editorial',
  'exhibition catalogue':   'Editorial',
  'exhibition catalogues':  'Editorial',
  'newspaper':              'Editorial',
  'type specimen':          'Typography',
  'type specimens':         'Typography',
  'stamp':                  'Poster',
  'stamps':                 'Poster',
  'poster':                 'Poster',
  'record':                 'Packaging',
  'record cover':           'Packaging',
  'packaging':              'Packaging',
  'packaging and labels':   'Packaging',
  'matchbox':               'Advertising',
  'matchbox labels':        'Advertising',
  'calendar':               'Advertising',
};

const NOISE = /members?\s*only|design\s*reviewed|archive|feature|article|news|latest|uncategorized/i;

function stripHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export const designReviewedAdapter = (raw: any, mainCategory?: MainCategory, hint?: SubCategory): ArchiveItem => {
  const allTerms: any[] = (raw._embedded?.['wp:term'] || []).flat();

  const designerTerms = allTerms
    .filter((t: any) => t.taxonomy === 'designer' && t.name && !NOISE.test(t.name))
    .map((t: any) => stripHtml(t.name));
  const author = designerTerms.length > 0
    ? designerTerms.join(', ')
    : (raw.acf?.designer || raw.acf?.author || 'Unknown');

  const titleText = stripHtml(raw.title?.rendered || '');
  const yearMatch = titleText.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  const year      = yearMatch?.[1] || raw.acf?.year || 'n.d.';

  const formatTerms = allTerms
    .filter((t: any) => t.taxonomy === 'format' && t.name);

  let subCategory: SubCategory = hint || 'Editorial';
  let classLabel = 'Graphic Design';
  for (const t of formatTerms) {
    const key = t.name.toLowerCase();
    if (FORMAT_SUB_MAP[key]) {
      subCategory = FORMAT_SUB_MAP[key];
      classLabel  = t.name;
      break;
    }
  }

  const media   = raw._embedded?.['wp:featuredmedia']?.[0];
  let imageUrl  = '';
  if (media?.media_details?.file) {
    imageUrl = `https://${HOST}/wp-content/uploads/${media.media_details.file}`;
  } else {
    const src = media?.media_details?.sizes?.full?.source_url || media?.source_url || '';
    imageUrl  = src
      .replace(/-scaled(\.[a-z]+)$/i, '$1')
      .replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  }

  return {
    id:             `dr-${raw.id}`,
    title:          titleText || 'Untitled',
    author,
    year,
    imageUrl,
    source:         'Design Reviewed',
    link:           raw.link || `https://${HOST}/?p=${raw.id}`,
    mainCategory:   mainCategory || 'GRAPHIC_DESIGN',
    subCategory,
    department:     'Design Reviewed',
    classification: classLabel,
    medium:         classLabel,
    culture:        'Global / Modernist',
    _raw:           raw,
  };
};
