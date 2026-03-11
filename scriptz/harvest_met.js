/**
 * HARVEST: MET (Bulletproof Version)
 * - 15 second timeouts (not 6)
 * - 1 second delays between object fetches (not 200ms)
 * - Progress saves every 50 items
 * - Clear error messages
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/manifests/met.json');

const CATEGORIES = [
  { name: 'photograph', dept: 19, limit: 250 },
  { name: 'drawing',    dept: 19, limit: 150 },
  { name: 'print',      dept: 19, limit: 150 },
  { name: 'painting',   dept: 11, limit: 100 },
  { name: 'sculpture',  dept: 12, limit: 80 },
  { name: 'textile',    dept: 8,  limit: 60 },
  { name: 'modern',     dept: 21, limit: 100 },
];

function get(url, timeout = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, timeout);

    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Connection': 'close'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      clearTimeout(timer);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function harvestMET() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  MET HARVEST (Bulletproof)');
  console.log('  This will take 20-30 minutes. Be patient.');
  console.log('═══════════════════════════════════════════════════\n');

  // Load existing items
  let allItems = new Map();
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      existing.forEach(item => allItems.set(item.id, item));
      console.log(`  → Starting with ${allItems.size} existing items\n`);
    } catch (e) {
      console.log(`  → Starting fresh\n`);
    }
  }

  for (const cat of CATEGORIES) {
    console.log(`\n[${ cat.name.toUpperCase().padEnd(12) }] Target: ${cat.limit} items`);
    console.log('─'.repeat(50));

    // Try multiple search strategies
    let searchData = null;
    
    // Strategy 1: Department search
    searchData = await get(
      `https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${cat.dept}&hasImages=true&q=${cat.name}`
    );
    
    if (!searchData?.objectIDs?.length) {
      console.log('  ⚠ Primary search failed, trying isHighlight...');
      await sleep(2000);
      searchData = await get(
        `https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${cat.dept}&isHighlight=true&q=*`
      );
    }

    if (!searchData?.objectIDs?.length) {
      console.log('  ⚠ Highlight failed, trying generic "art" search...');
      await sleep(2000);
      searchData = await get(
        `https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${cat.dept}&hasImages=true&q=art`
      );
    }

    if (!searchData?.objectIDs?.length) {
      console.log('  ✗ All search strategies failed. Skipping category.\n');
      continue;
    }

    const ids = searchData.objectIDs.sort(() => 0.5 - Math.random());
    console.log(`  → Found ${ids.length} potential IDs`);
    console.log(`  → Fetching objects (1 per second to avoid throttling)...\n`);

    let added = 0;
    let checked = 0;
    let failed = 0;
    let saveCounter = 0;

    for (const id of ids) {
      if (added >= cat.limit) break;
      if (checked >= 1500) {
        console.log(`\n  ! Checked 1500 items, stopping to avoid endless loop`);
        break;
      }

      checked++;
      const globalId = `met-${id}`;

      // Skip if already have it
      if (allItems.has(globalId)) continue;

      // Fetch object details with 1 second delay
      await sleep(1000);
      
      const item = await get(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
      );

      if (!item) {
        failed++;
        if (failed > 20) {
          console.log(`\n  ! Too many failures (${failed}), MET might be blocking us`);
          console.log(`  ! Taking a 10 second break...`);
          await sleep(10000);
          failed = 0;
        }
        continue;
      }

      const imageUrl = item.primaryImageSmall || item.primaryImage;
      
      if (imageUrl) {
        allItems.set(globalId, {
          id: globalId,
          title: item.title || 'Untitled',
          author: item.artistDisplayName || 'Unknown',
          year: item.objectDate || 'Unknown',
          imageUrl: imageUrl,
          source: 'The Metropolitan Museum of Art',
          link: item.objectURL || `https://www.metmuseum.org/art/collection/search/${id}`,
          department: item.department || '',
          classification: item.classification || '',
          medium: item.medium || '',
          objectType: item.objectName || ''
        });
        
        added++;
        failed = 0; // reset failure counter on success
        saveCounter++;

        // Save progress every 50 items
        if (saveCounter >= 50) {
          const dir = path.dirname(OUTPUT_PATH);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Array.from(allItems.values()), null, 2));
          saveCounter = 0;
        }

        process.stdout.write(`  Progress: ${added}/${cat.limit} (checked: ${checked}, failed: ${failed})     \r`);
      }
    }

    // Final save for this category
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(Array.from(allItems.values()), null, 2));
    
    console.log(`\n  ✓ Completed ${cat.name}: added ${added} items`);
    console.log(`    Total collection size: ${allItems.size} items\n`);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ HARVEST COMPLETE: ${allItems.size} total items`);
  console.log(`  📁 Saved to: public/manifests/met.json`);
  console.log('═══════════════════════════════════════════════════\n');
}

harvestMET().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});