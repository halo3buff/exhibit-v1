/**
 * UNIFIED CATEGORIZATION SYSTEM
 * Works for BOTH API sources and harvested manifests
 * TRUSTS source classifications instead of keyword matching
 */

const TYPE_KEYWORDS = {
  typography: ['typography', 'typeface', 'font', 'helvetica', 'specimen', 'lettering'],
  photograph: ['photograph', 'photo', 'gelatin silver'],
  drawing: ['drawing', 'sketch', 'graphite', 'charcoal', 'pencil', 'study', 'blueprint'],
  print: ['lithograph', 'etching', 'engraving', 'woodcut', 'screenprint'],
  poster: ['poster', 'placard', 'affiche'],
  painting: ['painting', 'oil', 'acrylic', 'watercolor', 'canvas'],
  sculpture: ['sculpture', 'bronze', 'marble', 'ceramic', 'metalwork'],
  furniture: ['chair', 'table', 'desk', 'stool', 'cabinet', 'furniture', 'sessel'],
  textile: ['textile', 'fabric', 'tapestry', 'weaving', 'weave'],
  architecture: ['architecture', 'building', 'architectural', 'elevation', 'plan'],
  book: ['book', 'manuscript', 'volume', 'folio', 'periodical'],
};

const MOVEMENT_KEYWORDS = {
  bauhaus: ['bauhaus', 'gropius', 'breuer', 'albers', 'brandt', 'klee', 'kandinsky'],
  modernism: ['modern', 'modernist', 'international style'],
  'art deco': ['art deco', 'deco'],
  'art nouveau': ['art nouveau', 'nouveau', 'jugendstil'],
  'swiss style': ['swiss', 'international typographic', 'helvetica', 'grid', 'brockmann', 'hofmann'],
  postmodern: ['postmodern', 'memphis', 'carson', 'greiman'],
  minimalism: ['minimal', 'minimalist', 'judd', 'flavin']
};

function extractEra(yearString) {
  if (!yearString) return null;
  const match = yearString.match(/\d{4}/);
  if (!match) return null;
  const year = parseInt(match[0]);
  const decade = Math.floor(year / 10) * 10;
  return year >= 1800 ? `${decade}s` : null;
}

function findMatches(text, keywordMap) {
  const matches = [];
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      matches.push(category);
    }
  }
  return matches;
}

/**
 * CRITICAL: Determine type from SOURCE CLASSIFICATION first
 * Only use keyword matching as fallback
 */
export function categorizeItem(item, requestedType = null) {
  let types = [];
  
  // PRIORITY 1: If item came from a type-filtered query, trust that
  if (requestedType) {
    types.push(requestedType);
  }
  
  // PRIORITY 2: Check item's native classification/objectType/medium fields
  // These come from APIs (Met, ARTIC, etc.) or harvest scripts
  const classificationText = [
    item.classification || '',
    item.objectType || '',
    item.medium || ''
  ].join(' ').toLowerCase();
  
  if (classificationText) {
    const classMatches = findMatches(classificationText, TYPE_KEYWORDS);
    types.push(...classMatches);
  }
  
  // PRIORITY 3: Only check title/author if no classification exists
  if (types.length === 0) {
    const titleText = [
      item.title || '',
      item.author || ''
    ].join(' ').toLowerCase();
    
    const titleMatches = findMatches(titleText, TYPE_KEYWORDS);
    types.push(...titleMatches);
  }
  
  // Remove duplicates
  types = [...new Set(types)];
  
  // Find movements
  const movementText = [
    item.title || '',
    item.author || '',
    item.classification || '',
    item.culture || ''
  ].join(' ').toLowerCase();
  
  const movements = findMatches(movementText, MOVEMENT_KEYWORDS);
  const era = extractEra(item.year);
  
  return {
    type: types[0] || 'artwork',
    types: types,
    movement: movements[0] || null,
    movements: movements,
    era: era
  };
}

/**
 * Check if item matches user's filters
 * Now much more lenient - if item has the type, it matches
 */
export function matchesCategories(item, filters) {
  if (!filters || Object.keys(filters).length === 0) return true;
  const cats = item.categories || {};
  
  // If user filtered by type, check if item has that type
  if (filters.type) {
    // Item matches if it has the type in its types array
    if (!cats.types?.includes(filters.type)) return false;
  }
  
  if (filters.movement) {
    if (!cats.movements?.includes(filters.movement)) return false;
  }
  
  if (filters.era && cats.era !== filters.era) return false;
  
  return true;
}