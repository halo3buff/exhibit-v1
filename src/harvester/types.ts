// ─── types.ts ────────────────────────────────────────────────────────────────
// Core types for the Exhibit harvester system.
//
// MAIN CATEGORIES (the 5 run targets):
//   GRAPHIC_DESIGN | PHOTOGRAPHY | PAINTING | PRINTS_AND_DRAWINGS | DECORATIVE_ARTS
//
// Each ArchiveItem carries both its mainCategory (which harvest run produced it)
// and a subCategory (the precise classification within that category).
// ─────────────────────────────────────────────────────────────────────────────

export type MainCategory =
  | 'GRAPHIC_DESIGN'
  | 'PHOTOGRAPHY'
  | 'PAINTING'
  | 'PRINTS_AND_DRAWINGS'
  | 'DECORATIVE_ARTS';

export type SubCategory =
  // Graphic Design
  | 'Poster' | 'Advertising' | 'Typography' | 'Identity & Branding'
  | 'Editorial' | 'Packaging' | 'Graphic Design'
  // Photography
  | 'Fine Art Photography' | 'Documentary' | 'Portraiture'
  | 'Experimental' | 'Photojournalism' | 'Photography'
  // Painting
  | 'Oil' | 'Watercolor' | 'Acrylic' | 'Tempera' | 'Gouache' | 'Fresco' | 'Painting'
  // Prints & Drawings
  | 'Etching' | 'Woodcut' | 'Engraving' | 'Screenprint' | 'Lithograph'
  | 'Drawing' | 'Collage' | 'Monotype' | 'Print'
  // Decorative Arts
  | 'Ceramics & Glass' | 'Furniture' | 'Textiles & Fashion'
  | 'Metalwork & Jewelry' | 'Decorative Arts';

export interface SourceConfig {
  source:           string;
  params:           Record<string, any>;
  limit?:           number;
  subCategoryHint?: SubCategory;
}

export interface ArchiveItem {
  id:             string;
  title:          string;
  author:         string;
  year:           string;
  imageUrl:       string;
  source:         string;
  link:           string;
  mainCategory:   MainCategory;
  subCategory:    SubCategory;
  department:     string;
  classification: string;
  medium:         string;
  culture:        string;
  _raw?:          any;
}
