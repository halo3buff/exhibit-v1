// src/scripts/harvest-cooperhewitt.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
dotenv.config({ path: '.env.local' });
// ─────────────────────────────────────────────────────────────────────────────
// COOPER HEWITT HARVEST — No API key required
//
// Cooper Hewitt published their ENTIRE collection (120k+ objects) as CC0
// public domain JSON files on GitHub:
//   https://github.com/cooperhewitt/collection
//
// Strategy:
//   1. git clone --depth=1 the repo into a temp dir (one-time, ~2GB)
//   2. Walk all objects/**/*.json files
//   3. Filter to department_id 35347493 = "Drawings, Prints, and Graphic Design"
//   4. Extract image URLs from the `images` array
//   5. Save matching records to data/raw/cooperhewitt/
//
// On subsequent runs the clone is skipped if the dir already exists.
// Delete /tmp/ch-collection to force a fresh clone.
// ─────────────────────────────────────────────────────────────────────────────

const CLONE_DIR  = path.join('tmp', 'ch-collection');
const REPO_URL   = 'https://github.com/cooperhewitt/collection.git';
const OUT_DIR    = path.join('data', 'raw', 'cooperhewitt');
const DEPT_ID    = '35347493'; // Drawings, Prints, and Graphic Design

// Image URL builder — Cooper Hewitt uses this CDN pattern
function getImageUrl(images: any[]): string {
  if (!images || images.length === 0) return '';
  const img = images[0];
  // Prefer 'b' (large), fall back to 'z', then 'n' (thumbnail)
  return img.b?.url ?? img.z?.url ?? img.n?.url ?? '';
}

function walkDir(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  COOPER HEWITT HARVEST — GitHub Open Data (No API Key)   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync('tmp', { recursive: true });

  // ── Step 1: Clone repo if not already present ─────────────────────────────
  const objectsDir = path.join(CLONE_DIR, 'objects');
  if (fs.existsSync(objectsDir)) {
    console.log('   ✓ Repo already cloned — skipping clone');
    console.log(`   (Delete ${CLONE_DIR} to force a fresh clone)\n`);
  } else {
    console.log('   Cloning Cooper Hewitt collection from GitHub...');
    console.log('   (This is a large repo — may take several minutes)\n');
    execSync(
      `git clone --depth=1 --filter=blob:none --sparse ${REPO_URL} ${CLONE_DIR}`,
      { stdio: 'inherit' }
    );
    execSync(`git -C ${CLONE_DIR} sparse-checkout set objects`, { stdio: 'inherit' });
    console.log('\n   ✓ Clone complete\n');
  }

  // ── Step 2: Walk all object JSON files ────────────────────────────────────
  console.log('   Scanning object files...');
  const allFiles = walkDir(objectsDir);
  console.log(`   Found ${allFiles.length.toLocaleString()} total object files\n`);

  // Track already-seen IDs
  const seenPath = path.join(OUT_DIR, '.seen-ids.json');
  const seen: Set<string> = new Set(
    fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath, 'utf8')) : []
  );

  let newCount    = 0;
  let dupeCount   = 0;
  let noImgCount  = 0;
  let wrongDept   = 0;
  let fileIndex   = seen.size;

  // ── Step 3: Filter & save ─────────────────────────────────────────────────
  for (const filePath of allFiles) {
    let obj: any;
    try {
      obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      continue; // skip malformed files
    }

    // Filter to GD department only
    if (obj.department_id !== DEPT_ID) { wrongDept++; continue; }

    const id = `cooperhewitt-${obj.id}`;
    if (seen.has(id)) { dupeCount++; continue; }

    const imageUrl = getImageUrl(obj.images ?? []);
    if (!imageUrl) { noImgCount++; continue; }

    const record = {
      id,
      source:      'cooperhewitt',
      title:       obj.title ?? '',
      description: obj.description ?? '',
      medium:      obj.medium ?? '',
      date:        obj.date ?? '',
      imageUrl,
      url:         `https://collection.cooperhewitt.org/objects/${obj.id}/`,
      department:  'Drawings, Prints, and Graphic Design',
      objectType:  obj.type_id ?? '',
      raw:         obj,
    };

    seen.add(id);
    const outPath = path.join(OUT_DIR, `cooperhewitt-${String(fileIndex++).padStart(6, '0')}.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    newCount++;

    if (newCount % 1000 === 0) {
      console.log(`   ${newCount.toLocaleString()} saved...`);
      fs.writeFileSync(seenPath, JSON.stringify([...seen])); // checkpoint
    }
  }

  fs.writeFileSync(seenPath, JSON.stringify([...seen]));

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total files scanned       : ${allFiles.length.toLocaleString()}`);
  console.log(`   Wrong department (skipped): ${wrongDept.toLocaleString()}`);
  console.log(`   No image (skipped)        : ${noImgCount.toLocaleString()}`);
  console.log(`   Duplicates (skipped)      : ${dupeCount.toLocaleString()}`);
  console.log(`   ✅ New items saved         : ${newCount.toLocaleString()}`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('   Next steps:');
  console.log('     npm run transform');
  console.log('     npm run load');
  console.log('     node src/scripts/reclassify-from-raw.mjs --commit');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);