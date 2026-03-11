/**
 * HARVEST: Library of Congress — Posters & Graphic Design
 *
 * THE LOC IS ONE OF THE GREATEST POSTER COLLECTIONS IN THE WORLD:
 *   - WPA (Works Progress Administration) posters: ~900 items, 1936–1943
 *   - WWI propaganda posters: thousands
 *   - WWII posters: thousands  
 *   - Federal Art Project prints
 *   - Historic American advertisement posters
 *   - Travel and tourism posters
 *   - Concert, theatre, circus posters
 *   - Political and suffrage posters
 *   ALL are public domain. ALL are free. ALL have high-res scans.
 *
 * API: Fully documented, free, no key required.
 *   Base: https://www.loc.gov/search/?fo=json
 *   Filter: fa=original-format:poster
 *   Image: result.image_url[0] → replace _150px with _1024px for full res
 *   Pagination: sp= (page), c= (count per page, max 150)
 *
 * CONFIRMED from official API docs (loc.gov/apis/json-and-yaml/):
 *   - ?fo=json works on any loc.gov page
 *   - fa=original-format:poster filters to poster format only
 *   - image_url array: "//cdn.loc.gov/service/pnp/.../XXXX_150px.jpg"
 *     → replace "_150px" with "_1024px" for high resolution
 *   - pagination.total gives total result count
 *   - results[].id is the item URL
 *   - results[].title, results[].date, results[].contributor_names
 *
 * OUTPUT: public/manifests/loc.json
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUTPUT = path.join(__dirname, '../public/manifests/loc.json');

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
const ua    = () => UAS[Math.floor(Math.random() * UAS.length)];
const sleep = ms  => new Promise(r => setTimeout(r, ms + Math.random() * ms * 0.5));

// ── HTTP GET → JSON ───────────────────────────────────────────────────────
function getJson(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 30000);
    const req = https.get(url, {
      headers: {
        'User-Agent':      ua(),
        'Accept':          'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection':      'keep-alive',
      }
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(timer);
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://www.loc.gov${res.headers.location}`;
        resolve(getJson(loc));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode === 429) {
          resolve({ _rateLimit: true, wait: (parseInt(res.headers['retry-after'] || '60')) * 1000 });
          return;
        }
        if (res.statusCode !== 200) {
          console.warn(`    HTTP ${res.statusCode} from ${url.slice(0, 80)}`);
          resolve(null);
          return;
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', (e) => { clearTimeout(timer); console.warn(`    Err: ${e.message}`); resolve(null); });
  });
}

// ── Image URL upgrade ─────────────────────────────────────────────────────
// LOC returns _150px thumbnails. Upgrade to _1024px (max available).
// URL schema: //cdn.loc.gov/service/pnp/{division}/{folder}/{file}_150px.jpg
function upgradeImageUrl(rawUrl) {
  if (!rawUrl) return null;
  let url = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  // Remove query params (sometimes present)
  url = url.split('?')[0];
  // Upgrade size suffix
  url = url
    .replace(/_150px\.(jpg|jpeg|png|gif)/i, '_1024px.$1')
    .replace(/_75px\.(jpg|jpeg|png|gif)/i,  '_1024px.$1')
    .replace(/_thumb\.(jpg|jpeg|png|gif)/i,  '_1024px.$1');
  return url;
}

// ── Extract best image from result ────────────────────────────────────────
function getBestImage(result) {
  // image_url is an array — first is usually 150px thumb
  const urls = result.image_url || [];
  for (const raw of urls) {
    const upgraded = upgradeImageUrl(raw);
    if (upgraded && upgraded.includes('cdn.loc.gov')) return upgraded;
  }
  return null;
}

// ── Classification from subjects + partof ────────────────────────────────
function classify(result) {
  const s  = (result.subject || []).join(' ').toLowerCase();
  const t  = (result.title || '').toLowerCase();
  const po = (result.partof || []).join(' ').toLowerCase();

  if (/wpa|works progress|federal art project/.test(s + po))  return 'WPA Poster';
  if (/world war.*i[^i]|ww.*i[^i]|wwi[^i]/.test(s + t))     return 'WWI Poster';
  if (/world war.*ii|ww.*ii|wwii/.test(s + t))               return 'WWII Poster';
  if (/travel|tourism|railroad|airline|ocean|ship|cruise/.test(s + t)) return 'Travel Poster';
  if (/film|movie|cinema|theater|theatre|concert|music/.test(s + t))   return 'Entertainment Poster';
  if (/political|election|suffrage|vote|campaign/.test(s + t))         return 'Political Poster';
  if (/circus|carnival|fair/.test(s + t))                    return 'Circus Poster';
  if (/health|safety|public.*service|war bond/.test(s + t))  return 'Public Service Poster';
  return 'Poster';
}

function save(map) {
  const dir = path.dirname(OUTPUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify([...map.values()], null, 2));
}

// ── SEARCH TASKS ──────────────────────────────────────────────────────────
// Each task is a LOC search query that returns posters.
// Using fa=original-format:poster to confirm all are posters.
// Also using collections and partof facets for best coverage.
const TASKS = [
  // ── Core poster collections ────────────────────────────────────────────
  {
    label: 'LOC Posters — All (paginated main harvest)',
    url:   'https://www.loc.gov/search/?fo=json&fa=original-format:poster&c=150&at=results,pagination',
    maxPages: 50,  // 150×50 = 7,500 items max (LOC has ~6,000+ posters)
  },
  // ── Targeted high-value collections ───────────────────────────────────
  // These use partof facets to hit the best collections specifically.
  // They'll mostly overlap with the main harvest (deduped by ID) but
  // ensure we don't miss any that the broad search misses.
  {
    label: 'Prints & Photographs — Posters',
    url:   'https://www.loc.gov/search/?fo=json&fa=original-format:poster%7Cpartof:prints+and+photographs+division&c=150&at=results,pagination',
    maxPages: 30,
  },
];

// ── Process a single search results page ─────────────────────────────────
function processResults(results, items) {
  let added = 0;
  for (const result of results) {
    // Must have an image
    const imageUrl = getBestImage(result);
    if (!imageUrl) continue;

    // Skip access-restricted items
    if (result.access_restricted) continue;

    // Extract ID from result.id URL
    const idMatch = (result.id || '').match(/\/item\/([^/]+)\/?$/);
    const itemId  = idMatch ? idMatch[1] : null;
    if (!itemId) continue;

    const id = `loc-${itemId}`;
    if (items.has(id)) continue;

    // Author from contributor_names array
    const author = (result.contributor_names || []).join(', ') || 'Unknown';

    // Year
    const year = result.date
      ? String(result.date).match(/\d{4}/)?.[0] || 'n.d.'
      : 'n.d.';

    // Subjects for medium field
    const subjects = (result.subject || []).slice(0, 4).join(', ');

    items.set(id, {
      id,
      title:          result.title || 'Untitled',
      author,
      year,
      imageUrl,
      source:         'loc',
      link:           result.id || `https://www.loc.gov/item/${itemId}/`,
      classification: 'poster',
      medium:         classify(result),
      department:     'Library of Congress',
    });
    added++;
  }
  return added;
}

// ── Main harvest loop ─────────────────────────────────────────────────────
async function runTask(task, items) {
  const { label, url, maxPages } = task;
  console.log(`\n  ── ${label} ──`);

  let page      = 1;
  let totalAdded = 0;
  let totalPages = null;
  let failStreak = 0;

  while (page <= maxPages && failStreak < 3) {
    const pageUrl = `${url}&sp=${page}`;
    const data    = await getJson(pageUrl);

    if (!data) { failStreak++; await sleep(5000); continue; }
    if (data._rateLimit) {
      console.log(`\n    ⏸  Rate limited — ${data.wait / 1000}s`);
      await sleep(data.wait);
      continue;
    }

    const results = data.results || [];
    if (!results.length) {
      failStreak++;
      await sleep(2000);
      continue;
    }

    failStreak = 0;

    if (totalPages === null) {
      const total = data.pagination?.total || 0;
      totalPages  = Math.ceil(total / 150);
      console.log(`    Total results: ${total}  Pages: ${totalPages}`);
    }

    const added = processResults(results, items);
    totalAdded += added;

    process.stdout.write(
      `    Page ${page}/${Math.min(maxPages, totalPages || maxPages)} — +${added} — total: ${items.size}\r`
    );

    if (page >= (totalPages || maxPages)) break;
    page++;

    // LOC API: polite rate — no documented limit but ~3 req/s is safe
    await sleep(400);

    if (page % 10 === 0) {
      process.stdout.write('\n');
      save(items);
      await sleep(1000);
    }
  }

  console.log(`\n    ✓ ${label}: +${totalAdded} items`);
  return totalAdded;
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function harvest() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LIBRARY OF CONGRESS — POSTERS & GRAPHIC DESIGN          ║');
  console.log('║  Free public API • Public domain • High-res scans        ║');
  console.log('║  WPA • WWI • WWII • Travel • Theatre • Political         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const items = new Map();
  if (fs.existsSync(OUTPUT)) {
    try {
      JSON.parse(fs.readFileSync(OUTPUT, 'utf8')).forEach(i => items.set(i.id, i));
      console.log(`  Resuming: ${items.size} items already collected\n`);
    } catch {}
  }

  let totalAdded = 0;
  for (const task of TASKS) {
    const n = await runTask(task, items);
    totalAdded += n;
    save(items);
    await sleep(2000);
  }

  save(items);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ DONE: ${String(items.size).padStart(6)} posters collected                    ║`);
  console.log(`║  Output: public/manifests/loc.json                       ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (items.size === 0) {
    console.log('  ⚠️  0 items. Try fetching this URL in your browser to debug:');
    console.log('  https://www.loc.gov/search/?fo=json&fa=original-format:poster&c=3&sp=1');
    console.log('  If it returns JSON with results, the script should work.');
    console.log('  If it returns an error, the API may have changed.');
  }
}

harvest().catch(e => { console.error('❌', e.message); process.exit(1); });