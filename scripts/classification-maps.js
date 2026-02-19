/**
 * INDUSTRY-STANDARD MUSEUM CLASSIFICATION SYSTEM
 * Based on Getty, MET, MoMA, and international museum standards
 */

// ============================================================================
// MAIN CATEGORIES (Industry Standard - 9 Core Categories)
// ============================================================================

const MAIN_CATEGORIES = {
  PHOTOGRAPHS: 'photographs',
  DRAWINGS: 'drawings',
  PRINTS: 'prints',
  PAINTINGS: 'paintings',
  SCULPTURE: 'sculpture',
  DECORATIVE_ARTS: 'decorative-arts',
  TEXTILES: 'textiles',
  ARCHITECTURE: 'architecture',
  BOOKS_MANUSCRIPTS: 'books-manuscripts'
};

// ============================================================================
// SUBCATEGORIES (Granular Classification)
// ============================================================================

const SUBCATEGORIES = {
  // Photographs subcategories
  PHOTO_PORTRAIT: 'portrait',
  PHOTO_LANDSCAPE: 'landscape',
  PHOTO_DOCUMENTARY: 'documentary',
  PHOTO_FASHION: 'fashion',
  PHOTO_STILL_LIFE: 'still-life',
  PHOTO_ABSTRACT: 'abstract',
  PHOTO_ARCHITECTURAL: 'architectural-photography',
  PHOTO_STUDIO: 'studio-photography',
  
  // Drawings subcategories
  DRAWING_STUDY: 'study',
  DRAWING_FIGURE: 'figure-drawing',
  DRAWING_LANDSCAPE: 'landscape-drawing',
  DRAWING_ARCHITECTURAL: 'architectural-drawing',
  DRAWING_PREPARATORY: 'preparatory-drawing',
  DRAWING_SKETCH: 'sketch',
  
  // Prints subcategories
  PRINT_LITHOGRAPH: 'lithograph',
  PRINT_ETCHING: 'etching',
  PRINT_SCREENPRINT: 'screenprint',
  PRINT_WOODCUT: 'woodcut',
  PRINT_ENGRAVING: 'engraving',
  PRINT_AQUATINT: 'aquatint',
  PRINT_POSTER: 'poster',
  PRINT_GRAPHIC_DESIGN: 'graphic-design',
  PRINT_DIGITAL: 'digital-print',
  
  // Paintings subcategories
  PAINTING_OIL: 'oil-painting',
  PAINTING_WATERCOLOR: 'watercolor',
  PAINTING_ACRYLIC: 'acrylic',
  PAINTING_GOUACHE: 'gouache',
  PAINTING_TEMPERA: 'tempera',
  PAINTING_PORTRAIT: 'portrait-painting',
  PAINTING_LANDSCAPE: 'landscape-painting',
  PAINTING_STILL_LIFE: 'still-life-painting',
  PAINTING_MINIATURE: 'miniature-painting',
  
  // Sculpture subcategories
  SCULPTURE_BRONZE: 'bronze',
  SCULPTURE_MARBLE: 'marble',
  SCULPTURE_WOOD: 'wood-sculpture',
  SCULPTURE_CERAMIC: 'ceramic-sculpture',
  SCULPTURE_RELIEF: 'relief',
  SCULPTURE_FIGURATIVE: 'figurative',
  SCULPTURE_ABSTRACT: 'abstract-sculpture',
  SCULPTURE_MEDAL: 'medal',
  SCULPTURE_STATUETTE: 'statuette',
  
  // Decorative Arts subcategories
  DECOR_FURNITURE: 'furniture',
  DECOR_CERAMICS: 'ceramics',
  DECOR_GLASS: 'glass',
  DECOR_METALWORK: 'metalwork',
  DECOR_JEWELRY: 'jewelry',
  DECOR_VESSEL: 'vessel',
  DECOR_LIGHTING: 'lighting',
  
  // Textiles subcategories
  TEXTILE_COSTUME: 'costume',
  TEXTILE_WALLPAPER: 'wallpaper',
  TEXTILE_TAPESTRY: 'tapestry',
  TEXTILE_FABRIC: 'fabric',
  TEXTILE_SAMPLE: 'textile-sample',
  TEXTILE_EMBROIDERY: 'embroidery',
  
  // Architecture subcategories
  ARCH_DRAWING: 'architectural-drawing',
  ARCH_MODEL: 'architectural-model',
  ARCH_PHOTOGRAPH: 'architectural-photograph',
  ARCH_PLAN: 'plan',
  ARCH_ELEVATION: 'elevation',
  ARCH_SECTION: 'section',
  
  // Books & Manuscripts subcategories
  BOOK_MAGAZINE: 'magazine',
  BOOK_BOOK: 'book',
  BOOK_PERIODICAL: 'periodical',
  BOOK_EPHEMERA: 'ephemera',
  BOOK_MANUSCRIPT: 'manuscript',
  BOOK_CATALOGUE: 'catalogue',
};

// ============================================================================
// CLASSIFICATION → MAIN CATEGORY + SUBCATEGORY
// Returns: { main: 'prints', sub: 'lithograph' }
// ============================================================================

const CLASSIFICATION_MAP = {
  // Photographs
  'photographs': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'photography': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'photograph': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'photographic print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'internal dye diffusion transfer print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'gelatin silver (developing-out-paper) pr': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'color photograph': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'daguerreotype': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'negatives': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'silver-dye bleach print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'black-and-white photography': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'inkjet print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: SUBCATEGORIES.PRINT_DIGITAL },
  'albumen silver print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'gelatin silver printing-out-paper print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'albumen print from collodion negative': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'palladium print': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null },
  'portrait': { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: SUBCATEGORIES.PHOTO_PORTRAIT },
  
  // Drawings
  'drawing': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'drawings': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'drawings (visual works)': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'pen and ink drawings': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'graphite': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'charcoal': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'colored pencil': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'drawing?': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'design drawing': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'sketchbook': { main: MAIN_CATEGORIES.DRAWINGS, sub: SUBCATEGORIES.DRAWING_SKETCH },
  'fiber-tipped pen': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'crayon': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'ball-point pen': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'ink on paper': { main: MAIN_CATEGORIES.DRAWINGS, sub: null },
  'architectural drawing': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: SUBCATEGORIES.ARCH_DRAWING },
  'presentation drawing': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: SUBCATEGORIES.ARCH_DRAWING },
  
  // Prints
  'print': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'prints': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'prints and drawing': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'lithograph': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'etching': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_ETCHING },
  'screenprint': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'woodcut': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_WOODCUT },
  'woodblock': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_WOODCUT },
  'woodblock print': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_WOODCUT },
  'aquatint': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_AQUATINT },
  'linocut': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_ENGRAVING },
  'relief etching': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_ETCHING },
  'offset lithograph': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'zincograph': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'photo lithograph': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'bound print': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'ornamentprent': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'peep-show print': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  'chromolithograph print': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH },
  'screentone': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_SCREENPRINT },
  'multiple': { main: MAIN_CATEGORIES.PRINTS, sub: null },
  
  // Posters (subcategory of prints)
  'poster': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_POSTER },
  'posters': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_POSTER },
  'poster announcement': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_POSTER },
  
  // Paintings
  'painting': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'paintings': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'oil on canvas': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_OIL },
  'oil paintings (visual works)': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_OIL },
  'acrylic paintings (visual works)': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_ACRYLIC },
  'watercolor': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_WATERCOLOR },
  'miniature painting': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'miniature': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'oil on panel': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_OIL },
  'oil on board': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_OIL },
  'european painting': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'gouache': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_GOUACHE },
  'pastel': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'mural': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'collage': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'mixed media': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  'mixed media/collage': { main: MAIN_CATEGORIES.PAINTINGS, sub: null },
  
  // Sculpture
  'sculpture': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'sculptures': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'sculpture-bronze': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_BRONZE },
  'sculpture-miniature': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_STATUETTE },
  'sculpture-architectural': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'bronze': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_BRONZE },
  'medals and plaquettes': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_MEDAL },
  'statuette': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_STATUETTE },
  'lapidary work-gems': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_JEWELRY },
  'lapidary work': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_JEWELRY },
  'stone': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_MARBLE },
  'stelae': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'amulet': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_JEWELRY },
  'dolls (figurines)': { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_FIGURATIVE },
  
  // Architecture
  'architecture': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: null },
  'mies van der rohe archive': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: null },
  'architectural fragment': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: null },
  'architectural detail': { main: MAIN_CATEGORIES.ARCHITECTURE, sub: null },
  
  // Textiles
  'textile': { main: MAIN_CATEGORIES.TEXTILES, sub: null },
  'textiles-woven': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'textiles-embroidered': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'printed textile': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'sidewall': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'border': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling paper': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'frieze': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall - fragment': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall and border': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall and borders': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall/border': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'sidewall sample': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'borders': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'border, cut-out': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling border': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'ceiling': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'dado': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'wallpaper': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER },
  'cotton': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'wool': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'basketry': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'weaving - printed': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'weaving': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC },
  'needlework (visual works)': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'embroidery: mughal type': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_EMBROIDERY },
  'samples': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'sample': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'textile fragment': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_SAMPLE },
  'imitation leather': { main: MAIN_CATEGORIES.TEXTILES, sub: null },
  
  // Furniture → Decorative Arts
  'furniture': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_FURNITURE },
  'case furniture': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_FURNITURE },
  'lighting': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_LIGHTING },
  'mirror': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_FURNITURE },
  'wood': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_FURNITURE },
  
  // Decorative Arts
  'design': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'graphic design': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'ceramics-porcelain': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS },
  'ceramics-pottery': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS },
  'ceramics': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS },
  'glass': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_GLASS },
  'vessel': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_VESSEL },
  'decorative arts': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'jewelry': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_JEWELRY },
  'metalwork-silver': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_METALWORK },
  'metalwork-gilt bronze': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_METALWORK },
  'metalwork': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_METALWORK },
  'enamels': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_METALWORK },
  'musical instrument': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'earthenware': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS },
  'stoneware': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS },
  'vase': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_VESSEL },
  'teapot': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_VESSEL },
  'jars': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_VESSEL },
  'pitcher': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_VESSEL },
  'stained glass/leaded glass': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_GLASS },
  'ritual objects': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'headdress - misc': { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_COSTUME },
  'sport equipment': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  
  // Books & Manuscripts
  'illustrated book': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'japanese magazine': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'game magazine': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'music magazine': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE },
  'periodical': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_PERIODICAL },
  'periodicals': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_PERIODICAL },
  'archival material': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'albums': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'books': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'book': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'bandbox': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'bandbox and lid': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'stationery': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'calendar': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'envelope': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'brochure': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_EPHEMERA },
  'book cover': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  'record sleeve': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'cd graphics': { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_GRAPHIC_DESIGN },
  'manuscript materials': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MANUSCRIPT },
  'miniatures': { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_MINIATURE },
  'album page': { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_BOOK },
  
  // New media / installations
  'installation': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'time-based works': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'time based media': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'video art': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'sound installation': { main: MAIN_CATEGORIES.SCULPTURE, sub: null },
  'computer monitor': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
  'prototype': { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null },
};

const OBJECTTYPE_MAP = {};
const DEPARTMENT_MAP = {};
const MEDIUM_KEYWORDS = {};

// Similar structure for OBJECTTYPE_MAP, DEPARTMENT_MAP, MEDIUM_KEYWORDS
// (I'll provide the complete file but showing structure here)

module.exports = {
  MAIN_CATEGORIES,
  SUBCATEGORIES,
  CLASSIFICATION_MAP,
  OBJECTTYPE_MAP,
  DEPARTMENT_MAP,
  MEDIUM_KEYWORDS
};