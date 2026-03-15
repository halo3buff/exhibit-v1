// src/scripts/02-transform-designarchive.ts
// ─────────────────────────────────────────────────────────────────────────────
// TRANSFORM PHASE: Classify designarchive raw items → processed ArchiveItems
// Reads: /data/raw/designarchive/*.json
// Writes: /data/processed/designarchive-{id}.json
// Logs: /data/processed/audit-designarchive.json
// ─────────────────────────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import { SourceName } from '../../harvester/types.js';
import { classifyItem, CONFIG } from '../../harvester/engine/classifier.js';
import { listRawFiles, saveProcessedItem, ensureDir } from '../../harvester/utils/fs.js';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const SOURCE: SourceName = 'designarchive';

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

async function transformDesignArchive(stats: TransformStats): Promise<AuditLogEntry[]> {
  console.log(`\n🔄 Processing ${SOURCE.toUpperCase()}...`);
  
  const files = listRawFiles(SOURCE);
  if (files.length === 0) {
    console.log(`⊘ No raw files found in /data/raw/${SOURCE}/`);
    return [];
  }
  
  console.log(`→ Found ${files.length} raw files`);
  
  const auditLog: AuditLogEntry[] = [];
  
  for (const filePath of files) {
    try {
      const rawItem = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const result = classifyItem(rawItem);
      
      auditLog.push({
        id: rawItem.id,
        source: SOURCE,
        timestamp: new Date().toISOString(),
        inputFile: filePath,
        accepted: result.accepted,
        score: result.score,
        reasons: result.reasons,
        title: (result.item?.title) || (rawItem.data as Record<string, unknown>)?.title as string,
      });
      
      stats.total++;
      stats.bySource[SOURCE].total++;
      
      if (result.accepted && result.item) {
        // REJECT items without images — can't display art without an image
        if (!result.item.imageUrl) {
          stats.bySource[SOURCE].noImage++;
          stats.rejected++;
          stats.bySource[SOURCE].rejected++;
          continue;
        }
        
        saveProcessedItem(result.item);
        stats.accepted++;
        stats.bySource[SOURCE].accepted++;
        stats.scoreSum += result.score;
        
        const cat = result.item.mainCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
        
        if (stats.accepted % 100 === 0) {
          console.log(`   ✓ Processed ${stats.accepted} accepted items...`);
        }
      } else {
        stats.rejected++;
        stats.bySource[SOURCE].rejected++;
      }
      
    } catch (e: any) {
      console.warn(`   ⊘ Error processing ${path.basename(filePath)}: ${e.message}`);
      stats.rejected++;
      stats.bySource[SOURCE].rejected++;
    }
  }
  
  const sourceAuditPath = path.join(PROCESSED_DIR, `audit-${SOURCE}.json`);
  fs.writeFileSync(sourceAuditPath, JSON.stringify(auditLog, null, 2));
  
  console.log(`✅ ${SOURCE}: ${stats.bySource[SOURCE].accepted} accepted, ${stats.bySource[SOURCE].rejected} rejected`);
  
  return auditLog;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  DESIGN ARCHIVE TRANSFORM — Classifying Raw Items        ║');
  console.log(`║ Threshold: ${CONFIG.THRESHOLD} | Output: /data/processed/ ║`);
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
      designarchive:{ total: 0, accepted: 0, rejected: 0, noImage: 0 },
      letterformarchive:{ total: 0, accepted: 0, rejected: 0, noImage: 0 },
      designreviewed:{ total: 0, accepted: 0, rejected: 0, noImage: 0 },
    },
    byCategory: {},
  };
  
  await transformDesignArchive(stats);
  
  const avgScore  = stats.accepted > 0 ? (stats.scoreSum / stats.accepted).toFixed(1) : '0';
  const acceptPct = stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : '0';
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TRANSFORM COMPLETE                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Overall:`);
  console.log(`Total: ${stats.total}`);
  console.log(`Accepted: ${stats.accepted} (${acceptPct}%)`);
  console.log(`Rejected: ${stats.rejected}`);
  console.log(`Avg score: ${avgScore}`);
  
  console.log(`\n📁 By Source:`);
  const s = stats.bySource[SOURCE];
  if (s.total > 0) {
    const pct = ((s.accepted / s.total) * 100).toFixed(1);
    console.log(`${SOURCE.padEnd(12)}: ${s.accepted}/${s.total} accepted (${pct}%), ${s.noImage} no image`);
  }
  
  console.log(`\n🏷️ By Category:`);
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`${cat.padEnd(25)}: ${count}`);
    });
  
  console.log(`\n📁 Output: /data/processed/ (${stats.accepted} items)`);
  console.log(`Audit log: audit-designarchive.json`);
  
  if (stats.rejected > stats.accepted) {
    console.log(`\n💡 High rejection rate — tips:`);
    console.log(`1. Lower CONFIG.THRESHOLD in classifier.ts (currently ${CONFIG.THRESHOLD})`);
    console.log(`2. Review audit-designarchive.json to see rejection reasons`);
    console.log(`3. Add missing discipline/format values to taxonomy mappings`);
  }
}

main().catch(console.error);