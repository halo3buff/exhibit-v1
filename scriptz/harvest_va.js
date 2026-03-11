/**
 * HARVEST: V&A (With classification filled)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/manifests/va.json');
const allItems = new Map();

function getJson(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { req.destroy(); resolve(null); }, 15000);
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Connection': 'close' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) { resolve(null); return; }
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function extractYear(dateStr) {
  if (!dateStr) return 'Unknown';
  const match = dateStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? match[0] : dateStr;
}

async function fetchDetail(systemNumber) {
  const url = `https://api.vam.ac.uk/v2/object/${systemNumber}`;
  const data = await getJson(url);
  return data?.record || data || null;
}

async function harvestVA() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  V&A HARVEST');
  console.log('═══════════════════════════════════════════════════\n');

  const TARGETS = { drawing: 800, print: 800, photograph: 800, poster: 800 };
  const counts = { drawing: 0, print: 0, photograph: 0, poster: 0 };
  const SEARCHES = ['drawing', 'print', 'photograph', 'poster'];

  for (const q of SEARCHES) {
    console.log(`\n[${q.toUpperCase()}] Target: 800`);
    let page = 1;

    while (counts[q] < TARGETS[q] && page <= 15) {
      await new Promise(r => setTimeout(r, 1000));

      const url = `https://api.vam.ac.uk/v2/objects/search?q=${q}&images_exist=true&page_size=100&page=${page}`;
      const data = await getJson(url);

      if (!data?.records?.length) break;

      const needed = data.records
        .filter(item => item._images?._primary_thumbnail)
        .filter(item => !allItems.has(`va-${item.systemNumber}`))
        .slice(0, TARGETS[q] - counts[q]);

      if (needed.length === 0) { page++; continue; }

      console.log(`  Page ${page}: fetching ${needed.length} items...`);

      const BATCH_SIZE = 5;
      for (let i = 0; i < needed.length; i += BATCH_SIZE) {
        const batch = needed.slice(i, i + BATCH_SIZE);
        const details = await Promise.all(batch.map(item => fetchDetail(item.systemNumber)));

        for (let j = 0; j < details.length; j++) {
          const detail = details[j];
          const searchItem = batch[j];
          if (!detail) continue;

          const id = `va-${searchItem.systemNumber}`;
          
          // Fix image size
          let img = searchItem._images._primary_thumbnail;
          if (img && img.includes('framemark.vam.ac.uk')) {
            img = img.replace(/\/full\/[^\/]+\//, '/full/1200,/');
          }

          // Get classification from categories array or _primaryCategory
          let classification = '';
          if (detail.categories && detail.categories.length > 0) {
            classification = detail.categories[0].name || '';
          } else if (detail._primaryCategory) {
            classification = detail._primaryCategory;
          }

          allItems.set(id, {
            id: id,
            title: detail._primaryTitle || searchItem._primaryTitle || 'Untitled',
            author: searchItem._primaryMaker?.name || detail._primaryMaker?.name || 'Unknown',
            year: extractYear(searchItem._primaryDate || detail._primaryDate || ''),
            imageUrl: img,
            source: 'V&A Museum',
            link: `https://collections.vam.ac.uk/item/${searchItem.systemNumber}`,
            classification: classification,
            objectType: detail.objectType || searchItem.objectType || '',
            medium: detail.materialsAndTechniques || ''
          });

          counts[q]++;
        }

        process.stdout.write(`    ${counts[q]}/800\r`);
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`  ✓ Page ${page}: ${counts[q]}/800          `);
      page++;
    }
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify([...allItems.values()], null, 2));

  console.log(`\n✅ ${allItems.size} items → public/manifests/va.json\n`);
}

harvestVA().catch(err => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});