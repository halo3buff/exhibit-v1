// src/pipeline/02-transform/02-transform-gallica.ts
import * as fs from 'fs';
import * as path from 'path';
import { SourceName } from '../../harvester/types.js';
import { classifyItem, CONFIG } from '../../harvester/engine/classifier.js';
import { listRawFiles, saveProcessedItem, ensureDir } from '../../harvester/utils/fs.js';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const SOURCE: SourceName = 'gallica';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  GALLICA (BnF) TRANSFORM                                  ║');
  console.log(`║  Threshold: ${CONFIG.THRESHOLD} | Output: /data/processed/           ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  ensureDir(PROCESSED_DIR);

  const files = listRawFiles(SOURCE);
  if (files.length === 0) {
    console.log(`⊘ No raw files found in /data/raw/${SOURCE}/`);
    process.exit(0);
  }
  console.log(`→ Found ${files.length} raw files\n`);

  let total = 0, accepted = 0, rejected = 0, noImage = 0;
  const byCategory: Record<string, number> = {};
  const auditLog: any[] = [];

  for (const filePath of files) {
    try {
      const rawItem = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const result  = classifyItem(rawItem);

      auditLog.push({
        id: rawItem.id, source: SOURCE,
        timestamp: new Date().toISOString(),
        inputFile: filePath,
        accepted: result.accepted,
        score: result.score,
        reasons: result.reasons,
        title: result.item?.title ?? rawItem.title,
      });

      total++;

      if (result.accepted && result.item) {
        if (!result.item.imageUrl) { noImage++; rejected++; continue; }
        saveProcessedItem(result.item);
        accepted++;
        byCategory[result.item.mainCategory] = (byCategory[result.item.mainCategory] || 0) + 1;
        if (accepted % 500 === 0) console.log(`   ✓ ${accepted} accepted...`);
      } else {
        rejected++;
      }
    } catch (e: any) {
      console.warn(`   ⊘ Error: ${path.basename(filePath)}: ${e.message}`);
      rejected++;
    }
  }

  fs.writeFileSync(
    path.join(PROCESSED_DIR, `audit-${SOURCE}.json`),
    JSON.stringify(auditLog, null, 2)
  );

  const pct = total > 0 ? ((accepted / total) * 100).toFixed(1) : '0';
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TRANSFORM COMPLETE                                       ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total    : ${total}`);
  console.log(`   Accepted : ${accepted} (${pct}%)`);
  console.log(`   Rejected : ${rejected}  (no-image: ${noImage})`);
  console.log('\n   By Category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`   ${cat.padEnd(28)} ${n}`));
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
