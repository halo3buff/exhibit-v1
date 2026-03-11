// src/harvester/mappings/rijks-taxonomy.ts
// ⚠️ GOLDEN RULE 2: CONFIG-DRIVEN — no if/else logic, just data dictionaries.
//
// Rijks data is now Linked Art JSON-LD (v3 API). Field extraction is handled
// by helpers in classifier.ts. Classification uses two signals:
//
// 1. _harvestType — the `type=` param used during harvest (most reliable)
//    Stored automatically in new harvests by rijks.ts adapter.
//    Falls back to keyword matching for legacy harvested files.
//
// 2. titleKeywords — fallback for files without _harvestType
//
// Image URL: constructed via IIIF from inventory number, OR from
// `representation[0].id` if present in the Linked Art record.

export interface RijksTaxonomyRule {
  subCategory: string;
  score: number;
  keywords?: string[];
}

export const RIJKS_HARVEST_TYPE_SCORES: Record<string, RijksTaxonomyRule> = {
  // Graphic Design
  'affiche': { subCategory: 'Posters & Advertising', score: 25, keywords: ['poster', 'advertisement'] },
  'advertentie': { subCategory: 'Posters & Advertising', score: 22, keywords: ['advertisement'] },
  'letterproef': { subCategory: 'Typography & Lettering', score: 25, keywords: ['type', 'typography'] },
  'belettering': { subCategory: 'Typography & Lettering', score: 22, keywords: ['lettering'] },
  'vignet': { subCategory: 'Identity & Branding', score: 20, keywords: ['logo', 'brand'] },
  'boekillustratie': { subCategory: 'Editorial/Publication', score: 20, keywords: ['book', 'illustration'] },
  'tijdschrift': { subCategory: 'Editorial/Publication', score: 18, keywords: ['magazine', 'journal'] },
  'verpakking': { subCategory: 'Packaging', score: 20, keywords: ['packaging', 'label'] },
  'etiket': { subCategory: 'Packaging', score: 18, keywords: ['label'] },
  
  // Painting
  'schilderij': { subCategory: 'Oil', score: 22, keywords: ['painting', 'oil'] },
  'aquarel': { subCategory: 'Watercolor/Gouache', score: 22, keywords: ['watercolor', 'watercolour'] },
  'gouache': { subCategory: 'Watercolor/Gouache', score: 20, keywords: ['gouache'] },
  'paneel': { subCategory: 'Oil', score: 18, keywords: ['panel', 'wood'] },
  
  // Prints & Drawings
  'prent': { subCategory: 'Etching/Woodcut/Lithograph', score: 20, keywords: ['print'] },
  'ets': { subCategory: 'Etching/Woodcut/Lithograph', score: 22, keywords: ['etching'] },
  'gravure': { subCategory: 'Etching/Woodcut/Lithograph', score: 20, keywords: ['engraving'] },
  'lithografie': { subCategory: 'Etching/Woodcut/Lithograph', score: 22, keywords: ['lithograph'] },
  'houtsnede': { subCategory: 'Etching/Woodcut/Lithograph', score: 22, keywords: ['woodcut'] },
  'tekening': { subCategory: 'Drawings', score: 20, keywords: ['drawing', 'sketch'] },
  'collage': { subCategory: 'Collage', score: 20, keywords: ['collage'] },
  
  // Photography
  'foto': { subCategory: 'Photograph', score: 22, keywords: ['photograph', 'photo'] },
  'daguerreotypie': { subCategory: 'Photograph', score: 25, keywords: ['daguerreotype'] },
  'negatief': { subCategory: 'Photograph', score: 18, keywords: ['negative'] },
  
  // Decorative Arts
  'meubilair': { subCategory: 'Furniture', score: 20, keywords: ['furniture', 'chair', 'table'] },
  'keramiek': { subCategory: 'Ceramics & Glass', score: 20, keywords: ['ceramic', 'pottery'] },
  'glas': { subCategory: 'Ceramics & Glass', score: 20, keywords: ['glass'] },
  'textiel': { subCategory: 'Textiles & Fashion', score: 20, keywords: ['textile', 'fabric'] },
  'kostuum': { subCategory: 'Textiles & Fashion', score: 20, keywords: ['costume', 'dress'] },
  'sieraad': { subCategory: 'Metalwork & Jewelry', score: 20, keywords: ['jewelry', 'jewellery'] },
  'edelmetaal-smidswerk': { subCategory: 'Metalwork & Jewelry', score: 22, keywords: ['metalwork', 'silver', 'gold'] },
  'metaal': { subCategory: 'Metalwork & Jewelry', score: 18, keywords: ['metal'] },
  'porselein': { subCategory: 'Ceramics & Glass', score: 20, keywords: ['porcelain'] },
  'aardewerk': { subCategory: 'Ceramics & Glass', score: 18, keywords: ['earthenware', 'pottery'] },
  'zilverwerk': { subCategory: 'Metalwork & Jewelry', score: 22, keywords: ['silver'] },
  'goud': { subCategory: 'Metalwork & Jewelry', score: 22, keywords: ['gold'] },
} as const;

// Fallback keyword matching for legacy files without _harvestType
export const RIJKS_KEYWORD_SCORES: Array<{
  keywords: string[];
  subCategory: string;
  score: number;
}> = [
  // Graphic Design
  { keywords: ['affiche', 'poster', 'advertisement', 'reclame'], subCategory: 'Posters & Advertising', score: 22 },
  { keywords: ['letterproef', 'typography', 'lettering', 'belettering'], subCategory: 'Typography & Lettering', score: 20 },
  { keywords: ['logo', 'trademark', 'brand', 'vignet', 'merk'], subCategory: 'Identity & Branding', score: 20 },
  { keywords: ['boekillustratie', 'book jacket', 'magazine cover', 'tijdschrift'], subCategory: 'Editorial/Publication', score: 18 },
  { keywords: ['verpakking', 'packaging', 'label', 'etiket'], subCategory: 'Packaging', score: 18 },
  
  // Painting
  { keywords: ['schilderij', 'painting', 'olieverf', 'oil on canvas'], subCategory: 'Oil', score: 20 },
  { keywords: ['aquarel', 'watercolor', 'watercolour'], subCategory: 'Watercolor/Gouache', score: 20 },
  { keywords: ['gouache'], subCategory: 'Watercolor/Gouache', score: 18 },
  { keywords: ['tempera', 'fresco'], subCategory: 'Tempera/Fresco', score: 18 },
  
  // Prints & Drawings
  { keywords: ['prent', 'print', 'printmaking'], subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
  { keywords: ['ets', 'etching'], subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keywords: ['gravure', 'engraving'], subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
  { keywords: ['lithografie', 'lithograph'], subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keywords: ['houtsnede', 'woodcut'], subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keywords: ['tekening', 'drawing', 'sketch', 'study'], subCategory: 'Drawings', score: 20 },
  { keywords: ['collage'], subCategory: 'Collage', score: 20 },
  
  // Photography
  { keywords: ['foto', 'photograph', 'photo', 'photography'], subCategory: 'Photograph', score: 22 },
  { keywords: ['daguerreotype', 'daguerreotypie'], subCategory: 'Photograph', score: 25 },
  { keywords: ['cyanotype', 'cyanotypie'], subCategory: 'Photograph', score: 22 },
  { keywords: ['albumine', 'albumen print'], subCategory: 'Photograph', score: 20 },
  { keywords: ['zilvergelatine', 'gelatin silver'], subCategory: 'Photograph', score: 20 },
  
  // Decorative Arts
  { keywords: ['meubilair', 'furniture', 'chair', 'table', 'cabinet', 'stoel', 'tafel', 'kast'], subCategory: 'Furniture', score: 20 },
  { keywords: ['keramiek', 'ceramic', 'pottery', 'porcelain', 'aardewerk', 'porselein'], subCategory: 'Ceramics & Glass', score: 20 },
  { keywords: ['glas', 'glass', 'venster', 'window'], subCategory: 'Ceramics & Glass', score: 18 },
  { keywords: ['textiel', 'textile', 'fabric', 'stof', 'tapijt', 'tapestry'], subCategory: 'Textiles & Fashion', score: 20 },
  { keywords: ['kostuum', 'costume', 'dress', 'jurk', 'kleding', 'clothing'], subCategory: 'Textiles & Fashion', score: 20 },
  { keywords: ['sieraad', 'jewelry', 'jewellery', 'necklace', 'ring', 'armband'], subCategory: 'Metalwork & Jewelry', score: 20 },
  { keywords: ['metaal', 'metalwork', 'zilver', 'silver', 'goud', 'gold', 'brons', 'bronze'], subCategory: 'Metalwork & Jewelry', score: 20 },
];

export type RijksCategory = keyof typeof RIJKS_HARVEST_TYPE_SCORES;