/**
 * COOPER HEWITT: DENSITY-WEIGHTED TURBO (FULL METADATA)
 * Resumable
 * Weighted ID targeting
 * Proper Graphic prioritization
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.join(__dirname, '../public/manifests/cooperhewitt.json');

const TARGETS = {
  typography: 800,
  graphic: 800,
  poster: 500,
  print: 500,
  illustration: 500
};

const counts = {
  typography: 0,
  graphic: 0,
  poster: 0,
  print: 0,
  illustration: 0
};

const allItems = new Map();

const safeStr = (val) =>
  (!val
    ? ""
    : String(typeof val === 'object'
        ? (val.name || JSON.stringify(val))
        : val)
  ).toLowerCase();

function getRaw(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
      (res) => {
        if (res.statusCode !== 200) return resolve(null);

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

// ------------------------------
// Weighted ID Generator
// ------------------------------
function getWeightedId() {
  const r = Math.random();

  // 60% modern high-density zone
  if (r < 0.60) {
    return Math.floor(Math.random() * (18850000 - 18600000) + 18600000);
  }
  // 25% mid
  else if (r < 0.85) {
    return Math.floor(Math.random() * (18600000 - 18400000) + 18400000);
  }
  // 10% early modern
  else if (r < 0.95) {
    return Math.floor(Math.random() * (18400000 - 18200000) + 18200000);
  }
  // 5% older
  else {
    return Math.floor(Math.random() * (18200000 - 18000000) + 18000000);
  }
}

async function checkId(id) {

  const key = `ch-${id}`;
  if (allItems.has(key)) return;

  const sId = String(id);
  const part1 = sId.substring(0, 3);
  const part2 = sId.substring(3, 6);
  const part3 = sId.substring(6);

  const url =
    `https://raw.githubusercontent.com/cooperhewitt/collection/master/objects/` +
    `${part1}/${part2}/${part3}/${id}.json`;

  const resString = await getRaw(url);
  if (!resString) return;

  try {
    const obj = JSON.parse(resString);
    if (!obj || !obj.images || obj.images.length === 0) return;

    const title = safeStr(obj.title);
    const type = safeStr(obj.type);
    const medium = safeStr(obj.medium);
    const classification = safeStr(obj.classification);
    const department = safeStr(obj.department);

    let category = null;

    // =========================
    // TYPOGRAPHY
    // =========================
    if (
      (
        title.includes('type specimen') ||
        title.includes('alphabet') ||
        title.includes('font') ||
        title.includes('letter') ||
        title.includes('broadside') ||
        medium.includes('letterpress') ||
        classification.includes('sample book') ||
        classification.includes('pattern book') ||
        classification.includes('trade catalog') ||
        classification.includes('printed ephemera')
      ) &&
      counts.typography < TARGETS.typography
    ) {
      category = 'typography';
    }

    // =========================
    // POSTER
    // =========================
    else if (
      classification.includes('poster') &&
      counts.poster < TARGETS.poster
    ) {
      category = 'poster';
    }

    // =========================
    // GRAPHIC DESIGN
    // (Placed before Print to prevent cannibalization)
    // =========================
    else if (
      (
        classification.includes('drawing, print, or graphic design') ||
        classification.includes('advertisement') ||
        classification.includes('brochure') ||
        classification.includes('trade card') ||
        classification.includes('album') ||
        classification.includes('book') ||
        classification.includes('printed ephemera') ||
        department.includes('drawing') ||
        department.includes('graphic')
      ) &&
      !classification.includes('poster') &&
      counts.graphic < TARGETS.graphic
    ) {
      category = 'graphic';
    }

    // =========================
    // PRINT
    // =========================
    else if (
      classification.includes('print') &&
      counts.print < TARGETS.print
    ) {
      category = 'print';
    }

    // =========================
    // ILLUSTRATION
    // =========================
    else if (
      classification.includes('drawing') &&
      counts.illustration < TARGETS.illustration
    ) {
      category = 'illustration';
    }

    if (!category) return;

    const img =
      obj.images[0]?.b?.url ||
      obj.images[0]?.z?.url ||
      obj.images[0]?.d?.url ||
      obj.images[0]?.c?.url;

    if (!img) return;

    allItems.set(key, {
      id: key,
      title: obj.title || 'Untitled',
      author: obj.participants?.[0]?.person_name || 'Unknown',
      year: obj.date || 'Unknown',
      imageUrl: img,
      source: 'Cooper Hewitt Smithsonian Design Museum',
      link: `https://collection.cooperhewitt.org/objects/${id}/`,
      classification: obj.classification || '',
      department: obj.department || '',
      medium: obj.medium || '',
      category
    });

    counts[category]++;

  } catch {}
}

async function harvest() {

  console.log('═══════════════════════════════════════════════════');
  console.log('  COOPER HEWITT: DENSITY-WEIGHTED TURBO');
  console.log('═══════════════════════════════════════════════════\n');

  // Resume existing collection
  if (fs.existsSync(OUTPUT_PATH)) {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    existing.forEach(item => {
      allItems.set(item.id, item);
      if (counts[item.category] !== undefined)
        counts[item.category]++;
    });
  }

  const BATCH_SIZE = 60;
  let attempts = 0;

  while (Object.keys(TARGETS).some(k => counts[k] < TARGETS[k])) {

    const batch = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      batch.push(checkId(getWeightedId()));
    }

    await Promise.all(batch);
    attempts += BATCH_SIZE;

    process.stdout.write(
      `   [Attempts: ${attempts}] ` +
      `T:${counts.typography} ` +
      `G:${counts.graphic} ` +
      `P:${counts.poster} ` +
      `PR:${counts.print} ` +
      `I:${counts.illustration}\r`
    );

    if (attempts % 300 === 0) {
      fs.writeFileSync(
        OUTPUT_PATH,
        JSON.stringify([...allItems.values()], null, 2)
      );
    }
  }

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify([...allItems.values()], null, 2)
  );

  console.log(`\n\n✅ DONE. Total: ${allItems.size}`);
}

harvest();
