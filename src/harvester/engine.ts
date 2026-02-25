import fs from 'fs';
import path from 'path';
import { CategoryMap } from './mapping.js';
import { fetchSourceData } from './fetcher.js';
import { Adapters } from './adapters/index.js';
import { ArchiveItem } from './types.js';

export async function runHarvest(category: string) {
  const configs = CategoryMap[category as keyof typeof CategoryMap];

  if (!configs) {
    console.error(`❌ Category "${category}" not found in mapping.ts`);
    console.log('Available categories:', Object.keys(CategoryMap).join(', '));
    return;
  }

  const outputPath = path.join(
    process.cwd(), 'public', 'manifests', `${category.toLowerCase()}.json`
  );
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Resume: reload any items already saved from a previous partial run
  let globalManifest: ArchiveItem[] = [];
  const completedSources = new Set<string>();

  if (fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as ArchiveItem[];
      globalManifest = existing;
      // Track which source prefixes are already represented
      for (const item of existing) {
        const prefix = item.id.split('-')[0];
        completedSources.add(prefix);
      }
      console.log(`\n▶ Resuming — ${existing.length} items already in manifest`);
    } catch {
      console.log('Could not parse existing manifest, starting fresh.');
    }
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  HARVEST: ${category}  (${configs.length} sources)`);
  console.log(`═══════════════════════════════════════════════════\n`);

  for (const config of configs) {
    const adapter = Adapters[config.source];
    if (!adapter) {
      console.warn(`⚠️  No adapter registered for "${config.source}" — skipping`);
      continue;
    }

    console.log(`\n📡 ${config.source.toUpperCase()} (filterId: ${config.filterId})`);

    try {
      const rawDataArray = await fetchSourceData(config.source, config);

      if (!rawDataArray.length) {
        console.log(`   → 0 raw items returned`);
        continue;
      }

      // Run adapter on each item.
      // Filter out nulls — letterform adapter returns null for rejected posts.
      // Also filter out items with no imageUrl (they'll break the gallery).
      const cleanData: ArchiveItem[] = rawDataArray
        .map((item: any) => {
          try { return adapter(item); }
          catch (e: any) { return null; }
        })
        .filter((item): item is ArchiveItem => item !== null && !!item.imageUrl)
        .map(({ _raw, ...rest }) => rest as ArchiveItem); // strip _raw
      
      const filtered = rawDataArray.length - cleanData.length;
      globalManifest = [...globalManifest, ...cleanData];

      console.log(`   ✅ ${cleanData.length} clean items (${filtered} filtered — no image or rejected)`);

      // Checkpoint after every source — crash safety.
      // If a 3-hour harvest dies on source 8 of 12, you keep items 1–7.
      fs.writeFileSync(outputPath, JSON.stringify(globalManifest, null, 2));
      console.log(`   💾 Checkpoint saved (${globalManifest.length} total so far)`);

    } catch (err: any) {
      console.error(`   ❌ Error harvesting ${config.source}:`, err.message);
    }
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(globalManifest, null, 2));

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  🏁 DONE: ${globalManifest.length} items`);
  console.log(`  📄 ${outputPath}`);
  console.log(`═══════════════════════════════════════════════════\n`);
}
