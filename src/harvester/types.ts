// src/harvester/types.ts

export type SourceName = 'met' | 'artic' | 'va' | 'rijks' | 'smithsonian' | 'cooperhewitt' | 'designarchive';

// ─────────────────────────────────────────────────────────────────────────────
// RAW ITEM — exactly what the API returned, stored as-is in /data/raw/
// ─────────────────────────────────────────────────────────────────────────────
export interface RawItem {
  id:        string | number;
  source:    SourceName;
  fetchedAt: string;
  data:      unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE ITEM — standardized, enriched object in /data/processed/
//
// Optional fields are only populated when the source actually has them.
// Every field maps to a real API field — nothing is fabricated.
// ─────────────────────────────────────────────────────────────────────────────
export interface ArchiveItem {
  // ── Identity ──────────────────────────────────────────────────────────────
  id:     string;       // e.g. "met-12345", "artic-67890"
  source: SourceName;
  link:   string;       // canonical URL to the museum's object page

  // ── Core Display ──────────────────────────────────────────────────────────
  title:    string;
  author:   string;         // artist / maker / designer
  year:     string;         // display string e.g. "1923" or "ca. 1880–1920"
  imageUrl: string | null;  // null = no image, never a placeholder URL

  // ── Classification ────────────────────────────────────────────────────────
  mainCategory: string;   // "Graphic Design" | "Painting" | "Prints & Drawings" | etc.
  subCategory:  string;   // "Posters & Advertising" | "Oil" | "Photograph" | etc.

  // ── Rich Provenance (populated from every available API field) ────────────
  department?:      string;  // museum dept / collection name
  objectType?:      string;  // how the museum classifies the object
  medium?:          string;  // materials & technique
  culture?:         string;  // cultural / geographic origin
  place?:           string;  // place of creation
  dimensions?:      string;  // physical dimensions
  description?:     string;  // curator notes / abstract
  creditLine?:      string;  // acquisition / credit line
  accessionNumber?: string;  // museum's inventory / accession number
  rights?:          string;  // license (CC0, public domain, etc.)
  period?:          string;  // historical period / dynasty / style

  // ── Classifier Audit Trail ────────────────────────────────────────────────
  confidenceScore:       number;
  classificationReasons: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIFICATION RESULT
// ─────────────────────────────────────────────────────────────────────────────
export interface ClassificationResult {
  accepted: boolean;
  score:    number;
  reasons:  string[];
  item?:    ArchiveItem;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH RESULT
// ─────────────────────────────────────────────────────────────────────────────
export interface FetchResult {
  newCount:       number;
  duplicateCount: number;
}