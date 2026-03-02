// src/harvester/types.ts

export type SourceName = 'met' | 'artic' | 'va' | 'smithsonian' | 'rijks';

// ─────────────────────────────────────────────────────────────────────────────
// 1. RAW ITEM (The "Extract" Contract)
// ─────────────────────────────────────────────────────────────────────────────
// This is exactly what the API returned. No filtering. No transformation.
// We store this as JSON in /data/raw/{source}/{id}.json
export interface RawItem {
  id: string | number;
  source: SourceName;
  fetchedAt: string;
  data: unknown; // The raw API JSON object
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ARCHIVE ITEM (The "Load" Contract)
// ─────────────────────────────────────────────────────────────────────────────
// This is the cleaned, standardized object that goes into your DB / Processed folder.
export interface ArchiveItem {
  id: string;             // Standardized ID (e.g., "met-12345")
  title: string;
  author: string;
  year: string;
  imageUrl: string | null;
  source: SourceName;
  link: string;
  
  // Taxonomy
  mainCategory: string;   // e.g., "Graphic Design"
  subCategory: string;    // e.g., "Posters & Advertising"
  
  // Audit Trail
  confidenceScore: number;
  classificationReasons: string[];
  
  // Optional: Keep a reference to the raw file for debugging
  rawFilePath?: string; 
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLASSIFICATION RESULT (The "Transform" Contract)
// ─────────────────────────────────────────────────────────────────────────────
export interface ClassificationResult {
  accepted: boolean;
  score: number;
  reasons: string[];
  item?: ArchiveItem;
}