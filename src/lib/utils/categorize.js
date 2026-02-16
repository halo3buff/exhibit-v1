/**
 * UNIFIED CATEGORIZATION SYSTEM
 * Uses ONLY item's native fields - NEVER trusts requestedType
 */

const TYPE_KEYWORDS = {
  typography: ['typography', 'typeface', 'font', 'helvetica', 'specimen', 'lettering'],
  photograph: ['photograph', 'photo', 'daguerreotype', 'ambrotype', 'tintype'],
  drawing: ['drawing', 'sketch', 'graphite', 'charcoal', 'pencil', 'study', 'blueprint'],
  print: ['lithograph', 'etching', 'engraving', 'woodcut', 'screenprint', 'serigraph'],
  poster: ['poster', 'placard', 'affiche'],
  painting: ['painting', 'oil', 'acrylic', 'watercolor', 'canvas', 'tempera'],
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
 * CRITICAL: Categorize ONLY based on item's OWN fields
 * NEVER blindly trust requestedType
 */
export function categorizeItem(item, requestedType = null) {
  let types = [];
  
  // PRIORITY 1: Check objectType field (most specific)
  const objectType = (item.objectType || '').toLowerCase();
  if (objectType) {
    const objectMatches = findMatches(objectType, TYPE_KEYWORDS);
    types.push(...objectMatches);
  }
  
  // PRIORITY 2: Check classification field
  const classification = (item.classification || '').toLowerCase();
  if (classification && types.length === 0) {
    const classMatches = findMatches(classification, TYPE_KEYWORDS);
    types.push(...classMatches);
  }
  
  // PRIORITY 3: Check medium field ONLY if no type found yet
  const medium = (item.medium || '').toLowerCase();
  if (medium && types.length === 0) {
    const mediumMatches = findMatches(medium, TYPE_KEYWORDS);
    types.push(...mediumMatches);
  }
  
  // PRIORITY 4: Check title/author as last resort
  if (types.length === 0) {
    const titleText = [
      item.title || '',
      item.author || ''
    ].join(' ').toLowerCase();
    
    const titleMatches = findMatches(titleText, TYPE_KEYWORDS);
    types.push(...titleMatches);
  }
  
  // PRIORITY 5: Use requestedType ONLY if nothing else worked
  if (types.length === 0 && requestedType) {
    types.push(requestedType);
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

export function matchesCategories(item, filters) {
  if (!filters || Object.keys(filters).length === 0) return true;
  const cats = item.categories || {};
  
  if (filters.type) {
    if (!cats.types?.includes(filters.type)) return false;
  }
  
  if (filters.movement) {
    if (!cats.movements?.includes(filters.movement)) return false;
  }
  
  if (filters.era && cats.era !== filters.era) return false;
  
  return true;
}