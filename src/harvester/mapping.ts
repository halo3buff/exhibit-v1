import { SourceConfig } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY MAP
//
// Every source listed here has BOTH a real fetcher in fetcher.ts AND a real
// adapter in adapters/. Sources marked ⚠️ need a free API key in .env —
// the fetcher will skip them gracefully with a message if the key is missing.
//
// KEY REQUIREMENTS:
//   RIJKS_API_KEY     — optional (demo key 0fiuZFh4 works as fallback)
//   HARVARD_API_KEY   — required for harvard (free: harvardartmuseums.org/collections/api)
//   EUROPEANA_API_KEY — required for europeana (free: api.europeana.eu)
//   NYPL_API_TOKEN    — required for nypl (free: digitalcollections.nypl.org/help/api)
//   SMITHSONIAN_API_KEY — optional (works without key, key gives higher limits)
// ─────────────────────────────────────────────────────────────────────────────

export const CategoryMap: Record<string, SourceConfig[]> = {

  GRAPHIC_DESIGN: [
    // No key needed
    { source: 'cooper',         filterId: '35347493',      filterType: 'department_id' },
    { source: 'met',            filterId: '19',            filterType: 'departmentId' },
    { source: 'artic',          filterId: 'PC-2',          filterType: 'classification_id' },
    { source: 'va',             filterId: 'THES48956',     filterType: 'category' },       // V&A Graphic Design thesaurus ID
    { source: 'loc',            filterId: 'pos',           filterType: 'format' },         // LOC Posters collection
    { source: 'rijks',          filterId: 'prent',         filterType: 'type' },           // prints (demo key works)
    { source: 'wikimedia',      filterId: 'Posters',       filterType: 'category' },
    { source: 'wellcome',       filterId: 'k',             filterType: 'workType' },       // k = poster in Wellcome workType
    { source: 'ia',             filterId: 'posters',       filterType: 'subject' },
    { source: 'rave',           filterId: 'rave flyer',    filterType: 'subject' },     // routes to IA rave-flyers collection
    { source: 'designreviewed', filterId: 'graphic-design',filterType: 'category' },
    { source: 'letterform',     filterId: 'all',           filterType: 'all' },
    // ⚠️ NEEDS KEY: EUROPEANA_API_KEY (free)
    { source: 'europeana',      filterId: 'IMAGE',         filterType: 'type' },
    // ⚠️ NEEDS KEY: HARVARD_API_KEY (free)
    { source: 'harvard',        filterId: '21',            filterType: 'classification_id' },
  ],

  PHOTOGRAPHY: [
    // No key needed
    { source: 'met',            filterId: '19',            filterType: 'departmentId',     subFilter: 'Photographs' },
    { source: 'artic',          filterId: 'PC-12',         filterType: 'classification_id' },
    { source: 'loc',            filterId: 'pho',           filterType: 'format' },
    { source: 'rijks',          filterId: 'foto',          filterType: 'type' },
    { source: 'ia',             filterId: 'photographs',   filterType: 'subject' },
    { source: 'wikimedia',      filterId: 'Photographs',   filterType: 'category' },
    { source: 'smithsonian',    filterId: 'Photographs',   filterType: 'type' },
    { source: 'nga',            filterId: 'Photography',   filterType: 'type' },
    // ⚠️ NEEDS KEY: HARVARD_API_KEY (free)
    { source: 'harvard',        filterId: '26',            filterType: 'classification_id' },
  ],

  PAINTING: [
    // No key needed
    { source: 'met',            filterId: '11',            filterType: 'departmentId' },   // European Paintings
    { source: 'artic',          filterId: 'PC-1',          filterType: 'classification_id' },
    { source: 'rijks',          filterId: 'schilderij',    filterType: 'type' },
    { source: 'smithsonian',    filterId: 'Paintings',     filterType: 'type' },
    { source: 'nga',            filterId: 'Painting',      filterType: 'type' },
    // ⚠️ NEEDS KEY: HARVARD_API_KEY (free)
    { source: 'harvard',        filterId: '26',            filterType: 'classification_id' },
  ],

  DECORATIVE_ARTS: [
    // No key needed
    { source: 'met',            filterId: '12',            filterType: 'departmentId' },   // European Sculpture & Dec Arts
    { source: 'artic',          filterId: 'PC-15',         filterType: 'classification_id' }, // Textiles
    { source: 'cooper',         filterId: '35347501',      filterType: 'department_id' },   // Cooper Textiles dept
    { source: 'va',             filterId: 'THES48881',     filterType: 'category' },        // V&A Textiles/Fashion thesaurus ID
    { source: 'rijks',          filterId: 'meubilair',     filterType: 'type' },            // Furniture
    { source: 'smithsonian',    filterId: 'Ceramics',      filterType: 'type' },
  ],

  PRINTS_AND_DRAWINGS: [
    // No key needed
    { source: 'met',            filterId: '9',             filterType: 'departmentId' },    // Drawings & Prints dept
    { source: 'artic',          filterId: 'PC-10',         filterType: 'classification_id' },
    { source: 'loc',            filterId: 'app',           filterType: 'format' },          // LOC Prints collection
    { source: 'cooper',         filterId: '35347497',      filterType: 'department_id' },
    { source: 'rijks',          filterId: 'tekening',      filterType: 'type' },            // Drawings
  ],

};

// ─── NOT YET IN MAPPING (no confirmed public API) ────────────────────────────
// These adapters exist as schema definitions but have no working fetcher.
// Do not add them to CategoryMap until a real fetch strategy is confirmed.
//
//   ada        — Arabic Design Archive: no public API documented
//   aif        — Arab Image Foundation: no public API documented
//   palarchive — Palestinian Museum: CollectiveAccess instance, no open API confirmed
//   translatio — research project, no API
//   jstor      — requires institutional access
