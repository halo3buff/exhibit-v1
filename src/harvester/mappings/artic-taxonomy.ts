// src/harvester/mappings/artic-taxonomy.ts
// ⚠️ GOLDEN RULE 2: CONFIG-DRIVEN — no if/else logic, just data dictionaries.
// Format mirrors MET_TAXONOMY: score maps keyed by exact API field values.

export interface TaxonomyRule {
  subCategory: string;
  score: number;
}

export const ARTIC_TAXONOMY = {

  graphicDesign: {
    artworkTypeScores: {
      'Graphic Design':       { subCategory: 'Posters & Advertising',  score: 22 },
      'Poster':               { subCategory: 'Posters & Advertising',  score: 22 },
      'Advertisement':        { subCategory: 'Posters & Advertising',  score: 20 },
      'Trade card':           { subCategory: 'Posters & Advertising',  score: 18 },
      'Ephemera':             { subCategory: 'Posters & Advertising',  score: 14 },
      'Commercial art':       { subCategory: 'Posters & Advertising',  score: 16 },
      'Book jacket':          { subCategory: 'Editorial/Publication',   score: 20 },
      'Magazine cover':       { subCategory: 'Editorial/Publication',   score: 20 },
      'Label':                { subCategory: 'Packaging',              score: 18 },
      'Packaging':            { subCategory: 'Packaging',              score: 20 },
      'Type specimen':        { subCategory: 'Typography & Lettering', score: 22 },
      'Lettering':            { subCategory: 'Typography & Lettering', score: 20 },
      'Logo':                 { subCategory: 'Identity & Branding',    score: 20 },
      'Trademark':            { subCategory: 'Identity & Branding',    score: 18 },
      'Broadside':            { subCategory: 'Posters & Advertising',  score: 16 },
      'Handbill':             { subCategory: 'Posters & Advertising',  score: 14 },
      'Postcard':             { subCategory: 'Posters & Advertising',  score: 12 },
    } as Record<string, TaxonomyRule>,

    classificationScores: {
      'Graphic Design':          20,
      'Commercial Art':          18,
      'Visual Communication':    18,
      'Architecture and Design': 12,
      'Print Ephemera':          10,
      'Typography':              16,
      'Advertising Art':         16,
      'Design':                  10,
    } as Record<string, number>,

    departmentScores: {
      'Architecture and Design': 10,
    } as Record<string, number>,
  },

  painting: {
    artworkTypeScores: {
      'Painting':      { subCategory: 'Oil',              score: 20 },
      'Oil Painting':  { subCategory: 'Oil',              score: 22 },
      'Watercolor':    { subCategory: 'Watercolor/Gouache', score: 20 },
      'Gouache':       { subCategory: 'Watercolor/Gouache', score: 18 },
      'Tempera':       { subCategory: 'Tempera/Fresco',    score: 18 },
      'Fresco':        { subCategory: 'Tempera/Fresco',    score: 18 },
      'Miniature':     { subCategory: 'Watercolor/Gouache', score: 14 },
      'Portrait':      { subCategory: 'Oil',              score: 12 },
    } as Record<string, TaxonomyRule>,

    classificationScores: {
      'Paintings':              18,
      'European Paintings':     16,
      'American Paintings':     16,
      'Modern Paintings':       14,
      'Contemporary Paintings': 14,
    } as Record<string, number>,

    departmentScores: {
      'Painting and Sculpture of Europe': 10,
      'Modern and Contemporary Art':       8,
    } as Record<string, number>,

    mediumScores: {
      'Oil on canvas': 20,
      'Oil on panel':  18,
      'Oil on wood':   18,
    } as Record<string, number>,
  },

  printsDrawings: {
    artworkTypeScores: {
      'Print':       { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Drawing':     { subCategory: 'Drawings',                   score: 18 },
      'Sketch':      { subCategory: 'Drawings',                   score: 16 },
      'Study':       { subCategory: 'Drawings',                   score: 14 },
      'Etching':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Woodcut':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Lithograph':  { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Engraving':   { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Screenprint': { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Collage':     { subCategory: 'Collage',                    score: 18 },
      'Aquatint':    { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Mezzotint':   { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Drypoint':    { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
    } as Record<string, TaxonomyRule>,

    classificationScores: {
      'Prints':         16,
      'Drawings':       16,
      'Printmaking':    12,
      'Graphic Arts':   10,
      'Works on Paper': 10,
    } as Record<string, number>,

    departmentScores: {
      'Prints and Drawings': 10,
    } as Record<string, number>,
  },

  photography: {
    artworkTypeScores: {
      'Photograph':    { subCategory: 'Photograph', score: 22 },
      'Daguerreotype': { subCategory: 'Photograph', score: 22 },
      'Tintype':       { subCategory: 'Photograph', score: 20 },
      'Cyanotype':     { subCategory: 'Photograph', score: 20 },
    } as Record<string, TaxonomyRule>,

    classificationScores: {
      'Photographs':          18,
      'Photography':          16,
      'Photographic Prints':  14,
    } as Record<string, number>,

    departmentScores: {
      'Photography and Media': 12,
    } as Record<string, number>,
  },

  decorativeArts: {
    artworkTypeScores: {
      'Ceramic':   { subCategory: 'Ceramics & Glass',    score: 18 },
      'Glass':     { subCategory: 'Ceramics & Glass',    score: 18 },
      'Furniture': { subCategory: 'Furniture',           score: 18 },
      'Textile':   { subCategory: 'Textiles & Fashion',  score: 18 },
      'Costume':   { subCategory: 'Textiles & Fashion',  score: 16 },
      'Metalwork': { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Jewelry':   { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Tapestry':  { subCategory: 'Textiles & Fashion',  score: 16 },
    } as Record<string, TaxonomyRule>,

    classificationScores: {
      'Decorative Arts': 14,
      'Applied Arts':    12,
      'Design':          10,
      'Craft':           10,
    } as Record<string, number>,

    departmentScores: {
      'Applied Arts of Europe':        10,
      'American Decorative Arts':       10,
      'Architecture and Design':         8,
    } as Record<string, number>,
  },

} as const;

export type ArticCategory = keyof typeof ARTIC_TAXONOMY;