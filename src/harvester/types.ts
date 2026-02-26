export interface SourceConfig {
  source:     string;
  params:     Record<string, any>;  // all fetch params live here — q, type, id_category, etc.
  limit?:     number;
}
export interface ArchiveItem {
    id: string;            // e.g., "met-123" or "rave-techno-99"
    title: string;
    author: string;
    year: string;
    imageUrl: string;
    source: string;        // e.g., "The Met", "Rave Preservation Project"
    link: string;          // Direct link to the source page
    department: string;    // e.g., "Graphic Design", "Photography"
    classification: string;// e.g., "Poster", "Flyer", "Magazine"
    medium: string;        // e.g., "Ink on Paper", "Silver Gelatin"
    culture: string;       // e.g., "Egyptian", "Japanese", "Techno Subculture"
    _raw?: any;            // Optional: Store the original messy data just in case
  }