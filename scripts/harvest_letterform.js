/**
 * HARVEST: Letterform Archive — All Visual Graphic Design
 *
 * THE HONEST SITUATION:
 *   The Mastodon bot has posted 1,659 of LFA's 35,000+ items at random.
 *   Only ~43 were tagged "# poster" — that is the hard ceiling.
 *   No filter change will produce more posters; they haven't been posted.
 *
 * THE SOLUTION:
 *   Stop filtering for posters only. Accept ALL visually strong LFA content:
 *   prints, original artwork, brochures, collateral, announcements, book covers,
 *   magazines, ephemera, trade cards, calendars — everything except raw type
 *   specimens and calligraphy/penmanship manuals.
 *
 *   This gets ~700-800 items instead of 44, all high-quality graphic design.
 *   For actual poster VOLUME, run harvest_loc.js (Library of Congress, 6000+).
 *
 * TAGS CONFIRMED from live diagnostic (bot writes "# tag" with space):
 *   ACCEPT:  poster, print, originalartwork, collateral, brochure, leaflet,
 *            announcement, ephemera, tradecard, calendar, book, periodical,
 *            magazine, zine, journal, booklet, pamphlet, looseleaf, poster,
 *            ukiyoe, luggagelabel, matchbook, sticker
 *   REJECT:  typespecimen, typeephemera, boundspecimen, calligraphy,
 *            penmanship, writingmanual, looseleaf (writing manuals only)
 *
 * All items that pass get classification based on their actual tag.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUTPUT = path.join(__dirname, '../public/manifests/letterform.json');

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
const ua    = () => UAS[Math.floor(Math.random() * UAS.length)];
const sleep = ms  => new Promise(r => setTimeout(r, ms + Math.random() * ms * 0.4));

// ── Tag taxonomy (confirmed from live diagnostic) ─────────────────────────

// Hard reject — raw type craft, not visual graphic design artefacts
const REJECT_TAGS = new Set([
  'typespecimen', 'typeephemera', 'boundspecimen',
  'calligraphy', 'penmanship', 'handwriting',
]);

// Reject entire workID prefixes (collections that are 100% type/calligraphy)
const REJECT_PREFIXES = [
  'lfa_writingmanuals',
  'lfa_calligraphy',
  'lfa_tholenaar',   // Jan Tholenaar — pure type specimens
  'lfa_linotype',    // Linotype master drawings — technical
];

// Tag → classification mapping
const TAG_CLASSIFICATION = {
  'poster':           'poster',
  'print':            'print',
  'originalartwork':  'original artwork',
  'collateral':       'advertising',
  'brochure':         'brochure',
  'leaflet':          'ephemera',
  'announcement':     'ephemera',
  'ephemera':         'ephemera',
  'tradecard':        'ephemera',
  'calendar':         'ephemera',
  'luggagelabel':     'ephemera',
  'matchbook':        'ephemera',
  'sticker':          'ephemera',
  'book':             'book',
  'periodical':       'magazine',
  'magazine':         'magazine',
  'zine':             'magazine',
  'journal':          'magazine',
  'booklet':          'book',
  'pamphlet':         'book',
  'looseleaf':        'book',
  'ukiyoe':           'print',
};

function shouldAccept(tags, workID) {
  // Reject by prefix first
  if (REJECT_PREFIXES.some(p => workID.startsWith(p))) return false;
  // Reject if dominated by type specimen tags
  if (tags.some(t => REJECT_TAGS.has(t))) return false;
  // Accept anything with a known visual tag
  if (tags.some(t => TAG_CLASSIFICATION[t])) return true;
  // Accept unknown tags from non-rejected collections (catch-all)
  return tags.length > 0 && tags.some(t => t !== 'graphicdesign');
}

function classify(tags) {
  for (const tag of tags) {
    if (TAG_CLASSIFICATION[tag]) return TAG_CLASSIFICATION[tag];
  }
  return 'graphic design';
}

// ── HTML strip ────────────────────────────────────────────────────────────
function stripHtml(html) {
  return (html || '')
    .replace(/</g, ' <').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

// ── Parse Mastodon status ─────────────────────────────────────────────────
function parseStatus(status) {
  const text = stripHtml(status.content || '');

  const workIDMatch = text.match(/workID=(lfa_[a-zA-Z0-9_]+)/);
  if (!workIDMatch) return null;
  const workID = workIDMatch[1].replace(/[?&].*$/, '').trim();

  // CONFIRMED FIX: bot writes "# tag" with a space → /# ?([A-Za-z]...)/
  const tags = [...text.matchAll(/# ?([A-Za-z][A-Za-z0-9]*)/g)]
    .map(m => m[1].toLowerCase())
    .filter(t => !['letterformarchive', 'lfa', 'graphicdesign'].includes(t));

  // Title: everything before "Courtesy #"
  const beforeCourtesy = text.split(/\s+Courtesy\s+#/)[0].trim();
  // Strip "Item date: XXXX." suffix
  const titleBlock = beforeCourtesy.replace(/\s+Item date:.*$/, '').trim();

  // Year
  const yearMatch = text.match(/Item date:\s*(?:ca\.?\s*)?(\d{4})/i);
  const year = yearMatch ? yearMatch[1] : (text.match(/\b(1[89]\d{2}|20[012]\d)\b/)?.[1] || 'n.d.');

  const imageUrl = status.media_attachments?.[0]?.url || null;

  return { workID, title: titleBlock || workID, year, tags, imageUrl };
}

// ── HTTP GET → JSON ───────────────────────────────────────────────────────
function getJson(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 25000);
    const req = https.get(url, {
      headers: { 'User-Agent': ua(), 'Accept': 'application/json', 'Connection': 'keep-alive' }
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(timer);
        resolve(getJson(res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode === 429) resolve({ _rateLimit: true, wait: parseInt(res.headers['retry-after'] || '60') * 1000 });
        else if (res.statusCode !== 200) resolve(null);
        else { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve(null); } }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function save(map) {
  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify([...map.values()], null, 2));
}

// ── Scrape account ────────────────────────────────────────────────────────
async function scrapeAccount(accountId, label, items) {
  console.log(`\n  ── @${label} ──`);

  // Tag frequency counter for summary
  const tagCounts = {};
  let maxId = null, page = 0, kept = 0, rejected = 0, noImg = 0, fail = 0;

  while (fail < 4) {
    let url = `https://typo.social/api/v1/accounts/${accountId}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`;
    if (maxId) url += `&max_id=${maxId}`;

    const statuses = await getJson(url);
    if (!statuses)                                     { fail++; await sleep(3000); continue; }
    if (statuses._rateLimit)                           { console.log(`\n  ⏸  ${statuses.wait/1000}s`); await sleep(statuses.wait); continue; }
    if (!Array.isArray(statuses) || !statuses.length)  break;

    fail = 0;
    page++;

    for (const status of statuses) {
      const p = parseStatus(status);
      if (!p) continue;

      if (!p.imageUrl) { noImg++; continue; }

      p.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });

      if (!shouldAccept(p.tags, p.workID)) { rejected++; continue; }

      const id = `lfa-${p.workID}`;
      if (items.has(id)) continue;

      items.set(id, {
        id,
        title:          p.title,
        author:         'Letterform Archive',
        year:           p.year,
        imageUrl:       p.imageUrl,
        source:         'letterform',
        link:           `https://oa.letterformarchive.org/item?workID=${p.workID}`,
        classification: classify(p.tags),
        medium:         p.tags.filter(t => t !== 'graphicdesign').slice(0, 3).join(', '),
        department:     'Letterform Archive',
      });
      kept++;
    }

    maxId = statuses[statuses.length - 1].id;
    process.stdout.write(`  Page ${String(page).padStart(3)} | ✓ kept: ${kept} | ✗ rejected: ${rejected} | no-img: ${noImg}\r`);
    if (page % 10 === 0) { process.stdout.write('\n'); save(items); }
    await sleep(900);
  }

  console.log(`\n\n  ✓ @${label}: ${kept} items from ~${page * 40} posts`);

  // Print tag breakdown
  console.log('\n  Tag breakdown of accepted items:');
  const breakdown = {};
  for (const item of items.values()) {
    const c = item.classification;
    breakdown[c] = (breakdown[c] || 0) + 1;
  }
  Object.entries(breakdown).sort((a,b) => b[1]-a[1])
    .forEach(([c, n]) => console.log(`    ${String(n).padStart(4)}  ${c}`));

  return kept;
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function harvest() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LETTERFORM ARCHIVE — ALL VISUAL GRAPHIC DESIGN          ║');
  console.log('║  Accepts: posters, prints, books, magazines, ephemera,   ║');
  console.log('║           brochures, original artwork, collateral         ║');
  console.log('║  Rejects: type specimens, calligraphy manuals             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('  NOTE: The bot has posted ~1,659 items. Only ~43 were');
  console.log('  tagged "poster" — that was the hard ceiling.');
  console.log('  This script now accepts all visually strong content.');
  console.log('  For poster VOLUME: run harvest_loc.js (6,000+ from LOC).\n');

  const items = new Map();

  const ACCOUNTS = ['Lfaimagebot', 'letterformarchive'];
  let total = 0;

  for (const acct of ACCOUNTS) {
    const info = await getJson(`https://typo.social/api/v1/accounts/lookup?acct=${acct}`);
    if (!info?.id) { console.log(`  ✗ @${acct} not found`); continue; }
    console.log(`  @${acct}: ${info.statuses_count} posts`);
    const n = await scrapeAccount(info.id, acct, items);
    total += n;
    save(items);
    await sleep(2000);
  }

  save(items);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ DONE: ${items.size} items → public/manifests/letterform.json`);
  console.log(`  Now run: node scripts/harvest_loc.js`);
  console.log(`  That will add 6,000+ posters from Library of Congress.`);
  console.log(`${'═'.repeat(60)}\n`);
}

harvest().catch(e => { console.error('❌', e.message); process.exit(1); });