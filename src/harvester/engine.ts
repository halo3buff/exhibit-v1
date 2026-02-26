import fs from 'fs';
import path from 'path';
import { CategoryMap } from './mapping.js';
import { fetchSourceData } from './fetcher.js';
import { Adapters } from './adapters/index.js';
import { ArchiveItem, SourceConfig, MainCategory, SubCategory } from './types.js';

export async function runHarvest(category: string) {
  const configs = CategoryMap[category as keyof typeof CategoryMap];
  if (!configs) {
    console.error(`❌ Unknown category "${category}". Valid: ${Object.keys(CategoryMap).join(', ')}`);
    process.exit(1);
  }

  const mainCategory = category as MainCategory;
  const outputPath   = path.join(process.cwd(), 'public', 'manifests', `${category.toLowerCase()}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Progress sidecar — tracks which source+params configs are done so we can resume
  const progressPath = outputPath.replace('.json', '.progress.json');
  const completedKeys = new Set<string>(
    fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : []
  );

  let manifest: ArchiveItem[] = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : [];

  if (manifest.length) console.log(`▶ Resuming — ${manifest.length} items already in manifest`);

  const configKey = (c: SourceConfig) => `${c.source}::${JSON.stringify(c.params)}`;
  const saveProgress = () => fs.writeFileSync(progressPath, JSON.stringify([...completedKeys]));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  HARVEST: ${category}  (${configs.length} source-configs)`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const config of configs) {
    const key   = configKey(config);
    const label = `${config.source.toUpperCase()} [${config.subCategoryHint || config.source}]`;

    if (completedKeys.has(key)) {
      console.log(`⏭  ${label} — already done`);
      continue;
    }

    const adapter = Adapters[config.source];
    if (!adapter) { console.warn(`⚠️  No adapter for "${config.source}"`); continue; }

    console.log(`\n📡 ${label}`);

    try {
      const raw = await fetchSourceData(config.source, config);

      if (!raw.length) {
        console.log(`   → 0 items returned`);
        completedKeys.add(key);
        saveProgress();
        continue;
      }

      const clean: ArchiveItem[] = raw
        .map((item: any) => {
          try {
            // Pass mainCategory and subCategoryHint to every adapter
            const mapped = adapter(item, mainCategory, config.subCategoryHint as SubCategory);
            if (!mapped) return null;
            // Belt-and-suspenders: stamp both fields from config
            mapped.mainCategory = mainCategory;
            if (config.subCategoryHint) mapped.subCategory = config.subCategoryHint as SubCategory;
            return mapped;
          } catch { return null; }
        })
        .filter((item): item is ArchiveItem => !!item?.imageUrl);

      manifest = [...manifest, ...clean];
      const filtered = raw.length - clean.length;

      console.log(`   ✅ ${clean.length} items  (${filtered} filtered — no image / adapter error)`);

      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
      completedKeys.add(key);
      saveProgress();
      console.log(`   💾 Checkpoint: ${manifest.length} total`);

    } catch (err: any) {
      console.error(`   ❌ ${config.source}: ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ✅ DONE: ${manifest.length} items → ${path.basename(outputPath)}`);
  console.log(`${'═'.repeat(60)}\n`);
}
