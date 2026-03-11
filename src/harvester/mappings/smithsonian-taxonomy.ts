// src/harvester/mappings/smithsonian-taxonomy.ts
// ⚠️ GOLDEN RULE 2: CONFIG-DRIVEN — no if/else logic, just data dictionaries.
//
// Smithsonian raw field reference (from working smithsonianAdapter):
//   title:          data.title
//   author:         data.content?.freetext?.name?.[0]?.content
//   year:           data.content?.freetext?.date?.[0]?.content
//   imageUrl:       data.content?.descriptiveNonRepeating?.online_media?.media?.[find type=images]?.content
//   unitCode:       data.unitCode
//   objectType:     data.content?.freetext?.objectType?.[0]?.content
//   department:     data.content?.freetext?.setName?.[find label=Department]?.content

export interface TaxonomyRule {
  subCategory: string;
  score: number;
}

export const SMITHSONIAN_TAXONOMY = {

  graphicDesign: {
    // Cooper Hewitt is THE design museum — strong signal
    unitCodeScores: {
      'CHNDM': 12,  // Cooper Hewitt National Design Museum
    } as Record<string, number>,

    objectTypeScores: {
      'Poster':              { subCategory: 'Posters & Advertising',  score: 22 },
      'Advertisement':       { subCategory: 'Posters & Advertising',  score: 20 },
      'Trade card':          { subCategory: 'Posters & Advertising',  score: 18 },
      'Ephemera':            { subCategory: 'Posters & Advertising',  score: 14 },
      'Commercial art':      { subCategory: 'Posters & Advertising',  score: 16 },
      'Book jacket':         { subCategory: 'Editorial/Publication',   score: 20 },
      'Magazine cover':      { subCategory: 'Editorial/Publication',   score: 20 },
      'Label':               { subCategory: 'Packaging',              score: 18 },
      'Packaging':           { subCategory: 'Packaging',              score: 20 },
      'Type specimen':       { subCategory: 'Typography & Lettering', score: 22 },
      'Lettering':           { subCategory: 'Typography & Lettering', score: 20 },
      'Logo':                { subCategory: 'Identity & Branding',    score: 20 },
      'Trademark':           { subCategory: 'Identity & Branding',    score: 18 },
      'Graphic Design':      { subCategory: 'Posters & Advertising',  score: 20 },
      'Print ephemera':      { subCategory: 'Posters & Advertising',  score: 14 },
      'Broadside':           { subCategory: 'Posters & Advertising',  score: 16 },
      'Chromolithograph':    { subCategory: 'Posters & Advertising',  score: 14 },
    } as Record<string, TaxonomyRule>,

    departmentScores: {
      'Graphic Arts':         14,
      'Graphic Design':       16,
      'Commercial Art':       14,
    } as Record<string, number>,
  },

  painting: {
    unitCodeScores: {
      'SAAM': 10,  // Smithsonian American Art Museum
      'NPG':  10,  // National Portrait Gallery
    } as Record<string, number>,

    objectTypeScores: {
      'Painting':     { subCategory: 'Oil',              score: 20 },
      'Oil painting': { subCategory: 'Oil',              score: 22 },
      'Watercolor':   { subCategory: 'Watercolor/Gouache', score: 20 },
      'Gouache':      { subCategory: 'Watercolor/Gouache', score: 18 },
      'Tempera':      { subCategory: 'Tempera/Fresco',    score: 18 },
      'Miniature':    { subCategory: 'Watercolor/Gouache', score: 14 },
      'Drawings':     { subCategory: 'Watercolor/Gouache', score: 10 }, // SAAM drawings are often painterly
    } as Record<string, TaxonomyRule>,

    departmentScores: {
      'Painting & Sculpture': 12,
      'Paintings':            12,
    } as Record<string, number>,
  },

  printsDrawings: {
    unitCodeScores: {
      'SAAM': 6,
      'CHNDM': 6,
    } as Record<string, number>,

    objectTypeScores: {
      'Print':       { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Drawing':     { subCategory: 'Drawings',                   score: 18 },
      'Etching':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Woodcut':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Lithograph':  { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Engraving':   { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Screenprint': { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Collage':     { subCategory: 'Collage',                    score: 18 },
      'Drawings':    { subCategory: 'Drawings',                   score: 16 },
    } as Record<string, TaxonomyRule>,

    departmentScores: {
      'Prints':       12,
      'Drawings':     12,
      'Graphic Arts': 10,
    } as Record<string, number>,
  },

  photography: {
    unitCodeScores: {
      'SAAM': 6,
      'NPG':  6,
      'NMAH': 6,
    } as Record<string, number>,

    objectTypeScores: {
      'Photograph':    { subCategory: 'Photograph', score: 22 },
      'Photographs':   { subCategory: 'Photograph', score: 22 },
      'Daguerreotype': { subCategory: 'Photograph', score: 22 },
      'Tintype':       { subCategory: 'Photograph', score: 20 },
      'Ambrotype':     { subCategory: 'Photograph', score: 20 },
    } as Record<string, TaxonomyRule>,

    departmentScores: {
      'Photography': 12,
    } as Record<string, number>,
  },

  decorativeArts: {
    unitCodeScores: {
      'CHNDM': 8,  // Cooper Hewitt has strong decorative arts collection
    } as Record<string, number>,

    objectTypeScores: {
      'Ceramic':   { subCategory: 'Ceramics & Glass',    score: 18 },
      'Glass':     { subCategory: 'Ceramics & Glass',    score: 18 },
      'Furniture': { subCategory: 'Furniture',           score: 18 },
      'Textile':   { subCategory: 'Textiles & Fashion',  score: 18 },
      'Costume':   { subCategory: 'Textiles & Fashion',  score: 16 },
      'Metalwork': { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Jewelry':   { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Silver':    { subCategory: 'Metalwork & Jewelry', score: 16 },
    } as Record<string, TaxonomyRule>,

    departmentScores: {
      'Decorative Arts': 12,
      'Applied Arts':    10,
    } as Record<string, number>,
  },

} as const;

export type SmithsonianCategory = keyof typeof SMITHSONIAN_TAXONOMY;