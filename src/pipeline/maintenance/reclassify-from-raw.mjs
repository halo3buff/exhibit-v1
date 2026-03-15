// src/scripts/reclassify-from-raw.mjs
// Reclassifies all artworks from raw source data.
// Usage:  node src/scripts/reclassify-from-raw.mjs           (dry run)
//         node src/scripts/reclassify-from-raw.mjs --commit  (write to DB)

import fs   from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const RAW_DIR   = path.join(ROOT, 'data', 'raw');
const COMMIT    = process.argv.includes('--commit');

// ─── CATEGORY / SUBCATEGORY CONSTANTS ───────────────────────────────────────
const C = {
  PAINTING : 'Painting',
  PHOTO    : 'Photography',
  PRINTS   : 'Prints & Drawings',
  DECARTS  : 'Decorative Arts',
  GRAPHIC  : 'Graphic Design',
};
const S = {
  OIL      : 'Oil',
  WATER    : 'Watercolor/Gouache',
  TEMPERA  : 'Tempera/Fresco',
  PHOTO    : 'Photograph',
  ETCHING  : 'Etching/Woodcut/Lithograph',
  DRAWINGS : 'Drawings',
  CERAMICS : 'Ceramics & Glass',
  TEXTILES : 'Textiles & Fashion',
  METAL    : 'Metalwork & Jewelry',
  FURN     : 'Furniture',
  POSTERS  : 'Posters & Advertising',
  IDENTITY : 'Identity & Branding',
  PACK     : 'Packaging',
  TYPE     : 'Typography & Lettering',
  EDIT     : 'Editorial & Publication',
};

// Shorthand builders
const painting = (sub = S.OIL)    => ({ category: C.PAINTING, subcategory: sub });
const photo    = ()                => ({ category: C.PHOTO,    subcategory: S.PHOTO });
const prints   = (sub = S.ETCHING) => ({ category: C.PRINTS,   subcategory: sub });
const drawings = ()                => ({ category: C.PRINTS,   subcategory: S.DRAWINGS });
const decarts  = sub               => ({ category: C.DECARTS,  subcategory: sub });
const graphic  = (sub = S.POSTERS) => ({ category: C.GRAPHIC,  subcategory: sub });

// ─── SHARED HELPERS ──────────────────────────────────────────────────────────
function has(str, patterns) {
  const s = (str || '').toLowerCase();
  return patterns.some(p => (p instanceof RegExp ? p.test(s) : s.includes(p)));
}

// Detect painting sub-type from a medium string
function paintingSub(medium) {
  const m = (medium || '').toLowerCase();
  if (has(m, ['watercolor', 'watercolour', 'gouache', 'wash'])) return S.WATER;
  if (has(m, ['tempera', 'fresco', 'encaustic', 'distemper', 'egg'])) return S.TEMPERA;
  return S.OIL; // oil, acrylic, enamel, etc.
}

// Detect print sub-type from medium/technique string
function printSub(str) {
  const s = (str || '').toLowerCase();
  if (has(s, ['watercolor', 'watercolour', 'gouache', 'wash',
              'graphite', 'pencil', 'charcoal', 'chalk', 'pastel',
              'crayon', 'pen and', 'ink on', 'brush and ink']))
    return S.DRAWINGS;
  return S.ETCHING; // etching, engraving, woodcut, lithograph, relief, etc.
}

// ─── MET ─────────────────────────────────────────────────────────────────────
function classifyMET(d) {
  const dept   = (d.department    || '').toLowerCase();
  const name   = (d.objectName    || '').toLowerCase();
  const cls    = (d.classification|| '').toLowerCase();
  const medium = (d.medium        || '').toLowerCase();

  // ── 1. Photography ──────────────────────────────────────────────────────
  if (dept === 'photographs')                                         return photo();
  if (has(name, ['photograph', 'negative', 'carte-de-visite',
                 'daguerreotype', 'tintype', 'calotype', 'ambrotype',
                 'autochromes']))                                      return photo();
  if (has(cls,  ['photograph', 'negative', 'daguerreotype']))        return photo();
  if (has(medium, ['gelatin silver', 'albumen silver', 'daguerreotype',
                   'tintype', 'calotype', 'cyanotype', 'platinum print',
                   'palladium print', 'chromogenic', 'dye transfer',
                   'collodion', 'salted paper print']))               return photo();

  // ── 2. Painting ─────────────────────────────────────────────────────────
  if (dept.includes('paintings'))                                     return painting(paintingSub(medium));
  if (has(name, ['painting', 'miniature']) && !has(name, ['design', 'study for']))
                                                                      return painting(paintingSub(medium));
  if (cls === 'paintings' || cls === 'miniatures')                   return painting(paintingSub(medium));

  // ── 3. Drawings and Prints department ───────────────────────────────────
  if (dept.includes('drawings and prints') || dept.includes('prints and drawings')) {
    // Specific print types in objectName
    if (has(name, ['etching', 'engraving', 'lithograph', 'woodcut',
                   'woodblock', 'aquatint', 'mezzotint', 'screenprint',
                   'linocut', 'print', 'books prints']))              return prints(S.ETCHING);
    if (has(name, ['drawing', 'study', 'sketch']))                   return drawings();
    // Medium is the best signal
    if (has(medium, ['etching', 'engraving', 'lithograph', 'woodcut',
                     'woodblock', 'aquatint', 'mezzotint', 'screenprint',
                     'silkscreen', 'linocut', 'relief print', 'intaglio',
                     'drypoint', 'gravure']))                         return prints(S.ETCHING);
    if (has(medium, ['watercolor', 'watercolour', 'gouache',
                     'graphite', 'pencil', 'charcoal', 'chalk',
                     'pastel', 'crayon', 'pen and', 'brush and']))   return drawings();
    // objectName "Print" with no further signal → Etching
    if (name === 'print')                                             return prints(S.ETCHING);
    return drawings(); // default for this dept
  }

  // ── 4. Classification-driven decorative arts ─────────────────────────────
  if (cls === 'prints')    return prints(S.ETCHING);
  if (cls === 'drawings')  return drawings();
  if (cls === 'posters')   return graphic(S.POSTERS);

  if (has(cls, ['ceramics', 'porcelain', 'pottery', 'faience',
                'stoneware', 'earthenware', 'glass-']))               return decarts(S.CERAMICS);
  if (has(cls, ['textiles', 'lace', 'embroidery', 'tapestry',
                'costume', 'fashion', 'dress', 'woven', 'needlework']))
                                                                      return decarts(S.TEXTILES);
  if (has(cls, ['metalwork', 'silver', 'gold', 'bronze',
                'jewelry', 'jewellery', 'arms and armor']))           return decarts(S.METAL);
  if (has(cls, ['furniture', 'woodwork']))                            return decarts(S.FURN);

  // ── 5. ObjectName-driven decorative arts ─────────────────────────────────
  if (has(name, ['table', 'chair', 'cabinet', 'desk', 'bed',
                 'bookcase', 'chest', 'sofa', 'settee', 'armchair',
                 'stool', 'bench', 'work table', 'writing table',
                 'sideboard', 'bureau', 'commode', 'secretary']))     return decarts(S.FURN);
  if (has(name, ['vase', 'bowl', 'cup', 'plate', 'dish', 'pitcher',
                 'jug', 'teacup', 'saucer', 'saltcellar', 'jar', 'pot',
                 'beaker', 'flask', 'bottle', 'tile', 'paperweight',
                 'tureen', 'ewer', 'basin', 'tankard']))              return decarts(S.CERAMICS);
  if (has(name, ['textile', 'fabric', 'cloth', 'dress', 'gown',
                 'coat', 'robe', 'kimono', 'tapestry', 'embroidery',
                 'carpet', 'rug', 'lace', 'shawl', 'fan', 'piece',
                 'panel', 'coverlet', 'quilt']))                      return decarts(S.TEXTILES);
  if (has(name, ['sword', 'knife', 'dagger', 'helmet', 'armor',
                 'armour', 'shield', 'ring', 'necklace', 'bracelet',
                 'brooch', 'earring', 'pendant', 'medallion',
                 'snuffbox', 'candlestick', 'spoon', 'fork', 'ladle',
                 'salver', 'tray', 'ewer', 'badge']))                 return decarts(S.METAL);

  // ── 6. Department fallback ───────────────────────────────────────────────
  if (dept.includes('textile'))                                       return decarts(S.TEXTILES);
  if (has(dept, ['arms', 'armor', 'armour', 'arms and']))            return decarts(S.METAL);
  if (dept.includes('decorative arts') || dept.includes('applied arts')) {
    if (has(medium, ['silver', 'gold', 'bronze', 'iron', 'steel',
                     'copper', 'brass', 'pewter']))                   return decarts(S.METAL);
    if (has(medium, ['porcelain', 'ceramic', 'glass', 'stoneware',
                     'earthenware', 'enamel', 'majolica']))           return decarts(S.CERAMICS);
    if (has(medium, ['oak', 'walnut', 'mahogany', 'maple', 'pine',
                     'wood', 'ebony']))                               return decarts(S.FURN);
    return decarts(S.CERAMICS); // generic decorative arts fallback
  }

  return null;
}

// ─── ARTIC ───────────────────────────────────────────────────────────────────
function classifyARTIC(d) {
  const type   = (d.artwork_type_title  || '').toLowerCase();
  const cls    = (d.classification_title|| '').toLowerCase();
  const medium = (d.medium_display      || '').toLowerCase();
  const dept   = (d.department_title    || '').toLowerCase();

  // ── 1. Photography ──────────────────────────────────────────────────────
  if (type === 'photograph' || cls === 'photograph' || cls === 'photography')
    return photo();
  if (has(medium, ['gelatin silver', 'albumen silver', 'daguerreotype',
                   'tintype', 'chromogenic', 'cyanotype', 'platinum print']))
    return photo();

  // ── 2. Painting ─────────────────────────────────────────────────────────
  if (type === 'painting') {
    if (has(cls, ['oil on canvas', 'oil on panel', 'oil on board',
                  'oil on copper', 'acrylic', 'enamel']))  return painting(S.OIL);
    if (has(cls, ['watercolor', 'watercolour', 'gouache'])) return painting(S.WATER);
    if (has(cls, ['tempera', 'fresco']))                    return painting(S.TEMPERA);
    return painting(paintingSub(medium));
  }

  // ── 3. Prints ────────────────────────────────────────────────────────────
  if (type === 'print') {
    if (has(cls, ['woodblock', 'woodcut', 'wood engraving',
                  'etching', 'engraving', 'lithograph', 'mezzotint',
                  'aquatint', 'screenprint', 'linocut', 'relief']))   return prints(S.ETCHING);
    if (has(medium, ['woodblock', 'woodcut', 'etching', 'lithograph',
                     'engraving', 'mezzotint', 'aquatint', 'screenprint',
                     'relief print', 'silkscreen']))                  return prints(S.ETCHING);
    return prints(S.ETCHING); // all unspecified prints → etching
  }

  // ── 4. Drawing (including Architectural Drawing) ─────────────────────────
  if (type === 'drawing' || type === 'architectural drawing') {
    if (has(medium, ['watercolor', 'watercolour', 'gouache']))  return painting(S.WATER);
    return drawings();
  }

  // ── 5. "Design" type — look at classification to decide ──────────────────
  if (type === 'design') {
    if (has(cls, ['furniture', 'woodwork', 'chair', 'table', 'cabinet']))
      return decarts(S.FURN);
    if (has(cls, ['textile', 'fabric', 'costume', 'fashion', 'dress']))
      return decarts(S.TEXTILES);
    if (has(cls, ['ceramic', 'porcelain', 'glass', 'vessel']))
      return decarts(S.CERAMICS);
    if (has(cls, ['metalwork', 'silver', 'gold', 'jewelry', 'jewellery']))
      return decarts(S.METAL);
    if (has(cls, ['poster', 'graphic', 'type', 'lettering']))
      return graphic(S.POSTERS);
    return drawings(); // design drawing, unspecified
  }

  // ── 6. Decorative art types ──────────────────────────────────────────────
  if (type === 'textile' || dept.includes('textiles'))               return decarts(S.TEXTILES);
  if (type === 'metalwork' || type === 'armor' || type === 'arms')   return decarts(S.METAL);
  if (has(type, ['glass', 'vessel', 'ceramics', 'ceramic']))        return decarts(S.CERAMICS);
  if (has(type, ['furniture', 'woodwork']))                          return decarts(S.FURN);
  if (has(type, ['jewelry', 'jewellery']))                           return decarts(S.METAL);

  // ── 7. Classification fallback ───────────────────────────────────────────
  if (has(cls, ['oil on', 'acrylic on', 'tempera on']))             return painting(paintingSub(cls));
  if (has(cls, ['watercolor', 'watercolour', 'gouache']))            return painting(S.WATER);
  if (has(cls, ['woodblock', 'etching', 'lithograph', 'engraving',
                'aquatint', 'screenprint', 'relief']))               return prints(S.ETCHING);
  if (cls === 'drawing' || cls === 'drawings')                       return drawings();
  if (has(cls, ['photograph', 'photography']))                       return photo();
  if (has(cls, ['textile', 'fabric', 'woven', 'tapestry']))         return decarts(S.TEXTILES);
  if (has(cls, ['silver', 'gold', 'bronze', 'metalwork', 'jewelry'])) return decarts(S.METAL);
  if (has(cls, ['ceramic', 'porcelain', 'glass', 'vessel']))        return decarts(S.CERAMICS);
  if (has(cls, ['furniture']))                                       return decarts(S.FURN);

  // ── 8. Medium fallback ───────────────────────────────────────────────────
  if (has(medium, ['oil on', 'acrylic on', 'enamel on']))           return painting(S.OIL);
  if (has(medium, ['watercolor', 'watercolour', 'gouache']))         return painting(S.WATER);
  if (has(medium, ['graphite', 'pencil', 'charcoal', 'ink on',
                   'pen and', 'chalk', 'pastel']))                   return drawings();

  return null;
}

// ─── V&A ─────────────────────────────────────────────────────────────────────
function classifyVA(d) {
  const type = ((d.objectType || d._objectType || '') + '').toLowerCase().trim();

  if (type === 'poster' || type === 'advertisement')                 return graphic(S.POSTERS);
  if (has(type, ['print', 'etching', 'engraving', 'lithograph',
                 'woodcut', 'mezzotint', 'aquatint']))               return prints(S.ETCHING);
  if (has(type, ['drawing', 'watercolour', 'watercolor', 'sketch',
                 'design drawing']))                                  return drawings();
  if (type === 'painting' || type === 'oil painting')               return painting(S.OIL);
  if (has(type, ['photograph', 'negative', 'photogram',
                 'daguerreotype']))                                   return photo();
  if (has(type, ['textile', 'fabric', 'weaving', 'embroidery',
                 'tapestry', 'carpet', 'rug', 'lace', 'dress',
                 'costume', 'fashion', 'shoe', 'hat', 'glove']))    return decarts(S.TEXTILES);
  if (has(type, ['furniture', 'chair', 'table', 'cabinet',
                 'chest', 'desk', 'bookrest', 'cupboard', 'sofa',
                 'bed', 'sideboard', 'shelf']))                      return decarts(S.FURN);
  if (has(type, ['metalwork', 'silver', 'gold', 'bronze',
                 'jewellery', 'jewelry', 'ring', 'necklace',
                 'brooch', 'earring', 'pendant', 'bracelet',
                 'badge', 'medal', 'coin', 'armour', 'armor',
                 'sword', 'knife', 'dagger']))                       return decarts(S.METAL);
  if (has(type, ['ceramic', 'pottery', 'porcelain', 'faience',
                 'earthenware', 'stoneware', 'glass', 'tile',
                 'vase', 'bowl', 'cup', 'plate', 'dish', 'jug',
                 'teacup', 'saucer', 'teapot', 'stand', 'bottle',
                 'flask', 'paperweight', 'cup and saucer']))         return decarts(S.CERAMICS);

  return null;
}

// ─── SMITHSONIAN ──────────────────────────────────────────────────────────────
function classifySMITHSONIAN(d) {
  const unitCode = (d.unitCode || '').toUpperCase();
  const content  = d.content || {};
  const indexed  = (content.indexedStructured || {});
  const freetext = (content.freetext || {});

  // Helper to get all values for a freetext key
  const ft = (key) => (freetext[key] || []).map(e => (e.content || '').toLowerCase());

  // Raw object_types from structured data (lowercased)
  const objTypes = (indexed.object_type || []).map(t => t.toLowerCase());

  // freetext objectType entries
  const ftTypes  = ft('objectType');

  // Department / setName
  const setNames = ft('setName').join(' ');

  // Physical medium
  const medium   = ft('physicalDescription').join(' ');

  // ── Helper: check if types array contains any of the given strings ────────
  const typesHas = patterns => objTypes.some(t => has(t, patterns));

  // ════════════════════════════════════════════════════════════════════════════
  // CHNDM (Cooper Hewitt, Smithsonian Design Museum)
  // Everything starts as a design or design-adjacent object.
  // ════════════════════════════════════════════════════════════════════════════
  if (unitCode === 'CHNDM') {
    // 1. Explicit photo
    if (typesHas(['photograph', 'photography']))                      return photo();

    // 2. Poster / graphic design
    if (typesHas(['poster', 'posters', 'advertisement']))             return graphic(S.POSTERS);
    if (typesHas(['graphic design', 'identity', 'logo', 'logotype',
                  'letterhead', 'corporate identity']))               return graphic(S.IDENTITY);
    if (typesHas(['type specimen', 'typeface', 'typography']))        return graphic(S.TYPE);
    if (typesHas(['packaging']))                                       return graphic(S.PACK);

    // 3. Decorative arts — specific objects (non-drawing types)
    // Filter generic labels so we can find the specific type
    const GENERIC  = ['drawings', 'drawing', 'decorative arts', 'decorative art',
                      'graphic design', 'fine arts', 'prints'];
    const specific = objTypes.filter(t => !GENERIC.some(g => t === g));

    if (specific.some(t => has(t, ['furniture', 'chair', 'table', 'cabinet',
                                    'sofa', 'desk', 'bed', 'chest', 'shelf',
                                    'bookcase', 'armchair', 'stool'])))
      return decarts(S.FURN);

    if (specific.some(t => has(t, ['textile', 'fabric', 'weaving', 'tapestry',
                                    'carpet', 'rug', 'lace', 'dress', 'costume',
                                    'fashion', 'embroidery', 'wall coverings',
                                    'wallpaper', 'wallcovering', 'border (ornament',
                                    'borders (ornament'])))
      return decarts(S.TEXTILES);

    if (specific.some(t => has(t, ['jewelry', 'jewellery', 'earring', 'ring',
                                    'necklace', 'bracelet', 'brooch', 'pendant',
                                    'button', 'buckle', 'costume accessories',
                                    'costume accessory', 'metalwork', 'silver',
                                    'gold', 'bronze'])))
      return decarts(S.METAL);

    if (specific.some(t => has(t, ['ceramic', 'porcelain', 'glass', 'tile',
                                    'tiles', 'pottery', 'earthenware', 'stoneware',
                                    'faience', 'vase', 'bowl', 'plate'])))
      return decarts(S.CERAMICS);

    // 4. Check freetext objectType for specific type labels
    const primaryType = ftTypes.filter(t => t !== 'drawing').join(' ');
    if (has(primaryType, ['furniture', 'chair', 'table', 'cabinet', 'desk']))
      return decarts(S.FURN);
    if (has(primaryType, ['jewelry', 'jewellery', 'metalwork']))
      return decarts(S.METAL);
    if (has(primaryType, ['textile', 'fabric', 'wallcovering']))
      return decarts(S.TEXTILES);
    if (has(primaryType, ['ceramic', 'tile', 'porcelain', 'glass']))
      return decarts(S.CERAMICS);

    // 5. Check department via setName
    if (has(setNames, ['product design and decorative arts']))        {
      // Still need to figure out sub-type from medium
      if (has(medium, ['silver', 'gold', 'bronze', 'pewter', 'iron',
                       'steel', 'brass', 'copper']))                  return decarts(S.METAL);
      if (has(medium, ['ceramic', 'porcelain', 'glass', 'stoneware',
                       'earthenware', 'enamel']))                     return decarts(S.CERAMICS);
      return decarts(S.CERAMICS); // default for product design
    }

    // 6. Drawings dept with only "Drawings" in object_type → fine art drawing
    if (typesHas(['drawings']) && specific.length === 0)              return drawings();

    // 7. Drawings dept with only "Drawings" as structured type
    if (objTypes.every(t => GENERIC.includes(t)))                    return drawings();

    // 8. Fallback: CHNDM with no clear signal → Prints & Drawings
    return drawings();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Non-CHNDM Smithsonian (SAAM, NPG, HMSG, NMAAHC, etc.)
  // ════════════════════════════════════════════════════════════════════════════

  // Combine all type signals
  const allTypes = [...objTypes, ...ftTypes].join(' ');

  // 1. Photography
  if (typesHas(['photograph', 'photography']))                        return photo();
  if (has(allTypes, ['photograph', 'photography']))                   return photo();
  if (has(medium,   ['gelatin silver', 'albumen', 'daguerreotype',
                     'tintype', 'chromogenic', 'cyanotype']))         return photo();

  // 2. Paintings
  if (typesHas(['paintings', 'painting']))                            return painting(paintingSub(medium));
  if (has(allTypes, ['paintings']))                                   return painting(paintingSub(medium));

  // 3. Prints — note: "Graphic arts" / "Graphic Arts-Print" in SAAM = PRINTMAKING
  if (typesHas(['prints', 'graphic arts', 'graphic arts-print',
                'print', 'etching', 'engraving', 'lithograph',
                'woodcut', 'screenprint']))                           return prints(S.ETCHING);
  // Dept "Graphic Arts" in setName for SAAM = printmaking dept
  if (has(setNames, ['graphic arts']) && unitCode !== 'CHNDM')      return prints(S.ETCHING);

  // 4. Drawings
  if (typesHas(['drawings', 'drawing']))                              return drawings();

  // 5. Textiles
  if (typesHas(['textile', 'textiles', 'fabric', 'costume', 'fashion']))
    return decarts(S.TEXTILES);

  // 6. Decorative arts
  if (typesHas(['ceramic', 'ceramics', 'porcelain', 'glass', 'tile']))
    return decarts(S.CERAMICS);
  if (typesHas(['metalwork', 'jewelry', 'jewellery', 'silver', 'gold']))
    return decarts(S.METAL);
  if (typesHas(['furniture', 'woodwork']))
    return decarts(S.FURN);

  // 7. Medium fallback
  if (has(medium, ['oil on', 'acrylic on']))                         return painting(S.OIL);
  if (has(medium, ['watercolor', 'watercolour', 'gouache']))         return painting(S.WATER);
  if (has(medium, ['gelatin silver', 'albumen', 'daguerreotype']))   return photo();
  if (has(medium, ['graphite', 'pencil', 'pen and ink', 'charcoal',
                   'chalk', 'crayon']))                              return drawings();
  if (has(medium, ['etching', 'engraving', 'lithograph', 'woodcut',
                   'relief print', 'silkscreen', 'screenprint']))    return prints(S.ETCHING);

  return null;
}

// ─── RIJKS ────────────────────────────────────────────────────────────────────
// Rijks data is Linked Art JSON-LD. There are NO clean classification fields.
// All classification must be inferred from human-readable text strings scattered
// across referred_to_by entries (medium descriptions & role labels).
function classifyRIJKS(data) {
  // Collect every text string from referred_to_by at all levels
  const parts = [];

  // Top-level referred_to_by (contains medium like "gravure", "aquarel", etc.)
  for (const r of (data.referred_to_by || [])) {
    if (typeof r.content === 'string') parts.push(r.content);
  }

  // Recursive walk of produced_by for role labels and technique descriptions
  function walkProduction(pb) {
    if (!pb) return;
    for (const r of (pb.referred_to_by || [])) {
      if (typeof r.content === 'string') parts.push(r.content);
    }
    for (const t of (pb.technique || [])) {
      for (const r of (t.referred_to_by || [])) {
        if (typeof r.content === 'string') parts.push(r.content);
      }
    }
    for (const p of (pb.part || [])) walkProduction(p);
    // assigned_by sub-productions
    for (const a of (pb.assigned_by || [])) {
      const assigned = a.assigned || [];
      for (const sub of (Array.isArray(assigned) ? assigned : [assigned])) {
        if (sub && typeof sub === 'object') walkProduction(sub);
      }
    }
  }
  walkProduction(data.produced_by);

  const text = parts.join(' ').toLowerCase();

  // ── 1. Photography ──────────────────────────────────────────────────────
  if (has(text, ['fotograaf', 'photographer', 'photograph',
                  'fotografie', 'photography', 'gelatin silver',
                  'albumen', 'daguerreotype', 'cyanotype']))          return photo();

  // ── 2. Prints — check for print roles & media ───────────────────────────
  // Dutch: prentmaker, graveur, etser, lithograaf
  // English: printmaker, engraver, etcher, lithographer
  // Medium: gravure, ets, houtsnede, litho, mezzotint, aquatint
  if (has(text, ['prentmaker', 'printmaker', 'graveur', 'etser',
                  'lithograaf', 'lithographer', 'engraver']))          return prints(S.ETCHING);
  if (has(text, ['gravure', ' ets ', '\nets\n', 'etsing', 'etching',
                  'houtsnede', 'woodcut', 'houtgravure', 'wood engraving',
                  'litho', 'lithografi', 'lithograph',
                  'mezzotint', 'aquatint', 'drypoint', 'intaglio',
                  'prent', 'gegraveerd']))                             return prints(S.ETCHING);

  // ── 3. Painting ─────────────────────────────────────────────────────────
  // Dutch: schilder, geschilderd; English: painter, painted
  if (has(text, ['schilder', 'geschilderd', 'painter', 'painting']))  {
    if (has(text, ['aquarel', 'watercolour', 'watercolor', 'gouache'])) return painting(S.WATER);
    if (has(text, ['tempera', 'fresco']))                              return painting(S.TEMPERA);
    return painting(S.OIL);
  }
  // Medium signals for painting
  if (has(text, ['olieverf', 'oil on canvas', 'oil on panel',
                  'oil on board']))                                    return painting(S.OIL);
  if (has(text, ['aquarel ', 'watercolour', 'watercolor',
                  ' gouache']))                                        return painting(S.WATER);

  // ── 4. Drawings ─────────────────────────────────────────────────────────
  // Dutch: tekenaar, tekening; English: draftsman, drawing, draughtsman
  if (has(text, ['tekenaar', 'draftsman', 'draughtsman', 'drawing',
                  'tekening']))                                        return drawings();
  if (has(text, ['graphite', 'pencil', 'pen and ink', 'charcoal',
                  'chalk', 'crayon', 'potlood', 'inkt']))             return drawings();

  return null; // no text signal found — keep existing
}

// ─── COOPER HEWITT ────────────────────────────────────────────────────────────
// CH files are saved flat by harvest-cooperhewitt.ts:
//   { id, source, title, medium, date, imageUrl, url, department, objectType, raw: {...github obj} }
//
// The `classifyFromRaw` dispatcher passes `raw.data || raw` as `data`.
// Since CH files have no `.data` field, `data` = the whole file object.
// Access the GitHub JSON via `data.raw.type` (the key classification field).
//
// NOTE: rawPath lookup is handled separately in the MAIN loop because CH files
// are named by sequential index (cooperhewitt-000001.json), not by object ID.
function classifyCOOPERHEWITT(data) {
  const ch     = data.raw || {};
  const type   = (Array.isArray(ch.type) ? ch.type.join(' ') : String(ch.type ?? '')).toLowerCase();
  const medium = (data.medium || ch.medium || '').toLowerCase();

  // ── 1. Photography ──────────────────────────────────────────────────────
  if (has(type, ['photograph', 'daguerreotype', 'tintype',
                 'cyanotype', 'albumen print', 'gelatin silver'])) return photo();
  if (has(medium, ['gelatin silver', 'albumen print', 'daguerreotype',
                   'cyanotype', 'chromogenic', 'platinum print']))  return photo();

  // ── 2. Prints ────────────────────────────────────────────────────────────
  if (has(type, ['etching', 'engraving', 'woodcut', 'lithograph',
                 'aquatint', 'mezzotint', 'screenprint', 'linocut',
                 'drypoint', 'intaglio', 'woodblock', /^print$/]))  return prints(S.ETCHING);
  if (has(medium, ['etching', 'engraving', 'woodcut', 'lithograph',
                   'screenprint', 'aquatint', 'mezzotint']))        return prints(S.ETCHING);

  // ── 3. Drawings ──────────────────────────────────────────────────────────
  if (has(type, [/^drawing$/, /^drawings$/, /^sketch$/]))           return drawings();

  // ── 4. Painting ──────────────────────────────────────────────────────────
  if (has(medium, ['oil on canvas', 'oil on panel', 'oil on board'])) return painting(S.OIL);
  if (has(medium, ['watercolor', 'watercolour', 'gouache']) &&
      !has(type,  [/^drawing$/, /^sketch$/]))                        return painting(S.WATER);
  if (has(type, [/^painting$/]))                                     return painting(S.OIL);

  // ── 5. Graphic Design — Posters ──────────────────────────────────────────
  if (has(type, [/^poster$/, /^posters$/]))                         return graphic(S.POSTERS);
  if (has(type, ['advertisement', 'broadside', 'trade card',
                 'showcard', 'handbill', 'chromolithograph']))       return graphic(S.POSTERS);

  // ── 6. Graphic Design — Typography ───────────────────────────────────────
  if (has(type, ['type specimen', 'lettering', 'typeface',
                 'alphabet', 'calligraphy']))                        return graphic(S.TYPE);

  // ── 7. Graphic Design — Identity ─────────────────────────────────────────
  if (has(type, [/^logo$/, /^trademark$/, 'logotype', 'monogram',
                 'letterhead', 'stationery']))                       return graphic(S.IDENTITY);

  // ── 8. Graphic Design — Editorial ────────────────────────────────────────
  if (has(type, ['book jacket', 'book cover', 'dust jacket',
                 'magazine cover', 'brochure', 'catalog',
                 'annual report', 'menu']))                          return graphic(S.EDIT);

  // ── 9. Graphic Design — Packaging ────────────────────────────────────────
  if (has(type, [/^label$/, /^packaging$/, /^wrapper$/]))           return graphic(S.PACK);

  // ── 10. Collage ──────────────────────────────────────────────────────────
  if (has(type, [/^collage$/]))                                      return { category: C.PRINTS, subcategory: 'Collage' };

  // ── 11. Partial type match (handles compound types like "letterpress printing")
  const CH_PARTIAL = [
    ['poster', S.POSTERS, C.GRAPHIC], ['print', S.ETCHING, C.PRINTS],
    ['drawing', S.DRAWINGS, C.PRINTS], ['photograph', S.PHOTO, C.PHOTO],
    ['lettering', S.TYPE, C.GRAPHIC], ['label', S.PACK, C.GRAPHIC],
    ['packaging', S.PACK, C.GRAPHIC], ['logo', S.IDENTITY, C.GRAPHIC],
  ];
  for (const [kw, sub, cat] of CH_PARTIAL) {
    if (type.includes(kw)) return { category: cat, subcategory: sub };
  }

  // ── 12. Fallback — GD dept has no furniture/ceramics/textiles ────────────
  return graphic(S.POSTERS);
}

// ─── MAIN DISPATCHER ──────────────────────────────────────────────────────────
function classifyFromRaw(raw, source) {
  const data = raw.data || raw;
  switch (source) {
    case 'met':          return classifyMET(data);
    case 'artic':        return classifyARTIC(data);
    case 'va':           return classifyVA(data);
    case 'smithsonian':  return classifySMITHSONIAN(data);
    case 'rijks':        return classifyRIJKS(data);
    case 'cooperhewitt': return classifyCOOPERHEWITT(data);
    default:             return null;
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const db      = new Database(DB_PATH);
const allRows = db.prepare(`SELECT id, source, mainCategory, subCategory FROM artworks`).all();
const rawCache  = {};
const changes   = [];
const errors    = [];
let   noRaw     = 0;
let   noSignal  = 0;
let   confirmed = 0;

// Count changes/confirmations per source
const changeCounts  = { met: 0, artic: 0, va: 0, smithsonian: 0, rijks: 0, cooperhewitt: 0, designarchive: 0, letterformarchive: 0, designreviewed: 0 };
const confirmCounts = { met: 0, artic: 0, va: 0, smithsonian: 0, rijks: 0, cooperhewitt: 0, designarchive: 0, letterformarchive: 0, designreviewed: 0 };

// ── Pre-build Cooper Hewitt ID lookup ─────────────────────────────────────────
// CH files are named cooperhewitt-000001.json (sequential index), not by object
// ID. We build a map of { chId → parsedJSON } once before the main loop.
const chIdToRaw = {};
const chRawDir  = path.join(RAW_DIR, 'cooperhewitt');
if (fs.existsSync(chRawDir)) {
  console.log('   Pre-loading Cooper Hewitt raw index...');
  for (const f of fs.readdirSync(chRawDir)) {
    if (!f.endsWith('.json') || f.startsWith('.')) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(chRawDir, f), 'utf8'));
      if (parsed.id) chIdToRaw[parsed.id] = parsed;
    } catch { /* skip malformed */ }
  }
  console.log(`   Cooper Hewitt index: ${Object.keys(chIdToRaw).length} records\n`);
}

// ── Main reclassification loop ────────────────────────────────────────────────
for (const row of allRows) {
  let raw;

  if (row.source === 'cooperhewitt') {
    // Use pre-built lookup — files are not named by object ID
    raw = chIdToRaw[row.id];
    if (!raw) { noRaw++; continue; }
  } else {
    const rawPath = path.join(RAW_DIR, row.source, `${row.id.replace(`${row.source}-`, '')}.json`);
    if (!fs.existsSync(rawPath)) { noRaw++; continue; }
    try {
      if (!rawCache[rawPath]) rawCache[rawPath] = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
      raw = rawCache[rawPath];
    } catch {
      errors.push(row.id);
      continue;
    }
  }

  const result = classifyFromRaw(raw, row.source);
  if (!result) { noSignal++; continue; }

  const { category, subcategory } = result;

  // Compare against actual DB column names (mainCategory / subCategory)
  if (category === row.mainCategory && subcategory === row.subCategory) {
    confirmed++;
    confirmCounts[row.source] = (confirmCounts[row.source] || 0) + 1;
    continue;
  }

  changes.push({ id: row.id, source: row.source,
                 oldCat: row.mainCategory, oldSub: row.subCategory,
                 newCat: category, newSub: subcategory });
  changeCounts[row.source] = (changeCounts[row.source] || 0) + 1;
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════');
console.log(' RECLASSIFICATION DRY RUN');
console.log('══════════════════════════════════════════════════════');
console.log(`  Total artworks:    ${allRows.length}`);
console.log(`  No raw file:       ${noRaw}`);
console.log(`  No signal (keep):  ${noSignal}`);
console.log(`  Confirmed correct: ${confirmed}`);
console.log(`  Changes detected:  ${changes.length}`);
console.log(`  Errors:            ${errors.length}`);
console.log('');

// Per-source summary
for (const src of ['met', 'artic', 'va', 'smithsonian', 'rijks', 'cooperhewitt']) {
  const c = changeCounts[src] || 0;
  const k = confirmCounts[src] || 0;
  console.log(`  ${src.toUpperCase().padEnd(14)} changes: ${String(c).padStart(5)}   confirmed: ${k}`);
}

// Show up to 30 sample changes per source
const bySource = {};
for (const ch of changes) {
  if (!bySource[ch.source]) bySource[ch.source] = [];
  bySource[ch.source].push(ch);
}
console.log('');
for (const [src, list] of Object.entries(bySource)) {
  console.log(`\n── ${src.toUpperCase()} (${list.length} changes) ──────────────────────`);
  // Show breakdown of old→new transitions
  const transitions = {};
  for (const c of list) {
    const key = `${c.oldSub} → ${c.newSub}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  const sorted = Object.entries(transitions).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [k, v] of sorted) {
    console.log(`    ${String(v).padStart(6)}x  ${k}`);
  }
}

if (COMMIT) {
  console.log('\n\n══════════════════════════════════════════════════════');
  console.log(' COMMITTING CHANGES...');
  console.log('══════════════════════════════════════════════════════');
  
  const stmt = db.prepare(`UPDATE artworks SET mainCategory=?, subCategory=? WHERE id=?`);
  
  const toCommit = changes.filter(r => r.source === 'cooperhewitt');
  console.log(`  Committing ${toCommit.length} changes (cooperhewitt revert only)`);
  const updateMany = db.transaction(rows => {
    for (const r of rows) stmt.run(r.newCat, r.newSub, r.id);
  });
  
  updateMany(toCommit);
  console.log(`  ✅ ${changes.length} artworks updated.`);

  const dist = db.prepare(`
    SELECT mainCategory, subCategory, COUNT(*) as n
    FROM artworks 
    GROUP BY mainCategory, subCategory
    ORDER BY mainCategory, n DESC
  `).all();

  console.log('\n── Final distribution ────────────────────────────────');
  let lastCat = '';
  for (const r of dist) {
    if (r.mainCategory !== lastCat) { 
      console.log(`\n  ${r.mainCategory}`); 
      lastCat = r.mainCategory; 
    }
    console.log(`    ${(r.subCategory || 'Unknown').padEnd(35)} ${r.n}`);
  }
}