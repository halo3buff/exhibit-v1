// src/harvester/mappings/va-taxonomy.ts
// ⚠️ GOLDEN RULE 2: CONFIG-DRIVEN — no if/else logic, just data dictionaries.
//
// V&A raw field reference (from working vaAdapter):
//   title:          data._primaryTitle
//   author:         data._primaryMaker?.name
//   year:           data._primaryDate
//   imageUrl:       data._images?.iiif_url  OR  data._images?._primary_thumbnail
//   classification: data.objectType  OR  data._primaryCategory
//   id:             data.systemNumber

export interface TaxonomyRule {
  subCategory: string;
  score: number;
}

export const VA_TAXONOMY = {

  graphicDesign: {
    objectTypeScores: {
      'Poster':               { subCategory: 'Posters & Advertising',  score: 22 },
      'Advertisement':        { subCategory: 'Posters & Advertising',  score: 20 },
      'Showcard':             { subCategory: 'Posters & Advertising',  score: 18 },
      'Trade card':           { subCategory: 'Posters & Advertising',  score: 18 },
      'Book jacket':          { subCategory: 'Editorial/Publication',   score: 20 },
      'Book cover':           { subCategory: 'Editorial/Publication',   score: 18 },
      'Magazine':             { subCategory: 'Editorial/Publication',   score: 16 },
      'Periodical':           { subCategory: 'Editorial/Publication',   score: 14 },
      'Label':                { subCategory: 'Packaging',              score: 18 },
      'Packaging':            { subCategory: 'Packaging',              score: 20 },
      'Wrapper':              { subCategory: 'Packaging',              score: 16 },
      'Type specimen':        { subCategory: 'Typography & Lettering', score: 22 },
      'Lettering':            { subCategory: 'Typography & Lettering', score: 20 },
      'Alphabet':             { subCategory: 'Typography & Lettering', score: 16 },
      'Logo':                 { subCategory: 'Identity & Branding',    score: 20 },
      'Trademark':            { subCategory: 'Identity & Branding',    score: 18 },
      'Logotype':             { subCategory: 'Identity & Branding',    score: 18 },
      'Broadside':            { subCategory: 'Posters & Advertising',  score: 14 },
      'Handbill':             { subCategory: 'Posters & Advertising',  score: 14 },
      'Ephemera':             { subCategory: 'Posters & Advertising',  score: 12 },
      'Menu':                 { subCategory: 'Editorial/Publication',   score: 14 },
      'Programme':            { subCategory: 'Editorial/Publication',   score: 14 },
      'Postcard':             { subCategory: 'Posters & Advertising',  score: 12 },
    } as Record<string, TaxonomyRule>,

    categoryScores: {
      'Graphic Design':       16,
      'Commercial Art':       14,
      'Visual Communication': 14,
      'Typography':           14,
      'Advertising':          12,
      'Printing':             10,
    } as Record<string, number>,
  },

  painting: {
    objectTypeScores: {
      'Oil painting':        { subCategory: 'Oil',              score: 22 },
      'Watercolour':         { subCategory: 'Watercolor/Gouache', score: 20 },
      'Watercolor':          { subCategory: 'Watercolor/Gouache', score: 20 },
      'Gouache':             { subCategory: 'Watercolor/Gouache', score: 18 },
      'Tempera':             { subCategory: 'Tempera/Fresco',    score: 18 },
      'Wall painting':       { subCategory: 'Tempera/Fresco',    score: 16 },
      'Fresco':              { subCategory: 'Tempera/Fresco',    score: 18 },
      'Miniature painting':  { subCategory: 'Watercolor/Gouache', score: 16 },
      'Painting':            { subCategory: 'Oil',              score: 16 },
    } as Record<string, TaxonomyRule>,

    categoryScores: {
      'Paintings': 14,
      'Painting':  12,
    } as Record<string, number>,
  },

  printsDrawings: {
    objectTypeScores: {
      'Print':       { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Etching':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Engraving':   { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Woodcut':     { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Lithograph':  { subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
      'Screenprint': { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Mezzotint':   { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Aquatint':    { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Drypoint':    { subCategory: 'Etching/Woodcut/Lithograph', score: 18 },
      'Drawing':     { subCategory: 'Drawings',                   score: 18 },
      'Sketch':      { subCategory: 'Drawings',                   score: 16 },
      'Study':       { subCategory: 'Drawings',                   score: 14 },
      'Collage':     { subCategory: 'Collage',                    score: 18 },
    } as Record<string, TaxonomyRule>,

    categoryScores: {
      'Prints':       14,
      'Drawings':     14,
      'Printmaking':  12,
    } as Record<string, number>,
  },

  photography: {
    objectTypeScores: {
      'Photograph':     { subCategory: 'Photograph', score: 22 },
      'Daguerreotype':  { subCategory: 'Photograph', score: 22 },
      'Calotype':       { subCategory: 'Photograph', score: 20 },
      'Cyanotype':      { subCategory: 'Photograph', score: 20 },
      'Albumen print':  { subCategory: 'Photograph', score: 18 },
      'Carte de visite':{ subCategory: 'Photograph', score: 18 },
      'Cabinet card':   { subCategory: 'Photograph', score: 18 },
      'Lantern slide':  { subCategory: 'Photograph', score: 16 },
      'Stereograph':    { subCategory: 'Photograph', score: 16 },
    } as Record<string, TaxonomyRule>,

    categoryScores: {
      'Photographs':   14,
      'Photography':   12,
    } as Record<string, number>,
  },

  decorativeArts: {
    objectTypeScores: {
      'Ceramic':     { subCategory: 'Ceramics & Glass',    score: 18 },
      'Pottery':     { subCategory: 'Ceramics & Glass',    score: 16 },
      'Porcelain':   { subCategory: 'Ceramics & Glass',    score: 18 },
      'Glass':       { subCategory: 'Ceramics & Glass',    score: 18 },
      'Tile':        { subCategory: 'Ceramics & Glass',    score: 14 },
      'Furniture':   { subCategory: 'Furniture',           score: 18 },
      'Chair':       { subCategory: 'Furniture',           score: 16 },
      'Table':       { subCategory: 'Furniture',           score: 16 },
      'Cabinet':     { subCategory: 'Furniture',           score: 16 },
      'Textile':     { subCategory: 'Textiles & Fashion',  score: 18 },
      'Tapestry':    { subCategory: 'Textiles & Fashion',  score: 18 },
      'Lace':        { subCategory: 'Textiles & Fashion',  score: 14 },
      'Dress':       { subCategory: 'Textiles & Fashion',  score: 16 },
      'Costume':     { subCategory: 'Textiles & Fashion',  score: 16 },
      'Metalwork':   { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Silver':      { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Jewelry':     { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Jewellery':   { subCategory: 'Metalwork & Jewelry', score: 18 },
      'Necklace':    { subCategory: 'Metalwork & Jewelry', score: 16 },
      'Ring':        { subCategory: 'Metalwork & Jewelry', score: 14 },
    } as Record<string, TaxonomyRule>,

    categoryScores: {
      'Ceramics':       12,
      'Glass':          12,
      'Furniture':      12,
      'Textiles':       12,
      'Metalwork':      12,
      'Jewellery':      12,
      'Decorative Art': 10,
    } as Record<string, number>,
  },

} as const;

export type VaCategory = keyof typeof VA_TAXONOMY;