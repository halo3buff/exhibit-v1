/**
 * HARVEST: Art Institute of Chicago
 *
 * FIX: The original script used `is_public_domain=true` as a plain query param,
 * which ARTIC's Elasticsearch backend silently ignores. The correct syntax is
 * `query[term][is_public_domain]=true`. Without it, restricted works are included
 * and the IIIF server returns the "Archival Collection" placeholder box (HTTP 200,
 * not a 404), bypassing the onError handler in the gallery.
 *
 * OUTPUT: public/manifests/artic.json
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/manifests/artic.json');

function get(url, timeout = 15000) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.setTimeout(timeout, () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractYear(dateString) {
  if (!dateString) return 0;
  const match = dateString.match(/\d{4}/);
  return match ? parseInt(match[0]) : 0;
}

async function harvestArtic() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ARTIC HARVEST — public domain only');
  console.log('═══════════════════════════════════════════════════\n');

  const allItems = new Map();

  const TARGETS = {
    prints:        400,
    photography:   300,
    impressionism: 250,
    paintings:     300,
    contemporary:  250,
  };

  const counts = { prints: 0, photography: 0, impressionism: 0, paintings: 0, contemporary: 0 };

  let page = 1;
  const MAX_PAGES = 80;

  while (page <= MAX_PAGES) {
    if (Object.keys(TARGETS).every(k => counts[k] >= TARGETS[k])) break;

    await sleep(1000);

    // FIXED: query[term][is_public_domain]=true  (Elasticsearch syntax)
    // The old plain `is_public_domain=true` was silently ignored by ARTIC's API.
    const url =
      `https://api.artic.edu/api/v1/artworks` +
      `?query[term][is_public_domain]=true` +
      `&fields=id,title,image_id,artist_display,date_display,medium_display,artwork_type_title,classification_title,style_title` +
      `&limit=100&page=${page}`;

    const data = await get(url);
    if (!data?.data?.length) break;

    for (const item of data.data) {
      if (!item.image_id) continue;

      const classification = (item.classification_title || '').toLowerCase();
      const style          = (item.style_title || '').toLowerCase();
      const medium         = (item.medium_display || '').toLowerCase();
      const year           = extractYear(item.date_display);

      let category = null;

      if (classification.includes('print') || classification.includes('drawing')) {
        if (counts.prints < TARGETS.prints) category = 'prints';
      } else if (classification.includes('photograph')) {
        if (counts.photography < TARGETS.photography) category = 'photography';
      } else if (style.includes('impression')) {
        if (counts.impressionism < TARGETS.impressionism) category = 'impressionism';
      } else if (classification.includes('painting')) {
        if (counts.paintings < TARGETS.paintings) category = 'paintings';
      } else if (
        year >= 1960 ||
        medium.includes('installation') ||
        medium.includes('video') ||
        medium.includes('mixed') ||
        medium.includes('assemblage')
      ) {
        if (counts.contemporary < TARGETS.contemporary) category = 'contemporary';
      }

      if (!category) continue;

      const id = `artic-${item.id}`;
      if (allItems.has(id)) continue;

      allItems.set(id, {
        id,
        title:          item.title || 'Untitled',
        author:         item.artist_display || 'Unknown',
        year:           item.date_display || 'Unknown',
        imageUrl:       `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
        source:         'Art Institute of Chicago',
        link:           `https://www.artic.edu/artworks/${item.id}`,
        classification: item.classification_title || '',
        style:          item.style_title || '',
        medium:         item.medium_display || '',
      });

      counts[category]++;
    }

    console.log(
      `Page ${page} | Total: ${allItems.size} | ` +
      `P:${counts.prints} Ph:${counts.photography} ` +
      `I:${counts.impressionism} Pa:${counts.paintings} C:${counts.contemporary}`
    );

    page++;
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify([...allItems.values()], null, 2));

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✅  COMPLETE: ${allItems.size} items — all public domain`);
  console.log('═══════════════════════════════════════════════════\n');
}

harvestArtic().catch(err => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});