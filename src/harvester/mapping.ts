import { SourceConfig } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY MAP
//
// params{} contains the exact API query parameters for each source × category.
// The fetcher reads these directly — no hardcoded category logic in fetcher.ts.
//
// CONFIRMED TAXONOMY (verified against each API's docs/thesaurus):
//
//  Source      │ Field              │ Poster value     │ Notes
//  ────────────┼────────────────────┼──────────────────┼──────────────────────
//  MET         │ q (search)         │ "poster"         │ /search?q=poster
//  ARTIC       │ artwork_type_title │ "Poster"         │ Elasticsearch term query
//  V&A         │ id_category        │ THES48943        │ V&A thesaurus: Posters
//  LOC         │ collection         │ posters          │ /collections/posters/
//  Rijks       │ type               │ affiche          │ Dutch for poster
//  Harvard     │ keyword            │ poster           │ /object?keyword=poster
//  Europeana   │ query              │ poster OR affiche│ free-text + TYPE:IMAGE
//  Wellcome    │ workType           │ k                │ Pictures/Visual Works
//  IA          │ subject            │ poster           │ Solr subject:(poster)
//  Cooper      │ typeFilter         │ poster           │ code-filtered on type field
//  DR          │ —                  │ all              │ entire site is graphic design
//  LFA         │ —                  │ all              │ entire account is graphic design
//
// KEY REQUIREMENTS (set in .env.local):
//   HARVARD_API_KEY   — required (free at harvardartmuseums.org/collections/api)
//   EUROPEANA_API_KEY — required (free at api.europeana.eu)
//   RIJKS_API_KEY     — optional (demo key 0fiuZFh4 works but rate-limited)
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryMap: Record<string, SourceConfig[]> = {

  // ── POSTERS ────────────────────────────────────────────────────────────────
  // Theater, propaganda, travel, political, cultural event posters.
  // Think: Public Theater, WPA, Bauhaus, Swiss modernism, NYC cultural life.

  POSTERS: [
    {
      source: 'met',
      limit:  300,
      params: { q: 'poster', hasImages: true },
    },
    {
      source: 'artic',
      limit:  300,
      params: { artwork_type_title: 'Poster' },
      // ARTIC Elasticsearch: query[term][artwork_type_title.keyword]=Poster
    },
    {
      source: 'va',
      limit:  300,
      params: { id_category: 'THES48943' },
      // V&A thesaurus THES48943 = Posters (confirmed)
      // NOT THES48956 (Fashion) — that was wrong
    },
    {
      source: 'loc',
      limit:  400,
      params: { collection: 'posters' },
      // /collections/posters/ — 6,000+ WPA, WWII, cultural posters
    },
    {
      source: 'rijks',
      limit:  200,
      params: { type: 'affiche', q: '*' },
      // affiche = Dutch for poster. q=* required (without it returns 0)
    },
    {
      source: 'cooper',
      limit:  300,
      params: { typeFilter: 'poster' },
      // GitHub dump probe — filter: classification/type contains "poster"
    },
    {
      source: 'wikimedia',
      limit:  200,
      params: { category: 'Posters' },
    },
    {
      source: 'ia',
      limit:  200,
      params: { subject: 'poster', mediatype: 'image' },
    },
    {
      source: 'letterform',
      limit:  600,
      params: {},
      // Entire LFA collection is graphic design — adapter filters type specimens
    },
    {
      source: 'designreviewed',
      limit:  500,
      params: {},
      // Entire site is graphic design: Swiss modernism, books, type, posters
    },
    {
      source: 'europeana',
      limit:  200,
      params: { query: 'poster OR affiche OR plakat' },
    },
    {
      source: 'harvard',
      limit:  200,
      params: { keyword: 'poster' },
    },
  ],

  // ── PHOTOGRAPHY ────────────────────────────────────────────────────────────

  PHOTOGRAPHY: [
    {
      source: 'met',
      limit:  300,
      params: { q: 'photograph', hasImages: true },
    },
    {
      source: 'artic',
      limit:  300,
      params: { classification_id: 'PC-12' },
      // PC-12 = Photography department
    },
    {
      source: 'loc',
      limit:  300,
      params: { collection: 'fsa-owi-color-photographs' },
      // FSA/OWI color photographs — 1930s–40s documentary photography
    },
    {
      source: 'rijks',
      limit:  200,
      params: { type: 'foto', q: '*' },
    },
    {
      source: 'smithsonian',
      limit:  200,
      params: { q: 'photograph', unit_code: 'NMAAHC|NMAH|SAAM' },
    },
    {
      source: 'harvard',
      limit:  200,
      params: { keyword: 'photograph' },
    },
    {
      source: 'ia',
      limit:  200,
      params: { subject: 'photographs', mediatype: 'image' },
    },
  ],

  // ── PAINTINGS ──────────────────────────────────────────────────────────────

  PAINTINGS: [
    {
      source: 'met',
      limit:  300,
      params: { departmentId: '11' },
      // Dept 11 = European Paintings
    },
    {
      source: 'artic',
      limit:  300,
      params: { classification_id: 'PC-1' },
      // PC-1 = Painting
    },
    {
      source: 'rijks',
      limit:  300,
      params: { type: 'schilderij', q: '*' },
      // schilderij = Dutch for painting
    },
    {
      source: 'nga',
      limit:  200,
      params: { classification: 'Painting' },
    },
    {
      source: 'harvard',
      limit:  200,
      params: { keyword: 'painting' },
    },
  ],

  // ── PRINTS ─────────────────────────────────────────────────────────────────

  PRINTS: [
    {
      source: 'met',
      limit:  300,
      params: { departmentId: '9' },
      // Dept 9 = Drawings and Prints
    },
    {
      source: 'artic',
      limit:  300,
      params: { classification_id: 'PC-2' },
    },
    {
      source: 'rijks',
      limit:  300,
      params: { type: 'prent', q: '*' },
      // prent = Dutch for print/engraving
    },
    {
      source: 'loc',
      limit:  300,
      params: { collection: 'fine-prints-american-before-1940' },
    },
    {
      source: 'harvard',
      limit:  200,
      params: { classification_id: '21' },
      // classification_id 21 = Prints (confirmed)
    },
  ],

  // ── DECORATIVE ARTS ────────────────────────────────────────────────────────

  DECORATIVE_ARTS: [
    {
      source: 'met',
      limit:  300,
      params: { departmentId: '12' },
      // Dept 12 = European Sculpture and Decorative Arts
    },
    {
      source: 'va',
      limit:  300,
      params: { id_category: 'THES48881' },
      // THES48881 = Textiles and Fashion (V&A confirmed)
    },
    {
      source: 'rijks',
      limit:  200,
      params: { type: 'meubilair', q: '*' },
      // meubilair = Dutch for furniture
    },
    {
      source: 'cooper',
      limit:  300,
      params: { department_id: '35347501' },
      // Cooper Hewitt Textiles department
    },
  ],

};