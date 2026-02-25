// ─── designedreviewed.ts ─────────────────────────────────────────────────────
// Full rewrite from original. Original used Cheerio CSS selectors that don't
// exist on the site. Design Reviewed uses WordPress REST API (/wp-json/wp/v2/).
//
// Raw is a WP REST API post object with _embedded (from _embed=true param).
// Author comes from 'designer' taxonomy terms.
// Year comes from the title string (most reliable for DR — e.g. "TM 12, 1972").
// Medium/format comes from 'format' taxonomy terms.
// Image uses media_details.file to avoid CDN letterboxing.
//
// Confirmed from old harvest_ds.js.

import { ArchiveItem } from '../types.js';

const HOST = 'designreviewed.com';

const FORMAT_MAP: Record<string, string> = {
  'magazine':               'Magazine',
  'book':                   'Book',
  'brochure':               'Brochure',
  'brochures and guides':   'Brochure',
  'type specimen':          'Type Specimen',
  'type specimens':         'Type Specimen',
  'stamp':                  'Stamp',
  'stamps':                 'Stamp',
  'record':                 'Record Cover',
  'record cover':           'Record Cover',
  'matchbox':               'Matchbox Label',
  'matchbox labels':        'Matchbox Label',
  'packaging':              'Packaging',
  'packaging and labels':   'Packaging',
  'exhibition catalogue':   'Exhibition Catalogue',
  'exhibition catalogues':  'Exhibition Catalogue',
  'poster':                 'Poster',
  'calendar':               'Calendar',
  'newspaper':              'Newspaper',
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

export const designReviewedAdapter = (raw: any): ArchiveItem => {
  const allTerms: any[] = (raw._embedded?.['wp:term'] || []).flat();

  // Author: 'designer' taxonomy terms (e.g. "Wolfgang Weingart", "Armin Hofmann")
  const designerTerms = allTerms
    .filter((t: any) => t.taxonomy === 'designer' && t.name && !NOISE.test(t.name))
    .map((t: any) => stripHtml(t.name));
  const author = designerTerms.length > 0
    ? designerTerms.join(', ')
    : (raw.acf?.designer || raw.acf?.author || 'Unknown');

  // Year: extract from title string — most reliable for DR
  // e.g. "Typografische Monatsblätter TM 6, 1972" → "1972"
  const titleText = stripHtml(raw.title?.rendered || '');
  const yearMatch = titleText.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  const year = yearMatch?.[1] || raw.acf?.year || 'n.d.';

  // Medium/format: 'format' taxonomy terms
  const formatTerms = allTerms
    .filter((t: any) => t.taxonomy === 'format' && t.name)
    .map((t: any) => FORMAT_MAP[t.name.toLowerCase()] || t.name);
  const medium = formatTerms[0] || 'Graphic Design';

  // Image: media_details.file gives raw upload path (avoids CDN letterboxing).
  // The black border on DR images is baked in — handle with object-contain in gallery.
  const media = raw._embedded?.['wp:featuredmedia']?.[0];
  let imageUrl = '';
  if (media?.media_details?.file) {
    imageUrl = `https://${HOST}/wp-content/uploads/${media.media_details.file}`;
  } else {
    const src =
      media?.media_details?.sizes?.full?.source_url ||
      media?.source_url || '';
    imageUrl = src
      .replace(/-scaled(\.[a-z]+)$/i, '$1')
      .replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  }

  return {
    id: `dr-${raw.id}`,
    title: titleText || 'Untitled',
    author,
    year,
    imageUrl,
    source: 'Design Reviewed',
    link: raw.link || `https://${HOST}/?p=${raw.id}`,
    department: 'Design Reviewed',
    classification: medium,
    medium,
    culture: 'Global / Modernist',
    _raw: raw,
  };
};
