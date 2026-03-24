// scripts/nsfw-scan.mjs
import Database from 'better-sqlite3';
import crypto   from 'crypto';
import fs       from 'fs';
import path     from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'artworks.db');
const CACHE_DIR = 'C:\\Users\\ameen\\Desktop\\.img-cache';
const OUTPUT    = path.join(__dirname, 'nsfw-flagged.json');
const BATCH_SIZE = 32;

const THRESHOLDS = { Porn: 0.40, Sexy: 0.60, Hentai: 0.50 };

const STRONG_KEYWORDS = ['nude','nudity','naked','nakedness','erotic','erotica','pornographic','obscene'];
const ALL_KEYWORDS    = [...STRONG_KEYWORDS,
  'venus','diana','danae','leda','susanna','bathsheba','nymph','nymphs',
  'satyr','satyrs','bacchante','figure study','life study','life drawing',
  'academy figure','academie','bather','bathers','bathing',
  'reclining figure','reclining woman','reclining man','odalisque','harem','torso',
];

// ── EXACT copies of getFetchUrl + getCacheFilename from prewarm-cache.mjs ────
function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}
function getFetchUrl(imageUrl, size) {
  if (imageUrl.includes('letterformarchive.org')) return imageUrl;
  if (imageUrl.includes('/full/')) return iiifUrl(imageUrl, size);
  if (imageUrl.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(imageUrl)) {
    return chSourceUrl(imageUrl);
  }
  return imageUrl;
}
function getCacheFilename(imageUrl, size) {
  const fetchUrl = getFetchUrl(imageUrl, size);
  const key      = `${fetchUrl}:${size}`;
  return `${crypto.createHash('md5').update(key).digest('hex')}.jpg`;
}
function findCachedPath(imageUrl) {
  for (const size of [400, 1200]) {
    const p = path.join(CACHE_DIR, getCacheFilename(imageUrl, size));
    try { if (fs.statSync(p).size > 500) return p; } catch {}
  }
  return null;
}
// ─────────────────────────────────────────────────────────────────────────────

function getKeywordMatch(row) {
  const haystack = [row.title, row.classification, row.medium, row.objectType, row.subCategory]
    .filter(Boolean).join(' ').toLowerCase();
  return ALL_KEYWORDS.find(kw => haystack.includes(kw)) || null;
}

async function main() {
  console.log('\n🔍 NSFW Full Batch Scanner — Exhibit Archive');
  console.log('─────────────────────────────────────────────\n');

  if (!fs.existsSync(DB_PATH)) { console.error('❌ artworks.db not found'); process.exit(1); }

  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT id, title, author, year, imageUrl, source, mainCategory, link,
           classification, medium, objectType, subCategory
    FROM artworks WHERE imageUrl IS NOT NULL AND imageUrl != ''
  `).all();
  db.close();

  // Quick cache check to verify fix worked
  let cacheCheck = 0;
  for (const row of rows.slice(0, 200)) {
    if (findCachedPath(row.imageUrl)) cacheCheck++;
  }
  console.log(`📊 ${rows.length.toLocaleString()} artworks to scan`);
  console.log(`   Cache spot-check (first 200): ${cacheCheck}/200 found`);
  if (cacheCheck < 50) {
    console.error('\n❌ Still finding very few cached files — CACHE_DIR path may be wrong.');
    console.error(`   Currently looking in: ${CACHE_DIR}`);
    console.error('   Update CACHE_DIR at the top of this script to match your actual path.\n');
    process.exit(1);
  }
  console.log(`   Batch size: ${BATCH_SIZE}\n`);

  console.log('📦 Loading TensorFlow...');
  const tf = await import('@tensorflow/tfjs');
  await import('@tensorflow/tfjs-backend-cpu');
  await tf.setBackend('cpu');
  await tf.ready();

  console.log('📦 Loading nsfwjs model...');
  const nsfwjs = await import('nsfwjs');
  const model  = await nsfwjs.load('MobileNetV2Mid', { size: 224 });
  const sharp  = (await import('sharp')).default;
  console.log('✅ Ready\n');

  const flagged   = [];
  let scanned     = 0;
  let cacheMiss   = 0;
  let errors      = 0;
  const start     = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch   = rows.slice(i, i + BATCH_SIZE);
    const tensors = [];
    const valid   = [];

    for (const row of batch) {
      const imgPath = findCachedPath(row.imageUrl);

      if (!imgPath) {
        cacheMiss++;
        // Strong keyword match — flag even without image
        const kw = getKeywordMatch(row);
        if (kw && STRONG_KEYWORDS.includes(kw)) {
          flagged.push({
            id: row.id, title: row.title, author: row.author, year: row.year,
            source: row.source, category: row.mainCategory, link: row.link,
            imageUrl: row.imageUrl, keywordMatch: kw, scores: null,
            triggeredBy: [`keyword:${kw}`],
          });
        }
        continue;
      }

      try {
        const { data, info } = await sharp(imgPath)
          .resize(224, 224, { fit: 'fill' })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        tensors.push(tf.tensor3d(new Float32Array(data), [info.height, info.width, info.channels]).div(255.0));
        valid.push(row);
      } catch { errors++; }
    }

    if (tensors.length > 0) {
      try {
        const batchTensor = tf.stack(tensors);
        const predictions = await model.classify(batchTensor, tensors.length);
        batchTensor.dispose();
        tensors.forEach(t => t.dispose());

        for (let j = 0; j < valid.length; j++) {
          const row   = valid[j];
          const preds = Array.isArray(predictions[0]) ? predictions[j] : predictions;
          const scores    = Object.fromEntries(preds.map(p => [p.className, p.probability]));
          const triggered = Object.entries(THRESHOLDS).filter(([cls, thr]) => (scores[cls] || 0) >= thr);
          const kw        = getKeywordMatch(row);
          const strongKw  = kw && STRONG_KEYWORDS.includes(kw);

          if (triggered.length > 0 || strongKw) {
            flagged.push({
              id: row.id, title: row.title, author: row.author, year: row.year,
              source: row.source, category: row.mainCategory, link: row.link,
              imageUrl: row.imageUrl, keywordMatch: kw || null,
              scores: {
                Neutral: +(scores.Neutral||0).toFixed(3),
                Drawing: +(scores.Drawing||0).toFixed(3),
                Sexy:    +(scores.Sexy   ||0).toFixed(3),
                Porn:    +(scores.Porn   ||0).toFixed(3),
                Hentai:  +(scores.Hentai ||0).toFixed(3),
              },
              triggeredBy: [
                ...triggered.map(([cls]) => cls),
                ...(kw ? [`keyword:${kw}`] : []),
              ],
            });
          }
        }
      } catch (err) {
        tensors.forEach(t => { try { t.dispose(); } catch {} });
        errors++;
      }
    }

    scanned += batch.length;

    // Save checkpoint every 5k items
    if (scanned % 5000 < BATCH_SIZE) {
      fs.writeFileSync(OUTPUT, JSON.stringify({
        status: 'in-progress', progress: `${scanned}/${rows.length}`,
        flaggedCount: flagged.length, thresholds: THRESHOLDS, flagged,
      }, null, 2));
    }

    const elapsed  = ((Date.now() - start) / 1000).toFixed(0);
    const pct      = ((scanned / rows.length) * 100).toFixed(1);
    const rate     = scanned / ((Date.now() - start) / 1000);
    const remH     = ((rows.length - scanned) / rate / 3600).toFixed(1);
    process.stdout.write(`\r  ${pct}% (${scanned.toLocaleString()}/${rows.length.toLocaleString()}) | flagged: ${flagged.length} | ${elapsed}s | ~${remH}h left   `);
  }

  console.log('\n');

  fs.writeFileSync(OUTPUT, JSON.stringify({
    scannedAt: new Date().toISOString(), status: 'complete',
    totalScanned: scanned, cacheMiss, errors,
    flaggedCount: flagged.length, thresholds: THRESHOLDS, flagged,
  }, null, 2));

  const totalMin = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`✅ Done in ${totalMin} minutes`);
  console.log(`   Scanned:  ${scanned.toLocaleString()}`);
  console.log(`   Flagged:  ${flagged.length.toLocaleString()}`);
  console.log(`   No cache: ${cacheMiss.toLocaleString()}`);
  console.log(`   Errors:   ${errors}`);
  console.log(`\n📄 Review: scripts/nsfw-flagged.json`);
  console.log(`   Then run: node scripts/nsfw-purge.mjs\n`);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
