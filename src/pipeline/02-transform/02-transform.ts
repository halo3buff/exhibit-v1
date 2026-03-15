// src/scripts/02-transform.ts
// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORM PHASE: Classify raw items → processed ArchiveItems
// Reads: /data/raw/{source}/*.json
// Writes: /data/processed/{source}-{id}.json
// Logs: /data/processed/audit-{source}.json
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
// FIX: types.ts exports SourceName, not Source
import { SourceName } from '../../harvester/types.js';
import { classifyItem, CONFIG } from '../../harvester/engine/classifier.js';
import { listRawFiles, saveProcessedItem, ensureDir } from '../../harvester/utils/fs.js';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');

interface SourceStats {
  total: number;
  accepted: number;
  rejected: number;
  noImage: number;
}

interface TransformStats {
  total: number;
  accepted: number;
  rejected: number;
  scoreSum: number;
  bySource: Record<SourceName, SourceStats>;
  byCategory: Record<string, number>;
}

interface AuditLogEntry {
  id: string | number;
  source: SourceName;
  timestamp: string;
  inputFile: string;
  accepted: boolean;
  score: number;
  reasons: string[];
  title?: string;
}

async function transformSource(source: SourceName, stats: TransformStats): Promise<AuditLogEntry[]> {
  console.log(`\n🔄 Processing ${source.toUpperCase()}...`);

  const files = listRawFiles(source);
  if (files.length === 0) {
    console.log(`   ⊘ No raw files found in /data/raw/${source}/`);
    return [];
  }

  console.log(`   → Found ${files.length} raw files`);

  const auditLog: AuditLogEntry[] = [];

  for (const filePath of files) {
    try {
      const rawItem = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const result = classifyItem(rawItem);

      auditLog.push({
        id: rawItem.id,
        source,
        timestamp: new Date().toISOString(),
        inputFile: filePath,
        accepted: result.accepted,
        score: result.score,
        reasons: result.reasons,
        title: (result.item?.title) || (rawItem.data as Record<string, unknown>)?.title as string,
      });

      stats.total++;
      stats.bySource[source].total++;

      if (result.accepted && result.item) {
        // REJECT items without images — can't display art without an image
        if (!result.item.imageUrl) {
          stats.bySource[source].noImage++;
          stats.rejected++;
          stats.bySource[source].rejected++;
          continue; // Skip saving this item
        }
        
        saveProcessedItem(result.item);
        stats.accepted++;
        stats.bySource[source].accepted++;
        stats.scoreSum += result.score;
      
        const cat = result.item.mainCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

        if (stats.accepted % 100 === 0) {
          console.log(`   ✓ Processed ${stats.accepted} accepted items...`);
        }
      } else {
        stats.rejected++;
        stats.bySource[source].rejected++;
      }

    } catch (e: any) {
      console.warn(`   ⊘ Error processing ${path.basename(filePath)}: ${e.message}`);
      stats.rejected++;
      stats.bySource[source].rejected++;
    }
  }

  const sourceAuditPath = path.join(PROCESSED_DIR, `audit-${source}.json`);
  fs.writeFileSync(sourceAuditPath, JSON.stringify(auditLog, null, 2));

  console.log(`   ✅ ${source}: ${stats.bySource[source].accepted} accepted, ${stats.bySource[source].rejected} rejected`);

  if (source === 'rijks') {
    const rejectedLowScore = auditLog.filter(
      e => !e.accepted && e.reasons.some(r => r.includes('Below threshold'))
    ).length;
    console.log(`   📊 Rijks Debug:`);
    console.log(`      Rejected (low score): ${rejectedLowScore}`);
    console.log(`      💡 Check audit-rijks.json for detailed rejection reasons`);
  }

  return auditLog;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TRANSFORM PHASE — Classifying Raw Items                  ║');
  console.log(`║  Threshold: ${CONFIG.THRESHOLD} | Output: /data/processed/              ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  ensureDir(PROCESSED_DIR);

  const stats: TransformStats = {
    total: 0,
    accepted: 0,
    rejected: 0,
    scoreSum: 0,
    bySource: {
      met:          { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      artic:        { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      va:           { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      rijks:        { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      smithsonian:  { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      cooperhewitt: { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      designarchive: { total: 0, accepted: 0, rejected: 0, noImage: 0 },
      letterformarchive:{ total: 0, accepted: 0, rejected: 0, noImage: 0 },
      designreviewed:{ total: 0, accepted: 0, rejected: 0, noImage: 0 },
    },
    byCategory: {},
  };

  const sources: SourceName[] = ['met', 'artic', 'va', 'rijks', 'smithsonian', 'cooperhewitt'];

  for (const source of sources) {
    await transformSource(source, stats);
  }

  const avgScore  = stats.accepted > 0 ? (stats.scoreSum / stats.accepted).toFixed(1) : '0';
  const acceptPct = stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : '0';

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TRANSFORM COMPLETE                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Overall:`);
  console.log(`   Total:     ${stats.total}`);
  console.log(`   Accepted:  ${stats.accepted} (${acceptPct}%)`);
  console.log(`   Rejected:  ${stats.rejected}`);
  console.log(`   Avg score: ${avgScore}`);

  console.log(`\n📁 By Source:`);
  for (const [src, s] of Object.entries(stats.bySource)) {
    if (s.total === 0) continue;
    const pct = ((s.accepted / s.total) * 100).toFixed(1);
    console.log(`   ${src.padEnd(12)}: ${s.accepted}/${s.total} accepted (${pct}%), ${s.noImage} no image`);
  }

  console.log(`\n🏷️  By Category:`);
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(25)}: ${count}`);
    });

  console.log(`\n📁 Output: /data/processed/ (${stats.accepted} items)`);
  console.log(`   Per-source audit logs: audit-{source}.json`);

  if (stats.rejected > stats.accepted) {
    console.log(`\n💡 High rejection rate — tips:`);
    console.log(`   1. Lower CONFIG.THRESHOLD in classifier.ts (currently ${CONFIG.THRESHOLD})`);
    console.log(`   2. Review audit-{source}.json to see rejection reasons`);
    console.log(`   3. Add missing objectType/medium values to taxonomy mappings`);
  }

  const rijksAccepted = stats.bySource.rijks.accepted;
  if (rijksAccepted > 0) {
    const withImages = rijksAccepted - stats.bySource.rijks.noImage;
    console.log(`\n🖼️  Rijks Image Check:`);
    console.log(`   Items with images: ${withImages}/${rijksAccepted} (${((withImages / rijksAccepted) * 100).toFixed(1)}%)\n`);
  }
}

main().catch(console.error);