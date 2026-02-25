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
    return;
  }

  let globalManifest: ArchiveItem[] = [];

  for (const config of configs) {
    try {
      console.log(`📡 Fetching: ${config.source}...`);
      const rawDataArray = await fetchSourceData(config.source, config);
      
      const adapter = Adapters[config.source];
      if (!adapter) {
        console.warn(`⚠️ No adapter found for ${config.source}. Skipping.`);
        continue;
      }

      const cleanData = rawDataArray.map((item: any) => adapter(item));
      globalManifest = [...globalManifest, ...cleanData];
      
      console.log(`✅ Processed ${cleanData.length} items from ${config.source}`);
    } catch (err) {
      console.error(`❌ Error harvesting ${config.source}:`, err);
    }
  }

  const outputPath = path.join(process.cwd(), 'public', 'manifests', `${category.toLowerCase()}.json`);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(globalManifest, null, 2));
  console.log(`🏁 Harvest Complete! ${globalManifest.length} items saved to ${outputPath}`);
}