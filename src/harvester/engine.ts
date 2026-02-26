import fs from 'fs';
import path from 'path';
import { CategoryMap } from './mapping.js';
import { fetchSourceData } from './fetcher.js';
import { Adapters } from './adapters/index.js';
import { ArchiveItem } from './types.js';

export async function runHarvest(category: string) {
  const configs = CategoryMap[category as keyof typeof CategoryMap];
  if (!configs) {
    console.error(`❌ Unknown category "${category}". Available: ${Object.keys(CategoryMap).join(', ')}`);
    return;
  }

  const outputPath = path.join(process.cwd(), 'public', 'manifests', `${category.toLowerCase()}.json`);
  if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let manifest: ArchiveItem[] = [];
  const completedSources = new Set<string>();

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as ArchiveItem[];
      manifest = existing;
      for (const item of existing) completedSources.add(item.id.split('-')[0]);
      console.log(`\n▶ Resuming — ${existing.length} items, completed sources: ${[...completedSources].join(', ')}`);
    } catch { console.log('Starting fresh.'); }
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  HARVEST: ${category}  (${configs.length} sources)`);
  console.log(`${'═'.repeat(55)}\n`);

  for (const config of configs) {
    const adapter = Adapters[config.source];
    if (!adapter) { console.warn(`⚠️  No adapter for "${config.source}"`); continue; }

    // Skip sources already in the manifest (resume logic)
    const prefix = { met:'met',artic:'artic',va:'va',loc:'loc',rijks:'rijks',
      harvard:'harvard',europeana:'europeana',wellcome:'wellcome',ia:'ia',
      rave:'rave',cooper:'ch',wikimedia:'wiki',designreviewed:'dr',
      letterform:'lfa',smithsonian:'si',nga:'nga' }[config.source];
    if (prefix && completedSources.has(prefix)) {
      console.log(`\n⏭  ${config.source.toUpperCase()} — already in manifest, skipping`);
      continue;
    }

    console.log(`\n📡 ${config.source.toUpperCase()}`);

    try {
      const raw = await fetchSourceData(config.source, config);
      if (!raw.length) { console.log(`   → 0 items returned`); continue; }

      const clean: ArchiveItem[] = raw
        .map((item: any) => { try { return adapter(item); } catch { return null; } })
        .filter((item): item is ArchiveItem => !!item?.imageUrl);

      manifest = [...manifest, ...clean];
      console.log(`   ✅ ${clean.length} items (${raw.length - clean.length} filtered)`);
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
      console.log(`   💾 Checkpoint (${manifest.length} total)`);
    } catch (err: any) {
      console.error(`   ❌ ${config.source}: ${err.message}`);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ✅ DONE: ${manifest.length} items → ${outputPath}`);
  console.log(`${'═'.repeat(55)}\n`);
}