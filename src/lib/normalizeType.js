/**
 * CANONICAL TYPE NORMALIZATION
 * Single source of truth for all type classification
 * 
 * ARCHITECTURAL PRINCIPLE:
 * This function classifies artwork by MEDIUM (physical form), not SUBJECT.
 * A photograph of architecture → "photograph" (not "architecture")
 * An oil painting of a landscape → "painting" (not "landscape")
 */

export function normalizeType(raw) {
  if (!raw) return null;

  const value = String(raw).toLowerCase().trim();
  if (!value) return null;

  // ============================================
  // PHOTOGRAPHY (Most specific patterns first)
  // ============================================
  if (value.includes('photograph')) return 'photograph';
  if (value.includes('photo')) return 'photograph';
  if (value.includes('daguerreotype')) return 'photograph';
  if (value.includes('ambrotype')) return 'photograph';
  if (value.includes('tintype')) return 'photograph';
  if (value.includes('cyanotype')) return 'photograph';
  if (value.includes('gelatin silver')) return 'photograph';
  if (value.includes('silver gelatin')) return 'photograph';
  if (value.includes('albumen')) return 'photograph';
  
  // ============================================
  // POSTERS
  // ============================================
  if (value.includes('poster')) return 'poster';
  if (value.includes('affiche')) return 'poster';
  if (value.includes('placard')) return 'poster';
  
  // ============================================
  // PRINTS & PRINTMAKING
  // ============================================
  if (value.includes('lithograph')) return 'print';
  if (value.includes('etching')) return 'print';
  if (value.includes('engraving')) return 'print';
  if (value.includes('woodcut')) return 'print';
  if (value.includes('woodblock')) return 'print';
  if (value.includes('linocut')) return 'print';
  if (value.includes('screenprint')) return 'print';
  if (value.includes('screen print')) return 'print';
  if (value.includes('serigraph')) return 'print';
  if (value.includes('silkscreen')) return 'print';
  if (value.includes('monotype')) return 'print';
  if (value.includes('monoprint')) return 'print';
  if (value.includes('aquatint')) return 'print';
  if (value.includes('mezzotint')) return 'print';
  if (value.includes('drypoint')) return 'print';
  if (value.includes('chromolithograph')) return 'print';
  
  // Special cases: Design work that's primarily printed
  if (value.includes('type specimen')) return 'print';
  if (value.includes('typographic') && value.includes('specimen')) return 'print';
  if (value === 'graphic design' || value === 'graphics') return 'print';
  
  // Only match "print" after checking all specific print types
  // to avoid false positives (e.g., "printed photograph")
  if (value.includes('print') && !value.includes('photograph')) return 'print';
  
  // ============================================
  // DRAWINGS
  // ============================================
  if (value.includes('drawing')) return 'drawing';
  if (value.includes('sketch')) return 'drawing';
  if (value.includes('graphite') || value.includes('pencil')) return 'drawing';
  if (value.includes('charcoal')) return 'drawing';
  if (value.includes('conte')) return 'drawing';
  if (value.includes('chalk')) return 'drawing';
  if (value.includes('pastel')) return 'drawing';
  if (value.includes('technical drawing')) return 'drawing';
  
  // ============================================
  // PAINTINGS
  // ============================================
  if (value.includes('painting')) return 'painting';
  if (value.includes('oil on canvas')) return 'painting';
  if (value.includes('oil on panel')) return 'painting';
  if (value.includes('oil on board')) return 'painting';
  if (value.includes('acrylic')) return 'painting';
  if (value.includes('watercolor')) return 'painting';
  if (value.includes('watercolour')) return 'painting';
  if (value.includes('gouache')) return 'painting';
  if (value.includes('tempera')) return 'painting';
  if (value.includes('fresco')) return 'painting';
  
  // ============================================
  // SCULPTURE
  // ============================================
  if (value.includes('sculpt')) return 'sculpture';
  if (value.includes('bronze')) return 'sculpture';
  if (value.includes('marble')) return 'sculpture';
  if (value.includes('stone') && !value.includes('lithograph')) return 'sculpture';
  if (value.includes('ceramic') && !value.includes('vessel')) return 'sculpture';
  if (value.includes('terracotta')) return 'sculpture';
  if (value.includes('wood carving')) return 'sculpture';
  if (value.includes('relief') && !value.includes('print')) return 'sculpture';
  
  // ============================================
  // FURNITURE & INDUSTRIAL DESIGN
  // ============================================
  if (value.includes('furniture')) return 'furniture';
  if (value.includes('chair')) return 'furniture';
  if (value.includes('table')) return 'furniture';
  if (value.includes('cabinet')) return 'furniture';
  if (value.includes('desk')) return 'furniture';
  if (value.includes('industrial design')) return 'furniture';
  
  // ============================================
  // TEXTILES
  // ============================================
  if (value.includes('textile')) return 'textile';
  if (value.includes('fabric')) return 'textile';
  if (value.includes('tapestry')) return 'textile';
  if (value.includes('embroidery')) return 'textile';
  if (value.includes('weaving')) return 'textile';
  if (value.includes('quilt')) return 'textile';
  
  // ============================================
  // MANUSCRIPTS & BOOKS
  // ============================================
  if (value.includes('manuscript')) return 'manuscript';
  if (value.includes('illuminated')) return 'manuscript';
  if (value.includes('book') && !value.includes('book plate')) return 'manuscript';
  if (value.includes('codex')) return 'manuscript';
  
  // ============================================
  // ARCHITECTURE
  // ============================================
  if (value.includes('architect')) return 'architecture';
  if (value.includes('blueprint')) return 'architecture';
  if (value.includes('architectural plan')) return 'architecture';
  if (value.includes('elevation') && value.includes('architecture')) return 'architecture';

  // ============================================
  // NO MATCH
  // ============================================
  return null;
}

/**
 * MULTI-FIELD NORMALIZATION
 * Tries to normalize from multiple fields and returns the first non-null result.
 * Prioritizes fields by semantic specificity:
 * 1. medium = physical form (most specific)
 * 2. type = explicit type designation
 * 3. objectType = object classification
 * 4. classification = high-level category
 * 5. format = alternate format specification
 */
export function normalizeItemType(item) {
  if (!item) return null;
  
  // Try each field in order of specificity
  const candidates = [
    item.medium,
    item.type,
    item.objectType,
    item.classification,
    item.format
  ];
  
  for (const candidate of candidates) {
    const normalized = normalizeType(candidate);
    if (normalized) return normalized;
  }
  
  return null;
}