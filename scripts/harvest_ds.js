/**
 * HARVEST: Design Reviewed (designreviewed.com) — FINAL
 *
 * Data extracted from actual WP REST API taxonomy fields:
 *   - author  → "designer" taxonomy terms (e.g. "Wolfgang Weingart")
 *   - year    → extracted from title string (e.g. "TM 12, 1972" → 1972)
 *   - medium  → "format" taxonomy terms (e.g. "Magazine", "Book")
 *
 * Image: uses media_details.file (raw upload path) to bypass CDN
 * letterboxing. The black border is baked into DR's images — handled
 * in the gallery with object-contain + dark background.
 *
 * Pagination: reads X-WP-TotalPages header correctly → all 8000+ items.
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const OUTPUT = path.join(__dirname, '../public/manifests/ds.json');
const HOST   = 'designreviewed.com';

// Format taxonomy name → clean label
const FORMAT_MAP = {
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

// Terms to exclude from all fields — noise from WP categories/tags
const NOISE = /members?\s*only|design\s*reviewed|archive|feature|article|news|latest|uncategorized/i;

const UA    = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function stripHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── Image URL ─────────────────────────────────────────────────────────────
// Use media_details.file (raw upload path) — avoids CDN letterboxed versions.
// Falls back to source_url stripped of WP size suffixes.
function extractImageUrl(post) {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;

  // Raw file path → full URL (no CDN scaling/letterbox)
  if (media.media_details?.file) {
    return `https://${HOST}/wp-content/uploads/${media.media_details.file}`;
  }

  // Fallback: full size, strip WP dimension suffixes
  const url = media.media_details?.sizes?.full?.source_url || media.source_url;
  if (url) return url
    .replace(/-scaled(\.[a-z]+)$/i, '$1')
    .replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');

  return null;
}

// ── Year ──────────────────────────────────────────────────────────────────
// Extracts from title: "Typographische Monatsblätter 12, 1972" → "1972"
// Intentionally skips HTML entity codes (&#8211; = en-dash = 8211).
function extractYear(post) {
  const title = stripHtml(post.title?.rendered || '');
  // Match 4-digit year in valid range
  const m = title.match(/\b(1[789]\d{2}|20[012]\d)\b/);
  if (m) return m[1];

  // ACF year field
  if (post.acf?.year) {
    const ay = String(post.acf.year).match(/\b(1[789]\d{2}|20[012]\d)\b/);
    if (ay) return ay[1];
  }

  return 'n.d.';
}

// ── Author ────────────────────────────────────────────────────────────────
// Priority: "designer" taxonomy → ACF "designer" field → Unknown
function extractAuthor(post) {
  const allTerms = (post._embedded?.['wp:term'] || []).flat();

  // 1. Dedicated designer taxonomy
  const designerTerms = allTerms
    .filter(t => t.taxonomy === 'designer' && t.name && !NOISE.test(t.name))
    .map(t => stripHtml(t.name));
  if (designerTerms.length) return designerTerms.join(', ');

  // 2. ACF field
  const acfDesigner = post.acf?.designer || post.acf?.author || post.acf?.artist;
  if (acfDesigner && typeof acfDesigner === 'string' && acfDesigner.trim().length > 1) {
    return acfDesigner.trim();
  }

  // 3. Post content scan — "Design by X", "Designed by X", "Art Director: X"
  const text = stripHtml(post.content?.rendered || post.excerpt?.rendered || '');
  const patterns = [
    /\bdesign(?:ed)?\s+by\s+([A-Z][a-zA-Z\-\'.]+(?:\s+[A-Z][a-zA-Z\-\'.]+){0,3})/,
    /\bart\s+director[:\s]+([A-Z][a-zA-Z\-\'.]+(?:\s+[A-Z][a-zA-Z\-\'.]+){0,2})/,
  ];
  for (const pat of patterns) {
    const hit = text.match(pat);
    if (hit?.[1] && hit[1].length < 50) return hit[1].trim();
  }

  return 'Unknown';
}

// ── Medium ────────────────────────────────────────────────────────────────
// Uses ONLY the "format" taxonomy — no category/tag noise.
function extractMedium(post) {
  const allTerms = (post._embedded?.['wp:term'] || []).flat();

  const formatTerms = allTerms
    .filter(t => t.taxonomy === 'format' && t.name && !NOISE.test(t.name))
    .map(t => {
      const key = t.name.toLowerCase().trim();
      return FORMAT_MAP[key] || FORMAT_MAP[t.slug?.toLowerCase()] || stripHtml(t.name);
    });

  if (formatTerms.length) return [...new Set(formatTerms)].join(', ');

  // Fallback: any non-noise term that looks like a format
  const fallback = allTerms
    .filter(t => t.name && !NOISE.test(t.name) && t.name.length < 40)
    .map(t => {
      const k = t.name.toLowerCase().trim();
      return FORMAT_MAP[k] || null;
    })
    .filter(Boolean);

  return fallback.length ? [...new Set(fallback)].join(', ') : 'Graphic Design';
}

// ── HTTP ──────────────────────────────────────────────────────────────────
function wpGet(urlPath) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST, path: urlPath, method: 'GET',
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': `https://${HOST}/archive/` }
    };
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 30000);
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode === 404) { resolve({ _notFound: true }); return; }
        if (res.statusCode === 429) { resolve({ _rateLimit: true, wait: parseInt(res.headers['retry-after'] || '30') * 1000 }); return; }
        if (res.statusCode !== 200) { resolve(null); return; }
        try {
          resolve({
            body:  JSON.parse(Buffer.concat(chunks).toString()),
            pages: parseInt(res.headers['x-wp-totalpages'] || '1', 10),
            total: parseInt(res.headers['x-wp-total'] || '0', 10),
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
    req.end();
  });
}

function save(map) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify([...map.values()], null, 2));
}

// ── Main fetch ────────────────────────────────────────────────────────────
async function fetchType(slug, items) {
  console.log(`\n  Post type: ${slug}`);
  let page = 1, totalPages = null, added = 0, fail = 0;

  while (fail < 3) {
    const res = await wpGet(`/wp-json/wp/v2/${slug}?per_page=100&page=${page}&_embed=true&status=publish`);

    if (!res)               { fail++; await sleep(5000); continue; }
    if (res._notFound)      { console.log('  ✗ 404'); return 0; }
    if (res._rateLimit)     { console.log(`\n  ⏸  ${res.wait/1000}s`); await sleep(res.wait); continue; }
    if (!res.body?.length)  break;

    fail = 0;
    if (totalPages === null) {
      totalPages = res.pages;
      console.log(`  Total: ${res.total} items, ${totalPages} pages`);
    }

    for (const post of res.body) {
      const imageUrl = extractImageUrl(post);
      if (!imageUrl) continue;

      const id     = `dr-${post.id}`;
      if (items.has(id)) continue;

      const medium = extractMedium(post);
      items.set(id, {
        id,
        title:          stripHtml(post.title?.rendered) || 'Untitled',
        author:         extractAuthor(post),
        year:           extractYear(post),
        imageUrl,
        source:         'ds',
        link:           post.link || `https://${HOST}/?p=${post.id}`,
        classification: medium.toLowerCase(),
        medium,
        department:     'Design Reviewed',
      });
      added++;
    }

    process.stdout.write(`  Page ${page}/${totalPages} — ${items.size} items\r`);
    if (page >= totalPages) break;
    page++;
    if (page % 10 === 0) { process.stdout.write('\n'); save(items); await sleep(2000); }
    else await sleep(700);
  }

  console.log(`\n  ✓ ${slug}: ${added} items`);
  return added;
}

async function harvest() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  DESIGN REVIEWED — FINAL HARVEST');
  console.log('  author ← designer taxonomy');
  console.log('  year   ← from title (4-digit match)');
  console.log('  medium ← format taxonomy only');
  console.log('══════════════════════════════════════════════════\n');

  const items = new Map();
  if (fs.existsSync(OUTPUT)) {
    try {
      JSON.parse(fs.readFileSync(OUTPUT, 'utf8')).forEach(i => items.set(i.id, i));
      console.log(`  Resuming: ${items.size} items\n`);
    } catch {}
  }

  for (const slug of ['artefacts', 'artefact', 'posts']) {
    const n = await fetchType(slug, items);
    if (n > 0) break; // found the right post type
    await sleep(1000);
  }

  save(items);
  console.log(`\n  ✅ DONE: ${items.size} items → public/manifests/ds.json`);
}

harvest().catch(e => { console.error('❌', e.message); process.exit(1); });