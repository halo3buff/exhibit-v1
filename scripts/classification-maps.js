/**
 * INDUSTRY-STANDARD MUSEUM CLASSIFICATION SYSTEM
 * Based on Getty, MET, MoMA, and international museum standards
 *
 * ── KEY FIX ────────────────────────────────────────────────────────────────
 * 'design' has been REMOVED from CLASSIFICATION_MAP.
 *
 * MoMA uses classification='design' as a department-level umbrella that spans:
 *   • Prints  (lithographs, letterpresses, silkscreens, gravures, linocuts…)
 *   • Textiles (woven cotton, wool, linen, jute…)
 *   • Furniture, ceramics, glass, metalwork
 * Mapping it directly to decorative-arts incorrectly swallowed ~4,000 items.
 *
 * Fix: items with cls='design' now fall through to Tier 5 (medium-based) in
 * category-rules.js, which routes each one by what it actually is.
 *
 * OBJECTTYPE_MAP is now fully populated so V&A items (Drawing, Print, Poster,
 * Block print, Furnishing fabric, Album, etc.) no longer hit the absolute
 * decorative-arts fallback.
 *
 * MEDIUM_KEYWORDS is now a proper ordered array (not an empty object).
 * ──────────────────────────────────────────────────────────────────────────
 */

// ============================================================================
// MAIN CATEGORIES (Industry Standard - 9 Core Categories)
// ============================================================================

const MAIN_CATEGORIES = {
  PHOTOGRAPHS:       'photographs',
  DRAWINGS:          'drawings',
  PRINTS:            'prints',
  PAINTINGS:         'paintings',
  SCULPTURE:         'sculpture',
  DECORATIVE_ARTS:   'decorative-arts',
  TEXTILES:          'textiles',
  ARCHITECTURE:      'architecture',
  BOOKS_MANUSCRIPTS: 'books-manuscripts'
};

// ============================================================================
// SUBCATEGORIES (Granular Classification)
// ============================================================================

const SUBCATEGORIES = {
  // Photographs subcategories
  PHOTO_PORTRAIT:        'portrait',
  PHOTO_LANDSCAPE:       'landscape',
  PHOTO_DOCUMENTARY:     'documentary',
  PHOTO_FASHION:         'fashion',
  PHOTO_STILL_LIFE:      'still-life',
  PHOTO_ABSTRACT:        'abstract',
  PHOTO_ARCHITECTURAL:   'architectural-photography',
  PHOTO_STUDIO:          'studio-photography',

  // Drawings subcategories
  DRAWING_STUDY:         'study',
  DRAWING_FIGURE:        'figure-drawing',
  DRAWING_LANDSCAPE:     'landscape-drawing',
  DRAWING_ARCHITECTURAL: 'architectural-drawing',
  DRAWING_PREPARATORY:   'preparatory-drawing',
  DRAWING_SKETCH:        'sketch',

  // Prints subcategories
  PRINT_LITHOGRAPH:      'lithograph',
  PRINT_ETCHING:         'etching',
  PRINT_SCREENPRINT:     'screenprint',
  PRINT_WOODCUT:         'woodcut',
  PRINT_ENGRAVING:       'engraving',
  PRINT_AQUATINT:        'aquatint',
  PRINT_POSTER:          'poster',
  PRINT_GRAPHIC_DESIGN:  'graphic-design',
  PRINT_DIGITAL:         'digital-print',
  PRINT_LETTERPRESS:     'letterpress',
  PRINT_GRAVURE:         'gravure',

  // Paintings subcategories
  PAINTING_OIL:          'oil-painting',
  PAINTING_WATERCOLOR:   'watercolor',
  PAINTING_ACRYLIC:      'acrylic',
  PAINTING_GOUACHE:      'gouache',
  PAINTING_TEMPERA:      'tempera',
  PAINTING_PORTRAIT:     'portrait-painting',
  PAINTING_LANDSCAPE:    'landscape-painting',
  PAINTING_STILL_LIFE:   'still-life-painting',
  PAINTING_MINIATURE:    'miniature-painting',

  // Sculpture subcategories
  SCULPTURE_BRONZE:      'bronze',
  SCULPTURE_MARBLE:      'marble',
  SCULPTURE_WOOD:        'wood-sculpture',
  SCULPTURE_CERAMIC:     'ceramic-sculpture',
  SCULPTURE_RELIEF:      'relief',
  SCULPTURE_FIGURATIVE:  'figurative',
  SCULPTURE_ABSTRACT:    'abstract-sculpture',
  SCULPTURE_MEDAL:       'medal',
  SCULPTURE_STATUETTE:   'statuette',

  // Decorative Arts subcategories
  DECOR_FURNITURE:       'furniture',
  DECOR_CERAMICS:        'ceramics',
  DECOR_GLASS:           'glass',
  DECOR_METALWORK:       'metalwork',
  DECOR_JEWELRY:         'jewelry',
  DECOR_VESSEL:          'vessel',
  DECOR_LIGHTING:        'lighting',

  // Textiles subcategories
  TEXTILE_COSTUME:       'costume',
  TEXTILE_WALLPAPER:     'wallpaper',
  TEXTILE_TAPESTRY:      'tapestry',
  TEXTILE_FABRIC:        'fabric',
  TEXTILE_SAMPLE:        'textile-sample',
  TEXTILE_EMBROIDERY:    'embroidery',

  // Architecture subcategories
  ARCH_DRAWING:          'architectural-drawing',
  ARCH_MODEL:            'architectural-model',
  ARCH_PHOTOGRAPH:       'architectural-photograph',
  ARCH_PLAN:             'plan',
  ARCH_ELEVATION:        'elevation',
  ARCH_SECTION:          'section',

  // Books & Manuscripts subcategories
  BOOK_MAGAZINE:         'magazine',
  BOOK_BOOK:             'book',
  BOOK_PERIODICAL:       'periodical',
  BOOK_EPHEMERA:         'ephemera',
  BOOK_MANUSCRIPT:       'manuscript',
  BOOK_CATALOGUE:        'catalogue',
};

// ============================================================================
// CLASSIFICATION → MAIN CATEGORY + SUBCATEGORY
// Returns: { main: 'prints', sub: 'lithograph' }
//
// ⚠  'design' is intentionally ABSENT from this map.
//    Items with classification='design' fall through to Tier 5 (medium-based)
//    detection in category-rules.js, which routes each item correctly.
// ============================================================================

const CLASSIFICATION_MAP = {

  // ── Photographs ────────────────────────────────────────────────────────────
  'photographs':                              { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'photography':                              { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'photograph':                               { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'photographic print':                       { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'internal dye diffusion transfer print':    { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'gelatin silver (developing-out-paper) pr': { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'color photograph':                         { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'daguerreotype':                            { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'negatives':                                { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'silver-dye bleach print':                  { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'black-and-white photography':              { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'inkjet print':                             { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: SUBCATEGORIES.PRINT_DIGITAL },
  'albumen silver print':                     { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'gelatin silver printing-out-paper print':  { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'albumen print from collodion negative':    { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'palladium print':                          { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'portrait':                                 { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: SUBCATEGORIES.PHOTO_PORTRAIT },

  // ── Drawings ───────────────────────────────────────────────────────────────
  'drawing':                                  { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'drawings':                                 { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'drawings (visual works)':                  { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'pen and ink drawings':                     { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'graphite':                                 { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'charcoal':                                 { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'colored pencil':                           { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'drawing?':                                 { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'design drawing':                           { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'sketchbook':                               { main: MAIN_CATEGORIES.DRAWINGS,          sub: SUBCATEGORIES.DRAWING_SKETCH },
  'fiber-tipped pen':                         { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'crayon':                                   { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'ball-point pen':                           { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'ink on paper':                             { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'architectural drawing':                    { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: SUBCATEGORIES.ARCH_DRAWING },
  'presentation drawing':                     { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: SUBCATEGORIES.ARCH_DRAWING },

  // ── Prints ─────────────────────────────────────────────────────────────────
  'print':                                    { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'prints':                                   { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'prints and drawing':                       { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'lithograph':                               { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'etching':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ETCHING },
  'screenprint':                              { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'woodcut':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_WOODCUT },
  'woodblock':                                { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_WOODCUT },
  'woodblock print':                          { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_WOODCUT },
  'aquatint':                                 { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_AQUATINT },
  'linocut':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'relief etching':                           { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ETCHING },
  'relief print':                             { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'offset lithograph':                        { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'zincograph':                               { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'photo lithograph':                         { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'photolithograph':                          { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'letterpress':                              { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LETTERPRESS },
  'gravure':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAVURE },
  'rotogravure':                              { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAVURE },
  'photogravure':                             { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAVURE },
  'silkscreen':                               { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'serigraph':                                { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'drypoint':                                 { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ETCHING },
  'mezzotint':                                { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'engraving':                                { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'collotype':                                { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'diazo print':                              { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'stencil':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'lineblock':                                { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'line block':                               { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'monotype':                                 { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'bound print':                              { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'ornamentprent':                            { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'peep-show print':                          { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'chromolithograph print':                   { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'screentone':                               { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'multiple':                                 { main: MAIN_CATEGORIES.PRINTS,            sub: null },

  // ── Posters (subcategory of prints) ────────────────────────────────────────
  'poster':                                   { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_POSTER },
  'posters':                                  { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_POSTER },
  'poster announcement':                      { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_POSTER },

  // ── Paintings ──────────────────────────────────────────────────────────────
  'painting':                                 { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'paintings':                                { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'oil on canvas':                            { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_OIL },
  'oil paintings (visual works)':             { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_OIL },
  'acrylic paintings (visual works)':         { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_ACRYLIC },
  'watercolor':                               { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_WATERCOLOR },
  'miniature painting':                       { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'miniature':                                { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'oil on panel':                             { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_OIL },
  'oil on board':                             { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_OIL },
  'european painting':                        { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'gouache':                                  { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_GOUACHE },
  'pastel':                                   { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'mural':                                    { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'collage':                                  { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'mixed media':                              { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'mixed media/collage':                      { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },

  // ── Sculpture ──────────────────────────────────────────────────────────────
  'sculpture':                                { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'sculptures':                               { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'sculpture-bronze':                         { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_BRONZE },
  'sculpture-miniature':                      { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_STATUETTE },
  'sculpture-architectural':                  { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'bronze':                                   { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_BRONZE },
  'medals and plaquettes':                    { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_MEDAL },
  'statuette':                                { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_STATUETTE },
  'lapidary work-gems':                       { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_JEWELRY },
  'lapidary work':                            { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_JEWELRY },
  'stone':                                    { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_MARBLE },
  'stelae':                                   { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'amulet':                                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_JEWELRY },
  'dolls (figurines)':                        { main: MAIN_CATEGORIES.SCULPTURE,         sub: SUBCATEGORIES.SCULPTURE_FIGURATIVE },

  // ── Architecture ───────────────────────────────────────────────────────────
  'architecture':                             { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: null },
  'mies van der rohe archive':                { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: null },
  'architectural fragment':                   { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: null },
  'architectural detail':                     { main: MAIN_CATEGORIES.ARCHITECTURE,      sub: null },

  // ── Textiles ───────────────────────────────────────────────────────────────
  'textile':                                  { main: MAIN_CATEGORIES.TEXTILES,          sub: null },
  'textiles-woven':                           { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'textiles-embroidered':                     { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'printed textile':                          { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'sidewall':                                 { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'border':                                   { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling paper':                            { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'frieze':                                   { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall - fragment':                      { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall and border':                      { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall and borders':                     { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall/border':                          { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall sample':                          { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'borders':                                  { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'border, cut-out':                          { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling border':                           { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling':                                  { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'dado':                                     { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'wallpaper':                                { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'cotton':                                   { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'wool':                                     { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'basketry':                                 { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'weaving - printed':                        { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'weaving':                                  { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'needlework (visual works)':                { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'embroidery: mughal type':                  { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'samples':                                  { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'sample':                                   { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'textile fragment':                         { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'imitation leather':                        { main: MAIN_CATEGORIES.TEXTILES,          sub: null },

  // ── Furniture → Decorative Arts ────────────────────────────────────────────
  'furniture':                                { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_FURNITURE },
  'case furniture':                           { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_FURNITURE },
  'lighting':                                 { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_LIGHTING },
  'mirror':                                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_FURNITURE },
  'wood':                                     { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_FURNITURE },

  // ── Decorative Arts ────────────────────────────────────────────────────────
  // ⚠  'design' is intentionally absent — see file header.
  'graphic design':                           { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'ceramics-porcelain':                       { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_CERAMICS },
  'ceramics-pottery':                         { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_CERAMICS },
  'ceramics':                                 { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_CERAMICS },
  'glass':                                    { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_GLASS },
  'vessel':                                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_VESSEL },
  'decorative arts':                          { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'jewelry':                                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_JEWELRY },
  'metalwork-silver':                         { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_METALWORK },
  'metalwork-gilt bronze':                    { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_METALWORK },
  'metalwork':                                { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_METALWORK },
  'enamels':                                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_METALWORK },
  'musical instrument':                       { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'earthenware':                              { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_CERAMICS },
  'stoneware':                                { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_CERAMICS },
  'vase':                                     { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_VESSEL },
  'teapot':                                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_VESSEL },
  'jars':                                     { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_VESSEL },
  'pitcher':                                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_VESSEL },
  'stained glass/leaded glass':               { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: SUBCATEGORIES.DECOR_GLASS },
  'ritual objects':                           { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'headdress - misc':                         { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_COSTUME },
  'sport equipment':                          { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },

  // ── Books & Manuscripts ────────────────────────────────────────────────────
  'illustrated book':                         { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'japanese magazine':                        { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'game magazine':                            { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'music magazine':                           { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'periodical':                               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_PERIODICAL },
  'periodicals':                              { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_PERIODICAL },
  'archival material':                        { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'albums':                                   { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'books':                                    { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'book':                                     { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'bandbox':                                  { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'bandbox and lid':                          { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'stationery':                               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'calendar':                                 { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'envelope':                                 { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'brochure':                                 { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'book cover':                               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'record sleeve':                            { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'cd graphics':                              { main: MAIN_CATEGORIES.PRINTS,            sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'manuscript materials':                     { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MANUSCRIPT },
  'miniatures':                               { main: MAIN_CATEGORIES.PAINTINGS,         sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'album page':                               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },

  // ── New Media / Installations ──────────────────────────────────────────────
  'installation':                             { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'time-based works':                         { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'time based media':                         { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'video art':                                { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'sound installation':                       { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'computer monitor':                         { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'prototype':                                { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
};

// ============================================================================
// OBJECTTYPE MAP
//
// Used at Tier 2 / Tier 4 in category-rules.js when classification is absent
// or uninformative. Critical for V&A items, which carry no classification but
// have accurate objectType values (Drawing, Print, Poster, Block print, etc.).
// Without this populated, every such item falls to the absolute decorative-arts
// fallback.
//
// Keys must be lowercase — category-rules.js normalize() lowercases before lookup.
// ============================================================================

const OBJECTTYPE_MAP = {

  // ── Prints ─────────────────────────────────────────────────────────────────
  'print':                  { main: MAIN_CATEGORIES.PRINTS,             sub: null },
  'print ':                 { main: MAIN_CATEGORIES.PRINTS,             sub: null }, // trailing-space variant in V&A data
  'block print':            { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_WOODCUT },
  'screenprint':            { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'screen print':           { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'etching':                { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_ETCHING },
  'lithograph':             { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'woodcut':                { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_WOODCUT },
  'wood engraving':         { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_WOODCUT },
  'engraving':              { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'aquatint':               { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_AQUATINT },
  'drypoint':               { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_ETCHING },
  'linocut':                { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'tinsel print':           { main: MAIN_CATEGORIES.PRINTS,             sub: null },
  'digital inkjet print':   { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_DIGITAL },
  'japanese print':         { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_WOODCUT },
  'colour print':           { main: MAIN_CATEGORIES.PRINTS,             sub: null },

  // ── Posters ────────────────────────────────────────────────────────────────
  'poster':                 { main: MAIN_CATEGORIES.PRINTS,             sub: SUBCATEGORIES.PRINT_POSTER },

  // ── Drawings ───────────────────────────────────────────────────────────────
  'drawing':                { main: MAIN_CATEGORIES.DRAWINGS,           sub: null },
  'contract drawing':       { main: MAIN_CATEGORIES.DRAWINGS,           sub: SUBCATEGORIES.DRAWING_ARCHITECTURAL },

  // ── Photographs ────────────────────────────────────────────────────────────
  'photograph':             { main: MAIN_CATEGORIES.PHOTOGRAPHS,        sub: null },
  'carte-de-visite':        { main: MAIN_CATEGORIES.PHOTOGRAPHS,        sub: SUBCATEGORIES.PHOTO_PORTRAIT },

  // ── Paintings ──────────────────────────────────────────────────────────────
  'oil painting':           { main: MAIN_CATEGORIES.PAINTINGS,          sub: SUBCATEGORIES.PAINTING_OIL },
  'watercolour':            { main: MAIN_CATEGORIES.PAINTINGS,          sub: SUBCATEGORIES.PAINTING_WATERCOLOR },
  'miniature':              { main: MAIN_CATEGORIES.PAINTINGS,          sub: SUBCATEGORIES.PAINTING_MINIATURE },

  // ── Textiles ───────────────────────────────────────────────────────────────
  'furnishing fabric':      { main: MAIN_CATEGORIES.TEXTILES,           sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'scarf':                  { main: MAIN_CATEGORIES.TEXTILES,           sub: SUBCATEGORIES.TEXTILE_COSTUME },
  'wallpaper':              { main: MAIN_CATEGORIES.TEXTILES,           sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'suit':                   { main: MAIN_CATEGORIES.TEXTILES,           sub: SUBCATEGORIES.TEXTILE_COSTUME },

  // ── Books & Manuscripts ────────────────────────────────────────────────────
  'album':                  { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_BOOK },
  'leaflet':                { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'song sheet':             { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'magazine':               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'magezine':               { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_MAGAZINE }, // Zurich data typo
  'book':                   { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_BOOK },
  'periodical':             { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS,  sub: SUBCATEGORIES.BOOK_PERIODICAL },

  // ── Decorative Arts ────────────────────────────────────────────────────────
  'armchair':               { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_FURNITURE },
  'cabinet':                { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_FURNITURE },
  'table lamp':             { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_LIGHTING },
  'vase':                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_VESSEL },
  'plate':                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_CERAMICS },
  'jardinière':             { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_VESSEL },
  'cup':                    { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_VESSEL },
  'brooch':                 { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_JEWELRY },
  'cameo':                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_JEWELRY },
  'intaglio':               { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_JEWELRY },
  'tazza':                  { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_VESSEL },
  'fire screen':            { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_METALWORK },
  'plaque':                 { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_METALWORK },
  'hanukkah lamp':          { main: MAIN_CATEGORIES.DECORATIVE_ARTS,    sub: SUBCATEGORIES.DECOR_LIGHTING },

  // ── Sculpture ──────────────────────────────────────────────────────────────
  'sculpture':              { main: MAIN_CATEGORIES.SCULPTURE,          sub: null },
  'relief':                 { main: MAIN_CATEGORIES.SCULPTURE,          sub: SUBCATEGORIES.SCULPTURE_RELIEF },
  'statuette':              { main: MAIN_CATEGORIES.SCULPTURE,          sub: SUBCATEGORIES.SCULPTURE_STATUETTE },
  'medallion':              { main: MAIN_CATEGORIES.SCULPTURE,          sub: SUBCATEGORIES.SCULPTURE_MEDAL },
  'plaquette':              { main: MAIN_CATEGORIES.SCULPTURE,          sub: SUBCATEGORIES.SCULPTURE_MEDAL },
};

// ============================================================================
// DEPARTMENT MAP
//
// Used at Tier 6 in category-rules.js after classification and objectType
// lookups have both failed. Provides meaningful signal from MET and MoMA
// department strings.
//
// Keys must be lowercase — category-rules.js normalize() lowercases before lookup.
// ============================================================================

const DEPARTMENT_MAP = {

  // ── MET departments ────────────────────────────────────────────────────────
  'photographs':                                      { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'drawings and prints':                              { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'drawings, prints, and graphic arts':               { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'paintings':                                        { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'european paintings':                               { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'american paintings and sculpture':                 { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'modern and contemporary art':                      { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'european sculpture and decorative arts':           { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'decorative arts and design':                       { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'costume institute':                                { main: MAIN_CATEGORIES.TEXTILES,          sub: SUBCATEGORIES.TEXTILE_COSTUME },
  'textile conservation':                             { main: MAIN_CATEGORIES.TEXTILES,          sub: null },
  'arms and armor':                                   { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'ancient near eastern art':                         { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'egyptian art':                                     { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'greek and roman art':                              { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'asian art':                                        { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'medieval art':                                     { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'the cloisters':                                    { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },

  // ── MoMA departments ───────────────────────────────────────────────────────
  // 'architecture & design' only fires here when medium gives no signal at all.
  // If medium is present, Tier 5 (MEDIUM_KEYWORDS) will catch it first.
  'architecture & design':                            { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'prints and illustrated books':                     { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'drawings':                                         { main: MAIN_CATEGORIES.DRAWINGS,          sub: null },
  'painting and sculpture':                           { main: MAIN_CATEGORIES.PAINTINGS,         sub: null },
  'film':                                             { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'media and performance':                            { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },

  // ── ARTIC departments ──────────────────────────────────────────────────────
  'european decorative arts':                         { main: MAIN_CATEGORIES.DECORATIVE_ARTS,   sub: null },
  'african art and indian art of the americas':       { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'ancient and byzantine art':                        { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'arts of the ancient mediterranean and byzantium':  { main: MAIN_CATEGORIES.SCULPTURE,         sub: null },
  'photography and media':                            { main: MAIN_CATEGORIES.PHOTOGRAPHS,       sub: null },
  'prints and drawings':                              { main: MAIN_CATEGORIES.PRINTS,            sub: null },
  'textiles':                                         { main: MAIN_CATEGORIES.TEXTILES,          sub: null },
};

// ============================================================================
// MEDIUM KEYWORDS
//
// Ordered array of { keywords, main, sub } entries used by category-rules.js
// Tier 5 — the critical layer that rescues all the cls='design' items that were
// previously dumped wholesale into decorative-arts.
//
// First matching entry wins. ORDER IS CRITICAL:
//   1. Photography before generic 'silver' or 'print'
//   2. Specific print techniques before generic 'paper'
//   3. Drawing media before generic 'ink'
//   4. Painting oil variants before generic 'oil'
//   5. Textile compounds (not bare fiber words — 'cotton' appears in
//      printmaking descriptions like 'screenprint on cotton')
// ============================================================================

const MEDIUM_KEYWORDS = [

  // ── Photography (must come first — overlaps with prints vocabulary) ─────────
  {
    keywords: [
      'gelatin silver', 'albumen print', 'albumen silver', 'daguerreotype',
      'silver gelatin', 'chromogenic print', 'dye transfer print', 'cyanotype',
      'calotype', 'tintype', 'ambrotype', 'collodion print', 'palladium print',
      'platinum print', 'carbon print', 'gum bichromate', 'salt print',
      'photographic paper', 'color photograph', 'silver dye bleach',
      'internal dye diffusion'
    ],
    main: MAIN_CATEGORIES.PHOTOGRAPHS,
    sub: null
  },

  // ── Print techniques (specific → generic) ──────────────────────────────────
  {
    keywords: [
      'lithograph', 'lithography', 'offset lithograph', 'photolithograph',
      'photo lithograph', 'auto lithograph', 'chromolithograph',
      'photo offset lithograph', 'gouache-lithograph', 'lithograph of gouache',
      // MoMA typo variants found in live data:
      'lithgraph', 'liithograph', 'lithogaph', 'ltihograph', 'liithograph',
      'lithographs', 'lithography'
    ],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_LITHOGRAPH
  },
  {
    keywords: [
      'screenprint', 'screen print', 'silkscreen', 'silk screen',
      'serigraph', 'serigraphy', 'screen printed', 'screenprinted',
      'screen-printed', 'silk-screen'
    ],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_SCREENPRINT
  },
  {
    keywords: ['woodcut', 'woodblock', 'wood-cut', 'wood cut', 'wood engraving'],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_WOODCUT
  },
  {
    keywords: [
      'etching', 'aquatint', 'drypoint', 'mezzotint',
      'zinc etching', 'relief etching', 'soft-ground etching'
    ],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_ETCHING
  },
  {
    keywords: ['engraving', 'line engraving'],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_ENGRAVING
  },
  {
    keywords: [
      'letterpress', 'gravure', 'rotogravure', 'photogravure',
      'lineblock', 'line block', 'linocut', 'linoleum cut',
      'collotype', 'heliograph', 'diazo print', 'flexograph',
      'monotype', 'pochoir', 'stencil print', 'digital print',
      'inkjet print', 'thermography', 'relief print', 'zincograph',
      'halftone', 'photomechanical', 'offset print'
    ],
    main: MAIN_CATEGORIES.PRINTS,
    sub: null
  },

  // ── Posters ────────────────────────────────────────────────────────────────
  // (medium contains 'poster' but no finer print technique detected above)
  {
    keywords: ['gouache-lithograph poster', 'poster, gouache', 'poster; product'],
    main: MAIN_CATEGORIES.PRINTS,
    sub: SUBCATEGORIES.PRINT_POSTER
  },

  // ── Drawing media ──────────────────────────────────────────────────────────
  {
    keywords: [
      'graphite', 'pencil on paper', 'pencil on board', 'pencil on tracing',
      'charcoal on paper', 'red chalk', 'black chalk', 'white chalk',
      'conte', 'sanguine', 'crayon on paper',
      'wash drawing', 'pen and ink', 'pen and brown ink', 'pen and black ink',
      'pen and wash', 'brush and ink', 'brush and wash',
      'brush and brown ink', 'ink and wash', 'pen, wash',
      'pen and watercolour', 'pen and watercolor',
      'graphite on paper', 'ink on board', 'brush and gouache on paper',
      'sepia', 'bistre'
    ],
    main: MAIN_CATEGORIES.DRAWINGS,
    sub: null
  },

  // ── Paintings ──────────────────────────────────────────────────────────────
  {
    keywords: [
      'oil on canvas', 'oil on panel', 'oil on board', 'oil on linen',
      'oil on masonite', 'oil on wood', 'oil on copper', 'oil on paper',
      'oil on composition board', 'oil on hardboard'
    ],
    main: MAIN_CATEGORIES.PAINTINGS,
    sub: SUBCATEGORIES.PAINTING_OIL
  },
  {
    keywords: ['watercolor on paper', 'watercolour on paper', 'watercolor and gouache on paper'],
    main: MAIN_CATEGORIES.PAINTINGS,
    sub: SUBCATEGORIES.PAINTING_WATERCOLOR
  },
  {
    keywords: ['acrylic on canvas', 'acrylic on board', 'acrylic paint on'],
    main: MAIN_CATEGORIES.PAINTINGS,
    sub: SUBCATEGORIES.PAINTING_ACRYLIC
  },
  {
    keywords: ['gouache on paper', 'gouache and pencil on paper', 'gouache and ink on paper'],
    main: MAIN_CATEGORIES.PAINTINGS,
    sub: SUBCATEGORIES.PAINTING_GOUACHE
  },
  {
    keywords: ['tempera on board', 'tempera on panel', 'tempera on paper', 'tempera on composition'],
    main: MAIN_CATEGORIES.PAINTINGS,
    sub: SUBCATEGORIES.PAINTING_TEMPERA
  },

  // ── Sculpture materials ────────────────────────────────────────────────────
  {
    keywords: ['cast bronze', 'spun bronze', 'gilt bronze', 'patinated bronze'],
    main: MAIN_CATEGORIES.SCULPTURE,
    sub: SUBCATEGORIES.SCULPTURE_BRONZE
  },
  {
    keywords: ['carved marble', 'carved stone', 'sandstone', 'limestone', 'basalt', 'granite'],
    main: MAIN_CATEGORIES.SCULPTURE,
    sub: SUBCATEGORIES.SCULPTURE_MARBLE
  },

  // ── Ceramics / glass / metalwork ──────────────────────────────────────────
  {
    keywords: [
      'glazed porcelain', 'glazed earthenware', 'glazed stoneware', 'glazed ceramic',
      'unglazed porcelain', 'unglazed stoneware', 'cast porcelain', 'bone china',
      'faience', 'majolica', 'slip-cast', 'wood-fired stoneware',
      'hand-thrown stoneware', 'hand-thrown pottery', 'bizen-ware', 'shigaraki-ware'
    ],
    main: MAIN_CATEGORIES.DECORATIVE_ARTS,
    sub: SUBCATEGORIES.DECOR_CERAMICS
  },
  {
    keywords: [
      'hand-blown glass', 'mold-blown glass', 'blown glass', 'favrile glass',
      'lead crystal', 'borosilicate glass', 'stained glass', 'cut glass',
      'flashed glass', 'acid-etched glass', 'slumped glass', 'pressed glass'
    ],
    main: MAIN_CATEGORIES.DECORATIVE_ARTS,
    sub: SUBCATEGORIES.DECOR_GLASS
  },
  {
    keywords: [
      'electroplated silver', 'sterling silver', 'silver-plated', 'silver plate',
      'handwrought silver', 'hammered silver', 'hand-wrought silver',
      'pewter', 'nickel-plated', 'chrome-plated tubular steel',
      'chrome-plated steel', 'chrome-plated metal'
    ],
    main: MAIN_CATEGORIES.DECORATIVE_ARTS,
    sub: SUBCATEGORIES.DECOR_METALWORK
  },

  // ── Textiles ───────────────────────────────────────────────────────────────
  // Uses compound/specific phrases only. Bare fiber words ('cotton', 'silk',
  // 'linen') are NOT matched here because they appear throughout printmaking
  // medium descriptions (e.g. 'screenprint on cotton', 'letterpress on linen')
  // and would cause false positives.
  {
    keywords: [
      'woven cotton', 'printed cotton', 'cotton damask', 'mercerized cotton',
      'woven wool', 'hand-woven wool', 'wool felt', 'hand-spun wool', 'wool knit',
      'woven linen', 'hand-woven linen', 'linen bobbin lace',
      'woven silk', 'silk brocade', 'silk damask',
      'tapestry weave', 'embroidery on', 'needlepoint',
      'horsehair and chenille', 'jute and wool',
      'cellophane and cotton', 'rayon and cotton'
    ],
    main: MAIN_CATEGORIES.TEXTILES,
    sub: SUBCATEGORIES.TEXTILE_FABRIC
  },
];

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MAIN_CATEGORIES,
  SUBCATEGORIES,
  CLASSIFICATION_MAP,
  OBJECTTYPE_MAP,
  DEPARTMENT_MAP,
  MEDIUM_KEYWORDS
};