import fs from 'fs';
import path from 'path';
import { CategoryMap } from './mapping.js';
import { fetchSourceData } from './fetcher.js';
import { Adapters } from './adapters/index.js';
import { ArchiveItem, MainCategory, SubCategory } from './types.js';

// Source key → prefix used in item IDs (for resume/dedup logic)
const SOURCE_ID_PREFIX: Record<string, string> = {
  met:            'met',
  artic:          'artic',
  va:             'va',
  loc:            'loc',
  rijks:          'rijks',
  harvard:        'harvard',
  europeana:      'europeana',
  wellcome:       'wellcome',
  ia:             'ia',
  rave:           'rave',
  cooper:         'ch',
  wikimedia:      'wiki',
  designreviewed: 'dr',
  letterform:     'lfa',
  smithsonian:    'si',
  nga:            'nga',
  nypl:           'nypl',
  aif:            'aif',
  harvardme:      'harvard-me',
  jstor:          'jstor',
  palarchive:     'pal',
  ada:            'ada',
  auc:            'auc',
  translatio:     'trans',
};

export async function runHarvest(category: string) {
  const configs = CategoryMap[category as keyof typeof CategoryMap];
  if (!configs) {
    const available = Object.keys(CategoryMap).join(', ');
    console.error(`❌ Unknown category "${category}". Available: ${available}`);
    return;
  }

  const mainCat = category as MainCategory;
  const outputPath = path.join(
    process.cwd(), 'public', 'manifests', `${category.toLowerCase()}.json`
  );
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  // Build a set of already-collected item IDs for dedup across all runs
  let manifest: ArchiveItem[] = [];
  const seenIds = new Set<string>();

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as ArchiveItem[];
      manifest = existing;
      for (const item of existing) seenIds.add(item.id);
      console.log(`\n▶ Resuming — ${existing.length} items already in manifest`);
    } catch {
      console.log('Starting fresh.');
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  HARVEST: ${category}  (${configs.length} source configs)`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const config of configs) {
    const adapter = Adapters[config.source];
    if (!adapter) {
      console.warn(`⚠️  No adapter for "${config.source}" — skipping`);
      continue;
    }

    const hint = config.subCategoryHint;
    console.log(`\n📡 ${config.source.toUpperCase()}${hint ? ` [${hint}]` : ''}`);

    try {
      const raw = await fetchSourceData(config.source, config);
      if (!raw.length) {
        console.log(`   → 0 items returned`);
        continue;
      }

      const clean: ArchiveItem[] = [];
      for (const item of raw) {
        let adapted: ArchiveItem | null = null;
        try {
          adapted = adapter(item, mainCat, hint);
        } catch {
          // ignore adapter errors
        }
        if (!adapted || !adapted.imageUrl) continue;
        if (seenIds.has(adapted.id)) continue; // global dedup
        seenIds.add(adapted.id);
        // Always enforce mainCategory from the run.
        // subCategoryHint always wins — it's the mapping-level research for
        // this exact source × params combination. Adapter derivation is only
        // a fallback when no hint is present.
        adapted.mainCategory = mainCat;
        if (hint) adapted.subCategory = hint;
        clean.push(adapted);
      }

      manifest = [...manifest, ...clean];
      const filtered = raw.length - clean.length;
      console.log(`   ✅ ${clean.length} items (${filtered} filtered/duped)`);
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
      console.log(`   💾 Checkpoint (${manifest.length} total)`);
    } catch (err: any) {
      console.error(`   ❌ ${config.source}: ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ DONE: ${manifest.length} items → ${outputPath}`);
  console.log(`${'═'.repeat(60)}\n`);
}
