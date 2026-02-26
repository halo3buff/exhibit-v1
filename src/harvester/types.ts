// ─── Main Categories ──────────────────────────────────────────────────────────
export type MainCategory =
  | 'GRAPHIC_DESIGN'
  | 'PHOTOGRAPHY'
  | 'PAINTING'
  | 'PRINTS_AND_DRAWINGS'
  | 'DECORATIVE_ARTS';

// ─── Sub-Categories ───────────────────────────────────────────────────────────
// Every subCategoryHint string in mapping.ts must be one of these.
export type SubCategory =
  // GRAPHIC_DESIGN
  | 'Poster'
  | 'Advertising'
  | 'Typography'
  | 'Editorial'
  | 'Packaging'
  | 'Identity & Branding'
  | 'Graphic Design'       // catch-all for undifferentiated graphic design
  // PHOTOGRAPHY
  | 'Fine Art Photography'
  | 'Documentary'
  | 'Portraiture'
  | 'Photojournalism'
  | 'Experimental Photography'
  | 'Photography'          // catch-all
  // PAINTING
  | 'Oil'
  | 'Watercolor'
  | 'Tempera'
  | 'Gouache'
  | 'Acrylic'
  | 'Fresco'
  | 'Painting'             // catch-all
  // PRINTS_AND_DRAWINGS
  | 'Etching'
  | 'Engraving'
  | 'Woodcut'
  | 'Lithograph'
  | 'Screenprint'
  | 'Monotype'
  | 'Print'                // catch-all for undifferentiated print
  | 'Drawing'
  | 'Collage'
  // DECORATIVE_ARTS
  | 'Ceramics & Glass'
  | 'Furniture'
  | 'Textiles & Fashion'
  | 'Metalwork & Jewelry'
  | 'Decorative Arts';     // catch-all

// ─── SourceConfig ─────────────────────────────────────────────────────────────
export interface SourceConfig {
  source:           string;
  params:           Record<string, any>;
  limit?:           number;
  subCategoryHint?: SubCategory;
}

// ─── ArchiveItem ──────────────────────────────────────────────────────────────
export interface ArchiveItem {
  id:             string;
  title:          string;
  author:         string;
  year:           string;
  imageUrl:       string;
  source:         string;
  link:           string;
  department:     string;
  classification: string;
  medium:         string;
  culture:        string;
  mainCategory?:  MainCategory;
  subCategory?:   SubCategory;
  _raw?:          any;
}
