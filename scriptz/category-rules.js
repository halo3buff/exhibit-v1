/**
 * BULLETPROOF CLASSIFICATION ENGINE
 * Returns: { main: 'prints', sub: 'lithograph' }
 */

const {
    MAIN_CATEGORIES,
    SUBCATEGORIES,
    CLASSIFICATION_MAP,
    OBJECTTYPE_MAP,
    DEPARTMENT_MAP,
    MEDIUM_KEYWORDS
  } = require('./classification-maps');
  
  function normalize(value) {
    if (!value) return '';
    return String(value).toLowerCase().trim();
  }
  
  function classifyArtwork(item) {
    const classification = normalize(item.classification || item.Classification);
    const objectType = normalize(item.objectType);
    const department = normalize(item.department || item.Department);
    const medium = normalize(item.medium || item.Medium);
    const source = normalize(item.source);
    
    // Default result
    let result = { main: null, sub: null };
    
    // TIER 1: EXACT CLASSIFICATION MATCH
    if (classification && CLASSIFICATION_MAP[classification]) {
      return CLASSIFICATION_MAP[classification];
    }
    
    // TIER 2: EXACT OBJECTTYPE MATCH
    if (objectType && OBJECTTYPE_MAP[objectType]) {
      return OBJECTTYPE_MAP[objectType];
    }
    
    // TIER 3: KEYWORD IN CLASSIFICATION
    if (classification) {
      for (const [key, value] of Object.entries(CLASSIFICATION_MAP)) {
        if (classification.includes(key)) {
          return value;
        }
      }
    }
    
    // TIER 4: KEYWORD IN OBJECTTYPE
    if (objectType) {
      for (const [key, value] of Object.entries(OBJECTTYPE_MAP)) {
        if (objectType.includes(key)) {
          return value;
        }
      }
    }
    
    // TIER 5: MEDIUM-BASED WITH SUBCATEGORY DETECTION
    if (medium) {
      // Check for print techniques
      if (medium.includes('lithograph')) {
        return { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_LITHOGRAPH };
      }
      if (medium.includes('etching')) {
        return { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_ETCHING };
      }
      if (medium.includes('screenprint') || medium.includes('serigraph')) {
        return { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_SCREENPRINT };
      }
      if (medium.includes('woodcut') || medium.includes('woodblock')) {
        return { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_WOODCUT };
      }
      if (medium.includes('engraving') || medium.includes('aquatint')) {
        return { main: MAIN_CATEGORIES.PRINTS, sub: SUBCATEGORIES.PRINT_ENGRAVING };
      }
      
      // Check for drawing media
      if (medium.includes('graphite') || medium.includes('pencil')) {
        return { main: MAIN_CATEGORIES.DRAWINGS, sub: null };
      }
      if (medium.includes('charcoal')) {
        return { main: MAIN_CATEGORIES.DRAWINGS, sub: null };
      }
      if (medium.includes('ink') && medium.includes('paper')) {
        return { main: MAIN_CATEGORIES.DRAWINGS, sub: null };
      }
      
      // Check for painting media
      if (medium.includes('oil on canvas') || medium.includes('oil on panel')) {
        return { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_OIL };
      }
      if (medium.includes('watercolor')) {
        return { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_WATERCOLOR };
      }
      if (medium.includes('acrylic')) {
        return { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_ACRYLIC };
      }
      if (medium.includes('gouache')) {
        return { main: MAIN_CATEGORIES.PAINTINGS, sub: SUBCATEGORIES.PAINTING_GOUACHE };
      }
      
      // Check for sculpture materials
      if (medium.includes('bronze')) {
        return { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_BRONZE };
      }
      if (medium.includes('marble') || medium.includes('stone')) {
        return { main: MAIN_CATEGORIES.SCULPTURE, sub: SUBCATEGORIES.SCULPTURE_MARBLE };
      }
      
      // Check for photography
      if (medium.includes('gelatin silver') || medium.includes('albumen') || 
          medium.includes('daguerreotype') || medium.includes('photograph')) {
        return { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null };
      }
      
      // Check for ceramics
      if (medium.includes('ceramic') || medium.includes('porcelain') || 
          medium.includes('earthenware') || medium.includes('stoneware')) {
        return { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: SUBCATEGORIES.DECOR_CERAMICS };
      }
      
      // Check for textiles
      if (medium.includes('fabric') || medium.includes('textile') || 
          medium.includes('cotton') || medium.includes('wool') || medium.includes('silk')) {
        return { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_FABRIC };
      }
      
      // Paper but not photography
      if (medium.includes('paper') && !medium.includes('photograph')) {
        if (medium.includes('graphite') || medium.includes('charcoal')) {
          return { main: MAIN_CATEGORIES.DRAWINGS, sub: null };
        }
        return { main: MAIN_CATEGORIES.PRINTS, sub: null };
      }
    }
    
    // TIER 6: DEPARTMENT-BASED
    if (department) {
      if (department.includes('photograph')) {
        return { main: MAIN_CATEGORIES.PHOTOGRAPHS, sub: null };
      }
      if (department.includes('drawings') && department.includes('prints')) {
        // Need medium to distinguish
        if (medium.includes('graphite') || medium.includes('charcoal')) {
          return { main: MAIN_CATEGORIES.DRAWINGS, sub: null };
        }
        return { main: MAIN_CATEGORIES.PRINTS, sub: null };
      }
      if (department.includes('painting')) {
        return { main: MAIN_CATEGORIES.PAINTINGS, sub: null };
      }
      if (department.includes('sculpture')) {
        return { main: MAIN_CATEGORIES.SCULPTURE, sub: null };
      }
      if (department.includes('costume')) {
        return { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_COSTUME };
      }
      if (department.includes('architecture') && department.includes('design')) {
        // Check for architecture hints
        if (classification.includes('architect') || objectType.includes('architect')) {
          return { main: MAIN_CATEGORIES.ARCHITECTURE, sub: null };
        }
        return { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null };
      }
    }
    
    // TIER 7: SOURCE-BASED DEFAULTS
    if (source.includes('cooper') || source.includes('hewitt')) {
      if (medium.includes('wallpaper') || classification.includes('sidewall')) {
        return { main: MAIN_CATEGORIES.TEXTILES, sub: SUBCATEGORIES.TEXTILE_WALLPAPER };
      }
      return { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null };
    }
    
    if (source.includes('zurich') || source.includes('archive')) {
      return { main: MAIN_CATEGORIES.BOOKS_MANUSCRIPTS, sub: SUBCATEGORIES.BOOK_MAGAZINE };
    }
    
    // TIER 8: ULTIMATE FALLBACK
    if (medium.includes('canvas')) {
      return { main: MAIN_CATEGORIES.PAINTINGS, sub: null };
    }
    if (medium.includes('paper')) {
      return { main: MAIN_CATEGORIES.PRINTS, sub: null };
    }
    
    // Final fallback based on source
    if (source.includes('moma') || source.includes('met') || source.includes('artic')) {
      return { main: MAIN_CATEGORIES.PRINTS, sub: null };
    }
    
    // Absolute last resort
    return { main: MAIN_CATEGORIES.DECORATIVE_ARTS, sub: null };
  }
  
  module.exports = { classifyArtwork };