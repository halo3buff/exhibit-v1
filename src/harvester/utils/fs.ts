// src/harvester/utils/fs.ts
import * as fs from 'fs';
import * as path from 'path';
// FIX: Added ArchiveItem to the import list
import { RawItem, SourceName, ArchiveItem } from '../types.js';

const RAW_BASE_DIR = path.join(process.cwd(), 'data', 'raw');
const PROCESSED_BASE_DIR = path.join(process.cwd(), 'data', 'processed');

/**
 * Ensures a directory exists.
 */
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

/**
 * Load a raw item for transformation.
 */
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
 * Save a processed ArchiveItem to the manifest.
 */
export function appendProcessedItem(item: ArchiveItem): void {
  ensureDir(PROCESSED_BASE_DIR);
  const manifestPath = path.join(PROCESSED_BASE_DIR, 'manifest.json');
  
  let items: ArchiveItem[] = [];
  if (fs.existsSync(manifestPath)) {
    try {
      items = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn('[FS] Corrupt manifest.json, starting fresh.');
    }
  }
  
  items.push(item);
  fs.writeFileSync(manifestPath, JSON.stringify(items, null, 2), 'utf8');
}

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