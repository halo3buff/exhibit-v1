// src/harvester/utils/fs.ts
import * as fs from 'fs';
import * as path from 'path';
import { RawItem, SourceName, ArchiveItem } from '../types.js';

const RAW_BASE_DIR = path.join(process.cwd(), 'data', 'raw');
const PROCESSED_BASE_DIR = path.join(process.cwd(), 'data', 'processed');

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * GOLDEN RULE 1: Save RAW data immediately.
 * Never filter content here. Just dump the JSON.
 */
export function saveRawItem(source: SourceName, id: string | number, data: unknown): string {
  const sourceDir = path.join(RAW_BASE_DIR, source);
  ensureDir(sourceDir);
  
  const filePath = path.join(sourceDir, `${id}.json`);
  
  const rawItem: RawItem = {
    id,
    source,
    fetchedAt: new Date().toISOString(),
    data
  };

  fs.writeFileSync(filePath, JSON.stringify(rawItem, null, 2), 'utf8');
  return filePath;
}

export function loadRawItem(source: SourceName, id: string | number): RawItem | null {
  const filePath = path.join(RAW_BASE_DIR, source, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as RawItem;
  } catch (e) {
    console.error(`[FS] Error reading ${filePath}:`, e);
    return null;
  }
}

/**
 * ✅ FIX (BUG 6 - PERFORMANCE): The old version read the entire manifest.json,
 * pushed one item, and wrote the whole file back — O(n²) for 10,000+ items.
 * A 10k-item harvest would spend more time on disk I/O than on HTTP.
 *
 * NEW APPROACH: Each processed item is saved as its own file:
 *   /data/processed/{source}-{id}.json
 *
 * The build-database.js (Load stage) then reads all files in /data/processed/
 * with fs.readdirSync() and inserts them into SQLite in one pass. This is
 * O(n) total, and you don't lose partial progress if a run crashes midway.
 */
export function saveProcessedItem(item: ArchiveItem): void {
  ensureDir(PROCESSED_BASE_DIR);
  const filePath = path.join(PROCESSED_BASE_DIR, `${item.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf8');
}

/**
 * Legacy function name kept as alias so existing transform scripts don't break.
 * Points to the new per-file implementation.
 */
export const appendProcessedItem = saveProcessedItem;

/**
 * List all raw files for a source (for the Transform step).
 */
export function listRawFiles(source: SourceName): string[] {
  const sourceDir = path.join(RAW_BASE_DIR, source);
  if (!fs.existsSync(sourceDir)) return [];
  
  return fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(sourceDir, f));
}

/**
 * List all processed files (for the Load step / build-database.js).
 */
export function listProcessedFiles(): string[] {
  if (!fs.existsSync(PROCESSED_BASE_DIR)) return [];
  return fs.readdirSync(PROCESSED_BASE_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => path.join(PROCESSED_BASE_DIR, f));
}