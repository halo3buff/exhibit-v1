/**
 * SOURCE LOCATION MAPPINGS
 * Maps content types to specific locations within each archive
 */

  export const LOC_MAPPINGS = {
    photograph: ["fsa", "app"],
    poster: ["pos", "wpapos"],
    drawing: ["cpn"],
    architecture: ["ade"],
    map: ["gmd"],
    manuscript: ["mss"],
    print: ["pos", "rbc"],
    painting: ["app"], // ✅ ADD - American Memory has paintings
    furniture: ["ade"], // ✅ ADD - Design/Engineering
    theater: ["papr"],
    book: ["rbc"],
    default: ["fsa", "pos", "wpapos", "app", "ade"]
  };
  
  export const NYPL_MAPPINGS = {
    photograph: ["Photography"],
    poster: ["Posters"],
    print: ["Prints"],
    painting: ["Art & Architecture"], // ✅ ADD
    furniture: ["Art & Architecture"], // ✅ ADD
    map: ["Maps"],
    manuscript: ["Manuscripts"],
    architecture: ["Art & Architecture"],
    default: ["Posters", "Prints", "Photography"]
  };
  
  export const MET_MAPPINGS = {
    photograph: [19], // Drawings & Prints (includes photos)
    drawing: [19], // Drawings & Prints
    print: [19], // Drawings & Prints
    painting: [11], // European Paintings
    sculpture: [12], // European Sculpture & Decorative Arts
    furniture: [12], // European Sculpture & Decorative Arts
    textile: [8], // Costume Institute
    architecture: [21], // Modern & Contemporary
    asian: [6], // Asian Art
    islamic: [14], // Islamic Art
    default: [19, 21, 12] // Core design departments
  };
  
  export const ARTIC_MAPPINGS = {
    photograph: ["PC-12"], // Photography & Media
    drawing: ["PC-14"], // Prints & Drawings
    print: ["PC-14"], // Prints & Drawings
    painting: ["PC-1"], // European Painting
    sculpture: ["PC-8"], // Contemporary Art
    architecture: ["PC-2"], // Architecture & Design
    textile: ["PC-15"], // Textiles
    furniture: ["PC-2"], // Architecture & Design
    default: ["PC-14", "PC-12", "PC-2"] // Core visual categories
  };
  
  export const VA_MAPPINGS = {
    photograph: ["THES48937"], // Prints/Photographs
    poster: ["THES48956"], // Graphics/Typography/Posters
    print: ["THES48937"], // Prints/Photographs
    textile: ["THES48881"], // Textiles/Fashion
    furniture: ["THES48881"], // Textiles/Fashion (includes design)
    typography: ["THES48956"], // Graphics/Typography/Posters
    book: ["THES48943"], // Illustration/Books
    digital: ["THES253336"], // Digital Art
    default: ["THES48956", "THES48937"] // Visual core
  };

  export const HARVARD_MAPPINGS = {
    photograph: ["photographs"],
    drawing: ["drawings"],
    print: ["prints"],
    typography: ["prints"],
    poster: ["prints"],
    painting: ["paintings"],
    furniture: ["designs"], // ✅ ADD
    sculpture: ["sculptures"],
    default: ["photographs", "prints", "drawings"]
  };
  
  export const RIJKS_MAPPINGS = {
    photograph: ["foto"],
    drawing: ["tekening"],
    print: ["prent"],
    poster: ["affiche"],
    typography: ["prent"],
    painting: ["schilderij"], // ✅ ADD - Dutch for painting
    furniture: ["design"], // ✅ ADD
    book: ["boek"],
    default: ["prent", "tekening", "foto"]
  };
  
  export const WIKIMEDIA_MAPPINGS = {
    photograph: ["Featured_pictures"],
    poster: ["Posters"],
    typography: ["Typography", "Graphic_design"],
    print: ["Graphic_design"],
    painting: ["Paintings"], // ✅ ADD
    furniture: ["Design"], // ✅ ADD
    map: ["Maps"],
    default: ["Featured_pictures", "Graphic_design"]
  };
  
  /**
   * Get relevant locations for a content type
   */
  export function getLocationsForType(source, contentType) {
    const mappings = {
      loc: LOC_MAPPINGS,
      nypl: NYPL_MAPPINGS,
      met: MET_MAPPINGS,
      artic: ARTIC_MAPPINGS,
      va: VA_MAPPINGS,
      harvard: HARVARD_MAPPINGS,  // ADD
      rijks: RIJKS_MAPPINGS,      // ADD
      wikimedia: WIKIMEDIA_MAPPINGS // ADD
    };
    
    const sourceMapping = mappings[source];
    if (!sourceMapping) return null;
    
    return sourceMapping[contentType] || sourceMapping.default;
  }