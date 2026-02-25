import { SourceConfig } from './types';

export const CategoryMap: Record<string, SourceConfig[]> = {
  GRAPHIC_DESIGN: [
    // Tier 1: APIs
    { source: 'met', filterId: '19', filterType: 'departmentId' },
    { source: 'artic', filterId: 'PC-2', filterType: 'classification_id' },
    { source: 'va', filterId: 'THES48956', filterType: 'category' }, 
    { source: 'cooper', filterId: '35347493', filterType: 'department_id' },
    { source: 'harvard', filterId: '21', filterType: 'classification_id' },
    { source: 'cleveland', filterId: 'Graphic Design', filterType: 'type' },
    { source: 'getty', filterId: 'posters', filterType: 'type' },
    
    // Tier 2: Aggregators
    { source: 'loc', filterId: 'pos', filterType: 'location' }, // Posters collection
    { source: 'nypl', filterId: 'Graphic design', filterType: 'topic' },
    { source: 'wikimedia', filterId: 'Posters', filterType: 'category' },
    { source: 'europeana', filterId: 'POSTER', filterType: 'type' },
    { source: 'wellcome', filterId: 'Posters', filterType: 'type' },
    { source: 'jstor', filterId: 'Graphic Design', filterType: 'topic' },
    
    // Tier 3: Arabic / SWANA Specialized
    { source: 'arabic_design', filterId: 'all', filterType: 'category' },
    { source: 'palarchive', filterId: 'Posters', filterType: 'type' },
    { source: 'harvardme', filterId: 'Middle Eastern Posters', filterType: 'category' },
    { source: 'translatio', filterId: 'Periodicals', filterType: 'type' },
    { source: 'auc', filterId: 'p15795coll25', filterType: 'category' }, // Specific Arabic collection
    
    // Tier 4: Subculture / Scrapers
    { source: 'rave', filterId: 'flyers', filterType: 'category' },
    { source: 'designreviewed', filterId: 'graphic-design', filterType: 'category' },
    { source: 'letterform', filterId: 'Format:Posters', filterType: 'type' },
    { source: 'debug', filterId: 'covers', filterType: 'category' }
  ],

  PHOTOGRAPHY: [
    { source: 'met', filterId: '19', filterType: 'departmentId', subFilter: 'Photographs' },
    { source: 'artic', filterId: 'PC-12', filterType: 'classification_id' },
    { source: 'rijks', filterId: 'foto', filterType: 'type' },
    { source: 'nga', filterId: 'Photography', filterType: 'type' },
    { source: 'smithsonian', filterId: 'Photographs', filterType: 'type' },
    { source: 'aif', filterId: 'all', filterType: 'category' }, // Arab Image Foundation
    { source: 'nypl', filterId: 'Photography', filterType: 'topic' },
    { source: 'getty', filterId: 'photographs', filterType: 'type' }
  ],

  PAINTING: [
    { source: 'met', filterId: '11', filterType: 'departmentId' }, // European Paintings
    { source: 'artic', filterId: 'PC-1', filterType: 'classification_id' },
    { source: 'rijks', filterId: 'schilderij', filterType: 'type' },
    { source: 'nga', filterId: 'Painting', filterType: 'type' },
    { source: 'harvard', filterId: '26', filterType: 'classification_id' }
  ],

  DECORATIVE_ARTS: [
    { source: 'met', filterId: '12', filterType: 'departmentId' }, // European Sculpture/Dec Arts
    { source: 'artic', filterId: 'PC-15', filterType: 'classification_id' }, // Textiles
    { source: 'cooper', filterId: '35347501', filterType: 'department_id' }, // Textiles
    { source: 'va', filterId: 'THES48881', filterType: 'category' }, // Textiles/Fashion
    { source: 'rijks', filterId: 'meubilair', filterType: 'type' } // Furniture
  ]
};