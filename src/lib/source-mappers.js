/**
 * CORRECTED SOURCE MAPPERS
 * 
 * PRIORITY ORDER (CORRECTED):
 * 1. Classification FIRST (functional purpose)
 * 2. Medium SECOND (if classification is ambiguous)
 * 3. Department LAST (last resort)
 * 
 * This respects how museums organize work:
 * - An architectural photograph → Architecture gallery (not Photography)
 * - A fine art photograph → Photography gallery
 */

// ============================================================================
// CANONICAL CATEGORIES
// ============================================================================

export const CANONICAL_CATEGORIES = {
    PHOTOGRAPH: 'photograph',
    PRINT: 'print',
    DRAWING: 'drawing',
    POSTER: 'poster',
    PAINTING: 'painting',
    SCULPTURE: 'sculpture',
    FURNITURE: 'furniture',
    ARCHITECTURE: 'architecture',
    TEXTILE: 'textile',
    MANUSCRIPT: 'manuscript'
  };
  
  // ============================================================================
  // MOMA MAPPER (Corrected Priority)
  // ============================================================================
  
  export function mapMoMAItem(item) {
    const department = (item.Department || item.department || '').toLowerCase();
    const classification = (item.Classification || item.classification || '').toLowerCase();
    const medium = (item.Medium || item.medium || '').toLowerCase();
    
    // PRIORITY 1: Classification (what it functionally IS)
    
    if (classification.includes('photograph')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    
    if (classification.includes('drawing') || classification.includes('sketch')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    
    if (classification.includes('print')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    
    if (classification.includes('poster') || classification.includes('placard')) {
      return CANONICAL_CATEGORIES.POSTER;
    }
    
    if (classification.includes('painting')) {
      return CANONICAL_CATEGORIES.PAINTING;
    }
    
    if (classification.includes('sculpture') || classification.includes('relief')) {
      return CANONICAL_CATEGORIES.SCULPTURE;
    }
    
    if (classification.includes('architecture') || classification.includes('architectural')) {
      return CANONICAL_CATEGORIES.ARCHITECTURE;
    }
    
    if (classification.includes('textile') || classification.includes('tapestry')) {
      return CANONICAL_CATEGORIES.TEXTILE;
    }
    
    if (classification.includes('furniture') || classification.includes('chair') || 
        classification.includes('table')) {
      return CANONICAL_CATEGORIES.FURNITURE;
    }
    
    if (classification.includes('manuscript') || classification.includes('book') ||
        classification.includes('illustrated book')) {
      return CANONICAL_CATEGORIES.MANUSCRIPT;
    }
    
    // PRIORITY 2: Medium (if classification didn't match)
    
    // Check for photographic techniques
    if (medium.includes('photograph') || medium.includes('photo') ||
        medium.includes('gelatin silver') || medium.includes('daguerreotype') ||
        medium.includes('cyanotype') || medium.includes('albumen')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    
    // Drawing mediums
    if (medium.includes('graphite') || medium.includes('charcoal') ||
        medium.includes('pencil') || medium.includes('chalk') ||
        medium.includes('conte') || medium.includes('ink on paper')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    
    // Painting mediums
    if (medium.includes('oil on canvas') || medium.includes('oil on panel') ||
        medium.includes('acrylic') || medium.includes('watercolor') ||
        medium.includes('tempera') || medium.includes('gouache')) {
      return CANONICAL_CATEGORIES.PAINTING;
    }
    
    // Printmaking techniques
    if (medium.includes('lithograph') || medium.includes('etching') ||
        medium.includes('screenprint') || medium.includes('woodcut') ||
        medium.includes('engraving') || medium.includes('silkscreen')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    
    // Sculpture materials
    if (medium.includes('bronze') || medium.includes('marble') ||
        medium.includes('cast iron') || medium.includes('carved wood') ||
        medium.includes('terracotta')) {
      return CANONICAL_CATEGORIES.SCULPTURE;
    }
    
    // Textile materials
    if (medium.includes('textile') || medium.includes('fabric') || 
        medium.includes('woven')) {
      return CANONICAL_CATEGORIES.TEXTILE;
    }
    
    // PRIORITY 3: Department (last resort)
    
    if (department.includes('photography')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    
    if (department.includes('drawings & prints')) {
      // Still ambiguous - check medium for hints
      if (medium.includes('graphite') || medium.includes('charcoal')) {
        return CANONICAL_CATEGORIES.DRAWING;
      }
      // Default to print
      return CANONICAL_CATEGORIES.PRINT;
    }
    
    if (department.includes('painting & sculpture')) {
      // Check medium for hints
      if (medium.includes('bronze') || medium.includes('marble')) {
        return CANONICAL_CATEGORIES.SCULPTURE;
      }
      if (medium.includes('oil') || medium.includes('acrylic')) {
        return CANONICAL_CATEGORIES.PAINTING;
      }
      return null; // Too ambiguous
    }
    
    if (department.includes('architecture & design')) {
      // Check if medium gives us hints
      if (medium.includes('chair') || medium.includes('table') ||
          medium.includes('wood') || medium.includes('metal')) {
        return CANONICAL_CATEGORIES.FURNITURE;
      }
      if (medium.includes('blueprint') || medium.includes('architectural drawing')) {
        return CANONICAL_CATEGORIES.ARCHITECTURE;
      }
      // Default to furniture for design objects
      return CANONICAL_CATEGORIES.FURNITURE;
    }
    
    // Doesn't fit canonical categories
    return null;
  }
  
  // ============================================================================
  // LIVE API MAPPERS (Same corrected priority)
  // ============================================================================
  
  export function mapMETItem(item) {
    const objectName = (item.objectName || '').toLowerCase();
    const classification = (item.classification || '').toLowerCase();
    const medium = (item.medium || '').toLowerCase();
    
    // Priority 1: Classification
    if (classification.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (classification.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (classification.includes('print')) return CANONICAL_CATEGORIES.PRINT;
    if (classification.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (classification.includes('painting')) return CANONICAL_CATEGORIES.PAINTING;
    if (classification.includes('sculpture')) return CANONICAL_CATEGORIES.SCULPTURE;
    if (classification.includes('textile')) return CANONICAL_CATEGORIES.TEXTILE;
    if (classification.includes('architecture')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    if (classification.includes('furniture') || objectName.includes('chair')) {
      return CANONICAL_CATEGORIES.FURNITURE;
    }
    
    // Priority 2: Medium
    if (medium.includes('photograph') || medium.includes('gelatin silver')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    if (medium.includes('graphite') || medium.includes('charcoal')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    if (medium.includes('oil on canvas') || medium.includes('watercolor')) {
      return CANONICAL_CATEGORIES.PAINTING;
    }
    if (medium.includes('lithograph') || medium.includes('etching')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (medium.includes('bronze') || medium.includes('marble')) {
      return CANONICAL_CATEGORIES.SCULPTURE;
    }
    if (medium.includes('textile')) return CANONICAL_CATEGORIES.TEXTILE;
    
    return null;
  }
  
  export function mapArticItem(item) {
    const artworkType = (item.artwork_type_title || '').toLowerCase();
    const medium = (item.medium_display || '').toLowerCase();
    
    // Classification first
    if (artworkType.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (artworkType.includes('print')) return CANONICAL_CATEGORIES.PRINT;
    if (artworkType.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (artworkType.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (artworkType.includes('painting')) return CANONICAL_CATEGORIES.PAINTING;
    if (artworkType.includes('sculpture')) return CANONICAL_CATEGORIES.SCULPTURE;
    if (artworkType.includes('textile')) return CANONICAL_CATEGORIES.TEXTILE;
    if (artworkType.includes('furniture')) return CANONICAL_CATEGORIES.FURNITURE;
    if (artworkType.includes('architectural')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    
    // Medium second
    if (medium.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (medium.includes('graphite') || medium.includes('charcoal')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    if (medium.includes('oil on canvas') || medium.includes('watercolor')) {
      return CANONICAL_CATEGORIES.PAINTING;
    }
    if (medium.includes('lithograph') || medium.includes('etching')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (medium.includes('bronze') || medium.includes('marble')) {
      return CANONICAL_CATEGORIES.SCULPTURE;
    }
    
    return null;
  }
  
  export function mapHarvardItem(item) {
    const classification = (item.classification || '').toLowerCase();
    const objectName = (item.objectname || '').toLowerCase();
    const medium = (item.medium || '').toLowerCase();
    
    // Classification first
    if (classification.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (classification.includes('print') || classification.includes('graphic')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (classification.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (classification.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (classification.includes('painting')) return CANONICAL_CATEGORIES.PAINTING;
    if (classification.includes('sculpture')) return CANONICAL_CATEGORIES.SCULPTURE;
    if (classification.includes('furniture')) return CANONICAL_CATEGORIES.FURNITURE;
    if (classification.includes('textile')) return CANONICAL_CATEGORIES.TEXTILE;
    if (classification.includes('architecture')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    
    // Medium second
    if (medium.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (medium.includes('graphite') || medium.includes('charcoal')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    if (medium.includes('oil')) return CANONICAL_CATEGORIES.PAINTING;
    if (medium.includes('bronze')) return CANONICAL_CATEGORIES.SCULPTURE;
    
    return null;
  }
  
  export function mapRijksItem(item) {
    const objectTypes = item.objectTypes || [];
    const materials = item.materials || [];
    
    const typesString = objectTypes.join(' ').toLowerCase();
    const materialsString = materials.join(' ').toLowerCase();
    
    // Object types (classification) first
    if (typesString.includes('foto') || typesString.includes('photograph')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    if (typesString.includes('prent') || typesString.includes('print')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (typesString.includes('tekening') || typesString.includes('drawing')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    if (typesString.includes('affiche') || typesString.includes('poster')) {
      return CANONICAL_CATEGORIES.POSTER;
    }
    if (typesString.includes('schilderij') || typesString.includes('painting')) {
      return CANONICAL_CATEGORIES.PAINTING;
    }
    if (typesString.includes('sculptuur')) return CANONICAL_CATEGORIES.SCULPTURE;
    if (typesString.includes('meubel') || typesString.includes('furniture')) {
      return CANONICAL_CATEGORIES.FURNITURE;
    }
    if (typesString.includes('textiel') || typesString.includes('textile')) {
      return CANONICAL_CATEGORIES.TEXTILE;
    }
    
    // Materials second
    if (materialsString.includes('bronze') || materialsString.includes('marble')) {
      return CANONICAL_CATEGORIES.SCULPTURE;
    }
    
    return null;
  }
  
  export function mapVAItem(item) {
    const category = (item.classification || item._primaryCategory || '').toLowerCase();
    
    if (category.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (category.includes('print') || category.includes('graphic')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (category.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (category.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (category.includes('painting')) return CANONICAL_CATEGORIES.PAINTING;
    if (category.includes('sculpture')) return CANONICAL_CATEGORIES.SCULPTURE;
    if (category.includes('furniture') || category.includes('woodwork')) {
      return CANONICAL_CATEGORIES.FURNITURE;
    }
    if (category.includes('textile') || category.includes('fashion')) {
      return CANONICAL_CATEGORIES.TEXTILE;
    }
    if (category.includes('architecture')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    
    return null;
  }
  
  export function mapLOCItem(item) {
    const format = (item.format || '').toLowerCase();
    const location = (item.location || '').toLowerCase();
    
    // Format (classification) first
    if (format.includes('photograph')) return CANONICAL_CATEGORIES.PHOTOGRAPH;
    if (format.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (format.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (format.includes('print')) return CANONICAL_CATEGORIES.PRINT;
    if (format.includes('architect')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    if (format.includes('manuscript')) return CANONICAL_CATEGORIES.MANUSCRIPT;
    
    // Location second (LOC uses location codes as secondary classification)
    if (location.includes('fsa') || location.includes('app')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    if (location.includes('pos') || location.includes('wpapos')) {
      return CANONICAL_CATEGORIES.POSTER;
    }
    if (location.includes('cpn')) return CANONICAL_CATEGORIES.DRAWING;
    if (location.includes('rbc')) return CANONICAL_CATEGORIES.PRINT;
    if (location.includes('ade')) return CANONICAL_CATEGORIES.ARCHITECTURE;
    if (location.includes('mss')) return CANONICAL_CATEGORIES.MANUSCRIPT;
    
    return null;
  }
  
  export function mapNYPLItem(item) {
    const format = (item.format || '').toLowerCase();
    
    if (format.includes('photograph') || format.includes('still image')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    if (format.includes('print') || format.includes('graphic')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (format.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (format.includes('drawing')) return CANONICAL_CATEGORIES.DRAWING;
    if (format.includes('manuscript') || format.includes('text')) {
      return CANONICAL_CATEGORIES.MANUSCRIPT;
    }
    
    return null;
  }
  
  export function mapWikimediaItem(item) {
    const title = (item.title || '').toLowerCase();
    
    if (title.includes('photograph') || title.includes('photo')) {
      return CANONICAL_CATEGORIES.PHOTOGRAPH;
    }
    if (title.includes('poster')) return CANONICAL_CATEGORIES.POSTER;
    if (title.includes('print') || title.includes('woodcut') || 
        title.includes('lithograph')) {
      return CANONICAL_CATEGORIES.PRINT;
    }
    if (title.includes('drawing') || title.includes('sketch')) {
      return CANONICAL_CATEGORIES.DRAWING;
    }
    if (title.includes('painting')) return CANONICAL_CATEGORIES.PAINTING;
    
    return CANONICAL_CATEGORIES.PRINT; // Default for graphic work
  }
  
  // ============================================================================
  // MASTER MAPPER
  // ============================================================================
  
  export function mapItemToCanonicalType(item) {
    if (!item || !item.source) return null;
    
    const source = item.source.toLowerCase();
    
    if (source.includes('moma') || source.includes('museum of modern art')) {
      return mapMoMAItem(item);
    }
    
    if (source.includes('met') || source.includes('metropolitan')) {
      return mapMETItem(item);
    }
    if (source.includes('art institute') || source.includes('chicago')) {
      return mapArticItem(item);
    }
    if (source.includes('harvard')) return mapHarvardItem(item);
    if (source.includes('rijks')) return mapRijksItem(item);
    if (source.includes('v&a') || source.includes('victoria')) {
      return mapVAItem(item);
    }
    if (source.includes('library of congress') || source.includes('loc')) {
      return mapLOCItem(item);
    }
    if (source.includes('nypl') || source.includes('new york public')) {
      return mapNYPLItem(item);
    }
    if (source.includes('wikimedia') || source.includes('commons')) {
      return mapWikimediaItem(item);
    }
    
    console.warn(`[MAPPER] Unknown source: ${source}`);
    return null;
  }
  
  // Helper functions
  export function findUnmappedItems(items) {
    return items.filter(item => mapItemToCanonicalType(item) === null);
  }
  
  export function getCategoryDistribution(items) {
    const distribution = {};
    items.forEach(item => {
      const category = mapItemToCanonicalType(item) || 'unmapped';
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }