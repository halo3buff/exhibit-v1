/** * CATEGORY EXTRACTOR 
 * Analyzes item metadata and assigns standardized tags
 */

const TYPE_KEYWORDS = {
    photograph: ['photograph', 'photo', 'gelatin silver', 'print'],
    drawing: ['drawing', 'sketch', 'graphite', 'charcoal', 'pencil', 'study', 'blueprint', 'section'],
    print: ['print', 'lithograph', 'etching', 'engraving', 'woodcut', 'specimen'],
    poster: ['poster', 'placard', 'advertisement'],
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
  
  export function categorizeItem(item) {
    // We prioritize the specialized fields we just harvested!
    const searchText = [
      item.title || '',
      item.author || '',
      item.objectType || '',
      item.classification || '',
      item.medium || ''
    ].join(' ').toLowerCase();
  
    const types = findMatches(searchText, TYPE_KEYWORDS);
    const movements = findMatches(searchText, MOVEMENT_KEYWORDS);
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
  
    if (filters.type && !cats.types?.includes(filters.type)) return false;
    if (filters.movement && !cats.movements?.includes(filters.movement)) return false;
    if (filters.era && cats.era !== filters.era) return false;
  
    return true;
  }