import { SourceConfig } from './types.js';

// ═════════════════════════════════════════════════════════════════════════════
// CATEGORY MAP — The brain of the harvester.
//
// MET DEPARTMENT IDs (confirmed):
//   1  = American Decorative Arts
//   6  = Asian Art
//   9  = Drawings and Prints          ← Fine art prints, etchings, drawings
//   11 = European Paintings           ← Oil paintings, tempera
//   12 = European Sculpture and Decorative Arts
//   19 = Photographs                  ← Photography dept (NOT for graphic design)
//   21 = Modern and Contemporary Art
//
// ARTIC artwork_type_title values (via POST /artworks/search):
//   "Poster" | "Photograph" | "Painting" | "Drawing and Watercolor on Paper"
//   "Print" | "Textile" | "Decorative Arts" | "Ceramic" | "Glass" | "Metalwork"
//
// V&A THESAURUS IDs (confirmed):
//   THES48943 = Posters       THES48876 = Graphic Art (commercial ephemera)
//   THES49308 = Photographs   THES48960 = Paintings
//   THES48927 = Prints        THES49144 = Drawings
//   THES48852 = Ceramics      THES49006 = Furniture
//   THES48881 = Textiles      THES48991 = Fashion and Dress
//   THES48858 = Metalwork     THES49232 = Jewellery
//
// RIJKSMUSEUM type= (Dutch):
//   affiche=poster | schilderij=painting | prent=print | tekening=drawing
//   foto=photograph | aquarel=watercolor | aardewerk=ceramics | glas=glass
//   meubilair=furniture | textiel=textile | zilverwerk=silverwork | goud=goldwork
//
// HARVARD classification= (confirmed):
//   "Photographs"|"Prints"|"Drawings"|"Paintings"|"Posters"
//   "Textiles"|"Ceramics and Glass"|"Metalwork and Jewelry"|"Furniture"
//   worktype=: "Poster"|"Photograph"|"Painting"|"Print"|"Drawing"
//   technique=: "Etching"|"Lithography"|"Photography"|"Woodcut"
// ═════════════════════════════════════════════════════════════════════════════

export const CategoryMap: Record<string, SourceConfig[]> = {

  // ══════════════════════════════════════════════════════════════════════════
  // GRAPHIC DESIGN
  // Applied art for visual communication. Reproducibility + intent to sell/inform/persuade.
  // Sub-categories: Poster | Advertising | Typography | Editorial | Packaging | Identity
  //
  // CRITICAL: MET dept 9 = Drawings & Prints (use objectName filter for commercial art)
  //           MET dept 19 = PHOTOGRAPHS — never use for graphic design
  //           ARTIC: POST search with artwork_type_title="Poster" only
  //           V&A THES48876 = Graphic Art (ephemera) NOT THES48927 (fine art prints)
  // ══════════════════════════════════════════════════════════════════════════
  GRAPHIC_DESIGN: [
    // ── POSTERS ───────────────────────────────────────────────────────────
    { source:'met',         limit:400, params:{departmentId:'9', objectName:'Poster', hasImages:true},                              subCategoryHint:'Poster' },
    { source:'met',         limit:150, params:{departmentId:'9', objectName:'Advertisement', hasImages:true},                       subCategoryHint:'Advertising' },
    { source:'met',         limit:150, params:{departmentId:'9', objectName:'Trade card', hasImages:true},                          subCategoryHint:'Advertising' },
    { source:'artic',       limit:300, params:{artwork_type_title:'Poster'},                                                        subCategoryHint:'Poster' },
    { source:'va',          limit:300, params:{id_category:'THES48943'},                                                            subCategoryHint:'Poster' },
    { source:'va',          limit:200, params:{id_category:'THES48876'},                                                            subCategoryHint:'Advertising' },
    { source:'loc',         limit:500, params:{collection:'posters'},                                                               subCategoryHint:'Poster' },
    { source:'rijks',       limit:200, params:{type:'affiche', q:'*'},                                                              subCategoryHint:'Poster' },
    { source:'harvard',     limit:200, params:{worktype:'Poster'},                                                                  subCategoryHint:'Poster' },
    { source:'harvard',     limit:150, params:{classification:'Posters'},                                                           subCategoryHint:'Poster' },
    { source:'smithsonian', limit:200, params:{q:'poster', type:'Posters', unit_code:'CHNDM'},                                      subCategoryHint:'Poster' },
    { source:'smithsonian', limit:200, params:{q:'advertisement label commercial graphic arts', unit_code:'SAAM'},                  subCategoryHint:'Advertising' },
    { source:'europeana',   limit:200, params:{query:'poster OR affiche OR plakat OR cartel OR "art nouveau poster"'},              subCategoryHint:'Poster' },
    { source:'wikimedia',   limit:150, params:{category:'Propaganda posters'},                                                      subCategoryHint:'Poster' },
    { source:'wikimedia',   limit:150, params:{category:'Travel posters'},                                                          subCategoryHint:'Poster' },
    { source:'wikimedia',   limit:100, params:{category:'WPA posters'},                                                             subCategoryHint:'Poster' },
    { source:'cooper',      limit:300, params:{typeFilter:'poster'},                                                                subCategoryHint:'Poster' },
    { source:'wellcome',    limit:200, params:{workType:'k', query:'poster propaganda health'},                                     subCategoryHint:'Poster' },
    { source:'ia',          limit:200, params:{subject:'posters', mediatype:'image'},                                               subCategoryHint:'Poster' },
    { source:'ia',          limit:150, params:{subject:'rave flyer', mediatype:'image'},                                            subCategoryHint:'Advertising' },
    { source:'harvardme',   limit:200, params:{},                                                                                   subCategoryHint:'Poster' },
    { source:'nypl',        limit:200, params:{subject:'posters', collection:'Prints and Photographs'},                             subCategoryHint:'Poster' },
    // ── TYPOGRAPHY / IDENTITY ──────────────────────────────────────────────
    { source:'cooper',      limit:200, params:{typeFilter:'graphic design'},                                                        subCategoryHint:'Typography' },
    { source:'europeana',   limit:150, params:{query:'"type specimen" OR lettering OR typography OR Bauhaus OR Constructivism OR Futurism'}, subCategoryHint:'Typography' },
    // ── EDITORIAL / PUBLICATION ────────────────────────────────────────────
    { source:'designreviewed', limit:500, params:{},                                                                                subCategoryHint:'Editorial' },
    // ── PACKAGING / EPHEMERA ───────────────────────────────────────────────
    { source:'letterform',  limit:600, params:{},                                                                                   subCategoryHint:'Packaging' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // PHOTOGRAPHY
  // Works produced by light on a sensitive surface.
  // Sub-categories: Fine Art Photography | Documentary | Portraiture | Photojournalism | Experimental
  //
  // MET dept 19 = Photographs (the dedicated photography dept)
  // NEVER use dept 19 for graphic design — that's a common mistake
  // ══════════════════════════════════════════════════════════════════════════
  PHOTOGRAPHY: [
    // ── FINE ART ──────────────────────────────────────────────────────────
    { source:'met',         limit:300, params:{departmentId:'19', hasImages:true},                                                  subCategoryHint:'Fine Art Photography' },
    { source:'artic',       limit:300, params:{classification_id:'PC-12'},                                                          subCategoryHint:'Fine Art Photography' },
    { source:'artic',       limit:200, params:{artwork_type_title:'Photograph'},                                                    subCategoryHint:'Fine Art Photography' },
    { source:'va',          limit:300, params:{id_category:'THES49308'},                                                            subCategoryHint:'Fine Art Photography' },
    { source:'loc',         limit:200, params:{collection:'ansel-adams-manzanar'},                                                  subCategoryHint:'Fine Art Photography' },
    { source:'nga',         limit:200, params:{classification:'Photograph'},                                                        subCategoryHint:'Fine Art Photography' },
    { source:'harvard',     limit:200, params:{classification:'Photographs'},                                                       subCategoryHint:'Fine Art Photography' },
    { source:'harvard',     limit:150, params:{technique:'Photography'},                                                            subCategoryHint:'Fine Art Photography' },
    { source:'rijks',       limit:200, params:{type:'foto', q:'*'},                                                                 subCategoryHint:'Fine Art Photography' },
    { source:'aif',         limit:200, params:{},                                                                                   subCategoryHint:'Documentary' },
    { source:'wikimedia',   limit:150, params:{category:'Black and white photographs'},                                             subCategoryHint:'Fine Art Photography' },
    // ── DOCUMENTARY ───────────────────────────────────────────────────────
    { source:'loc',         limit:400, params:{collection:'fsa-owi-color-photographs'},                                             subCategoryHint:'Documentary' },
    { source:'loc',         limit:300, params:{collection:'fsa-owi-black-and-white-negatives'},                                     subCategoryHint:'Documentary' },
    { source:'smithsonian', limit:200, params:{q:'photograph documentary portrait', unit_code:'NMAAHC'},                           subCategoryHint:'Documentary' },
    { source:'wellcome',    limit:200, params:{workType:'k', query:'photograph documentary'},                                       subCategoryHint:'Documentary' },
    { source:'ia',          limit:200, params:{subject:'photographs', mediatype:'image'},                                           subCategoryHint:'Documentary' },
    { source:'nypl',        limit:200, params:{subject:'photographs', collection:'Photography Collection'},                         subCategoryHint:'Documentary' },
    // ── PORTRAITURE ───────────────────────────────────────────────────────
    { source:'loc',         limit:200, params:{collection:'gottlieb-collection'},                                                   subCategoryHint:'Portraiture' },
    { source:'europeana',   limit:200, params:{query:'daguerreotype OR portrait OR "albumen print" OR "carte de visite"'},          subCategoryHint:'Portraiture' },
    // ── PHOTOJOURNALISM ───────────────────────────────────────────────────
    { source:'loc',         limit:200, params:{collection:'look-magazine'},                                                         subCategoryHint:'Photojournalism' },
    { source:'smithsonian', limit:200, params:{q:'photograph documentary history news', unit_code:'NMAH'},                         subCategoryHint:'Photojournalism' },
    // ── EXPERIMENTAL ──────────────────────────────────────────────────────
    { source:'europeana',   limit:150, params:{query:'"gelatin silver" OR cyanotype OR photogram OR calotype OR collodion'},        subCategoryHint:'Experimental' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // PAINTING
  // Unique, non-reproducible works with liquid media on a support.
  // Sub-categories: Oil | Watercolor | Tempera | Acrylic | Gouache | Fresco
  //
  // MET dept 11 = European Paintings (oil/tempera)
  // MET dept 21 = Modern and Contemporary (filter to objectName=Painting)
  // NEVER include dept 9 (Prints) even if works look like paintings
  // ══════════════════════════════════════════════════════════════════════════
  PAINTING: [
    // ── OIL ───────────────────────────────────────────────────────────────
    { source:'met',         limit:400, params:{departmentId:'11', hasImages:true},                                                  subCategoryHint:'Oil' },
    { source:'met',         limit:200, params:{departmentId:'21', objectName:'Painting', hasImages:true},                           subCategoryHint:'Oil' },
    { source:'nga',         limit:300, params:{classification:'Painting'},                                                          subCategoryHint:'Oil' },
    { source:'artic',       limit:300, params:{classification_id:'PC-1'},                                                           subCategoryHint:'Oil' },
    { source:'artic',       limit:200, params:{artwork_type_title:'Painting'},                                                      subCategoryHint:'Oil' },
    { source:'rijks',       limit:300, params:{type:'schilderij', q:'*'},                                                           subCategoryHint:'Oil' },
    { source:'harvard',     limit:200, params:{classification:'Paintings'},                                                         subCategoryHint:'Oil' },
    { source:'smithsonian', limit:200, params:{q:'oil paint canvas acrylic painting unique work', unit_code:'SAAM'},                subCategoryHint:'Oil' },
    { source:'europeana',   limit:200, params:{query:'"oil on canvas" OR "oil on panel" OR "huile sur toile" OR "olieverf op doek"'}, subCategoryHint:'Oil' },
    { source:'wikimedia',   limit:200, params:{category:'Paintings'},                                                               subCategoryHint:'Oil' },
    // ── WATERCOLOR ────────────────────────────────────────────────────────
    { source:'rijks',       limit:200, params:{type:'aquarel', q:'*'},                                                              subCategoryHint:'Watercolor' },
    { source:'va',          limit:200, params:{id_category:'THES48960'},                                                            subCategoryHint:'Watercolor' },
    { source:'harvard',     limit:150, params:{medium:'Watercolor'},                                                                subCategoryHint:'Watercolor' },
    { source:'europeana',   limit:150, params:{query:'watercolour OR watercolor OR aquarelle OR acquerello'},                       subCategoryHint:'Watercolor' },
    // ── TEMPERA / GOUACHE ─────────────────────────────────────────────────
    { source:'wellcome',    limit:150, params:{workType:'k', query:'painting oil tempera gouache acrylic canvas panel'},            subCategoryHint:'Tempera' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // PRINTS_AND_DRAWINGS
  // Works on Paper. Bridge between fine art and mass production.
  // Sub-categories: Etching | Engraving | Woodcut | Lithograph | Screenprint | Drawing | Collage | Monotype
  //
  // MET dept 9 = Drawings and Prints (EXCLUDE commercial art — that's Graphic Design)
  // ARTIC classification_id=PC-2 = Prints and Drawings
  // Must NOT include posters/ads — those are Graphic Design
  // ══════════════════════════════════════════════════════════════════════════
  PRINTS_AND_DRAWINGS: [
    // ── INTAGLIO PRINTS (ETCHING / ENGRAVING) ─────────────────────────────
    { source:'met',         limit:300, params:{departmentId:'9', hasImages:true, excludeObjectNames:['Poster','Commercial Art','Label','Trade card','Advertisement']}, subCategoryHint:'Engraving' },
    { source:'met',         limit:150, params:{q:'etching', departmentId:'9', hasImages:true},                                      subCategoryHint:'Etching' },
    { source:'met',         limit:150, params:{q:'woodcut', departmentId:'9', hasImages:true},                                      subCategoryHint:'Woodcut' },
    { source:'met',         limit:150, params:{q:'lithograph', departmentId:'9', hasImages:true},                                   subCategoryHint:'Lithograph' },
    { source:'artic',       limit:300, params:{classification_id:'PC-2'},                                                           subCategoryHint:'Engraving' },
    { source:'va',          limit:200, params:{id_category:'THES48927'},                                                            subCategoryHint:'Engraving' },
    { source:'loc',         limit:300, params:{collection:'fine-prints-american-before-1940'},                                      subCategoryHint:'Engraving' },
    { source:'loc',         limit:200, params:{collection:'prints-photographs'},                                                    subCategoryHint:'Engraving' },
    { source:'rijks',       limit:300, params:{type:'prent', q:'*'},                                                                subCategoryHint:'Engraving' },
    { source:'nga',         limit:200, params:{classification:'Print'},                                                             subCategoryHint:'Engraving' },
    { source:'harvard',     limit:200, params:{classification:'Prints'},                                                            subCategoryHint:'Engraving' },
    { source:'harvard',     limit:150, params:{technique:'Etching'},                                                                subCategoryHint:'Etching' },
    { source:'harvard',     limit:150, params:{technique:'Lithography'},                                                            subCategoryHint:'Lithograph' },
    { source:'harvard',     limit:100, params:{technique:'Woodcut'},                                                                subCategoryHint:'Woodcut' },
    { source:'smithsonian', limit:150, params:{q:'etching engraving woodcut intaglio print', unit_code:'SAAM'},                    subCategoryHint:'Etching' },
    { source:'europeana',   limit:200, params:{query:'etching OR engraving OR woodcut OR lithograph OR gravure OR incisione OR Radierung'}, subCategoryHint:'Etching' },
    { source:'wikimedia',   limit:150, params:{category:'Etchings'},                                                                subCategoryHint:'Etching' },
    { source:'wikimedia',   limit:100, params:{category:'Woodcuts'},                                                                subCategoryHint:'Woodcut' },
    { source:'ia',          limit:150, params:{subject:'lithograph', mediatype:'image'},                                            subCategoryHint:'Lithograph' },
    { source:'wellcome',    limit:200, params:{workType:'k', query:'etching engraving woodcut print intaglio relief'},              subCategoryHint:'Etching' },
    { source:'nypl',        limit:200, params:{subject:'prints', collection:'Print Collection'},                                    subCategoryHint:'Engraving' },
    // ── DRAWINGS ──────────────────────────────────────────────────────────
    { source:'met',         limit:200, params:{q:'drawing charcoal graphite ink study sketch', departmentId:'9', hasImages:true},   subCategoryHint:'Drawing' },
    { source:'artic',       limit:200, params:{artwork_type_title:'Drawing and Watercolor on Paper'},                               subCategoryHint:'Drawing' },
    { source:'va',          limit:200, params:{id_category:'THES49144'},                                                            subCategoryHint:'Drawing' },
    { source:'rijks',       limit:200, params:{type:'tekening', q:'*'},                                                             subCategoryHint:'Drawing' },
    { source:'nga',         limit:200, params:{classification:'Drawing'},                                                           subCategoryHint:'Drawing' },
    { source:'harvard',     limit:150, params:{classification:'Drawings'},                                                          subCategoryHint:'Drawing' },
    { source:'cooper',      limit:200, params:{typeFilter:'drawing'},                                                               subCategoryHint:'Drawing' },
  ],

  // ══════════════════════════════════════════════════════════════════════════
  // DECORATIVE_ARTS
  // Applied Arts / Craft. Aesthetic value applied to a functional form.
  // Sub-categories: Ceramics & Glass | Furniture | Textiles & Fashion | Metalwork & Jewelry
  //
  // Cooper Hewitt = best source (entire museum is decorative/applied arts)
  // MET dept 12 = European Sculpture and Decorative Arts
  // MET dept 1  = American Decorative Arts
  // ══════════════════════════════════════════════════════════════════════════
  DECORATIVE_ARTS: [
    // ── CERAMICS & GLASS ──────────────────────────────────────────────────
    { source:'met',         limit:300, params:{departmentId:'12', hasImages:true},                                                  subCategoryHint:'Ceramics & Glass' },
    { source:'met',         limit:200, params:{departmentId:'6', objectName:'Porcelain', hasImages:true},                           subCategoryHint:'Ceramics & Glass' },
    { source:'met',         limit:150, params:{departmentId:'1', hasImages:true},                                                   subCategoryHint:'Ceramics & Glass' },
    { source:'artic',       limit:200, params:{department_title:'Applied Arts of Europe'},                                          subCategoryHint:'Ceramics & Glass' },
    { source:'artic',       limit:150, params:{artwork_type_title:'Ceramic'},                                                       subCategoryHint:'Ceramics & Glass' },
    { source:'artic',       limit:100, params:{artwork_type_title:'Glass'},                                                         subCategoryHint:'Ceramics & Glass' },
    { source:'va',          limit:300, params:{id_category:'THES48852'},                                                            subCategoryHint:'Ceramics & Glass' },
    { source:'rijks',       limit:200, params:{type:'aardewerk', q:'*'},                                                            subCategoryHint:'Ceramics & Glass' },
    { source:'rijks',       limit:100, params:{type:'glas', q:'*'},                                                                 subCategoryHint:'Ceramics & Glass' },
    { source:'nga',         limit:150, params:{classification:'Ceramic'},                                                           subCategoryHint:'Ceramics & Glass' },
    { source:'nga',         limit:100, params:{classification:'Glass'},                                                             subCategoryHint:'Ceramics & Glass' },
    { source:'cooper',      limit:150, params:{typeFilter:'ceramic'},                                                               subCategoryHint:'Ceramics & Glass' },
    { source:'harvard',     limit:150, params:{classification:'Ceramics and Glass'},                                                subCategoryHint:'Ceramics & Glass' },
    { source:'europeana',   limit:150, params:{query:'ceramics OR pottery OR porcelain OR faience OR earthenware OR stoneware OR Delft'}, subCategoryHint:'Ceramics & Glass' },
    { source:'wikimedia',   limit:150, params:{category:'Ceramics'},                                                                subCategoryHint:'Ceramics & Glass' },
    // ── FURNITURE ─────────────────────────────────────────────────────────
    { source:'va',          limit:200, params:{id_category:'THES49006'},                                                            subCategoryHint:'Furniture' },
    { source:'rijks',       limit:150, params:{type:'meubilair', q:'*'},                                                            subCategoryHint:'Furniture' },
    { source:'nga',         limit:200, params:{classification:'Decorative Arts'},                                                   subCategoryHint:'Furniture' },
    { source:'cooper',      limit:200, params:{typeFilter:'product'},                                                               subCategoryHint:'Furniture' },
    { source:'harvard',     limit:100, params:{classification:'Furniture'},                                                         subCategoryHint:'Furniture' },
    // ── TEXTILES & FASHION ────────────────────────────────────────────────
    { source:'va',          limit:300, params:{id_category:'THES48881'},                                                            subCategoryHint:'Textiles & Fashion' },
    { source:'va',          limit:200, params:{id_category:'THES48991'},                                                            subCategoryHint:'Textiles & Fashion' },
    { source:'artic',       limit:200, params:{department_title:'Textiles'},                                                        subCategoryHint:'Textiles & Fashion' },
    { source:'artic',       limit:150, params:{artwork_type_title:'Textile'},                                                       subCategoryHint:'Textiles & Fashion' },
    { source:'rijks',       limit:150, params:{type:'textiel', q:'*'},                                                              subCategoryHint:'Textiles & Fashion' },
    { source:'cooper',      limit:300, params:{typeFilter:'textile'},                                                               subCategoryHint:'Textiles & Fashion' },
    { source:'harvard',     limit:150, params:{classification:'Textiles and Fashion Arts'},                                         subCategoryHint:'Textiles & Fashion' },
    { source:'smithsonian', limit:200, params:{q:'textile fabric tapestry embroidery lace fashion', unit_code:'CHNDM'},             subCategoryHint:'Textiles & Fashion' },
    { source:'europeana',   limit:150, params:{query:'tapestry OR textile OR embroidery OR lace OR weaving OR woven'},              subCategoryHint:'Textiles & Fashion' },
    { source:'wikimedia',   limit:100, params:{category:'Textile arts'},                                                            subCategoryHint:'Textiles & Fashion' },
    // ── METALWORK & JEWELRY ───────────────────────────────────────────────
    { source:'va',          limit:200, params:{id_category:'THES48858'},                                                            subCategoryHint:'Metalwork & Jewelry' },
    { source:'va',          limit:200, params:{id_category:'THES49232'},                                                            subCategoryHint:'Metalwork & Jewelry' },
    { source:'rijks',       limit:100, params:{type:'zilverwerk', q:'*'},                                                           subCategoryHint:'Metalwork & Jewelry' },
    { source:'rijks',       limit:100, params:{type:'goud', q:'*'},                                                                 subCategoryHint:'Metalwork & Jewelry' },
    { source:'cooper',      limit:150, params:{typeFilter:'jewelry'},                                                               subCategoryHint:'Metalwork & Jewelry' },
    { source:'harvard',     limit:150, params:{classification:'Metalwork and Jewelry'},                                             subCategoryHint:'Metalwork & Jewelry' },
    { source:'nga',         limit:100, params:{classification:'Jewelry'},                                                           subCategoryHint:'Metalwork & Jewelry' },
    { source:'wellcome',    limit:150, params:{workType:'k', query:'ceramics textile furniture metalwork glass silver jewelry'},    subCategoryHint:'Metalwork & Jewelry' },
  ],

};
