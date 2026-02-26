import { SourceConfig } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER TAXONOMY — Every source's native language per sub-category
//
// The rule: each config targets ONE specific sub-category using that source's
// OWN classification system. No broad department sweeps unless the source has
// no finer granularity (noted explicitly when that's the case).
//
// ─── SOURCE REFERENCE ────────────────────────────────────────────────────────
//
// MET: q= pre-filters via search endpoint; departmentId= constrains to dept;
//      objectName= is a post-fetch filter on the returned object's objectName field.
//      Without q=, /objects?departmentIds=N returns 175k+ random IDs.
//      Always use q= to pre-filter. Dept IDs:
//        1=American Decorative Arts, 6=Asian Art, 9=Drawings & Prints,
//        11=European Paintings, 12=European Sculpture & Dec Arts,
//        19=Photographs, 21=Modern & Contemporary
//
// ARTIC: artwork_type_title= exact Elasticsearch keyword (case-sensitive):
//        "Poster","Photograph","Painting","Drawing and Watercolor on Paper",
//        "Print and Multiple","Textile","Decorative Arts","Ceramic","Glass",
//        "Metalwork","Vessel"
//        classification_id=: PC-1=Painting&Sculpture Europe, PC-2=Prints&Drawings,
//        PC-12=Photography, PC-15=Textiles
//        department_title=: "Textiles","Applied Arts of Europe","Photography and Media"
//
// V&A: id_category= thesaurus ID (confirmed from collections.vam.ac.uk):
//        THES48943=Posters, THES48876=Graphic Art (ephemera/ads),
//        THES49308=Photographs, THES48960=Paintings, THES48927=Prints,
//        THES49144=Drawings, THES48852=Ceramics, THES49006=Furniture,
//        THES48881=Textiles, THES48991=Fashion and Dress,
//        THES48858=Metalwork, THES49232=Jewellery, THES49185=Silver
//
// LOC: collection= slug from loc.gov/collections/:
//        posters, fsa-owi-color-photographs, fsa-owi-black-and-white-negatives,
//        ansel-adams-manzanar, gottlieb-collection, look-magazine,
//        fine-prints-american-before-1940, historic-american-buildings,
//        civil-war-photographs, baseball-cards, broadside-ballads
//
// RIJKS: type= Dutch taxonomy (q='*' MANDATORY or returns 0):
//        affiche=poster, schilderij=painting, aquarel=watercolor,
//        prent=print(generic), ets=etching, houtsnede=woodcut,
//        lithografie=lithograph, zeefdruk=screenprint, tekening=drawing,
//        foto=photograph, aardewerk=ceramics, porselein=porcelain,
//        glas=glass, meubilair=furniture, textiel=textile, kant=lace,
//        tapijt=tapestry, zilverwerk=silverwork, goud=goldwork, sieraad=jewellery
//
// HARVARD: worktype= | classification= | technique= | medium= (all exact strings):
//        worktype: "Poster","Photograph","Painting","Print","Drawing"
//        classification: "Photographs","Prints","Drawings","Paintings","Posters",
//          "Textiles and Fashion Arts","Ceramics and Glass","Metalwork and Jewelry","Furniture"
//        technique: "Etching","Lithography","Photography","Woodcut","Engraving","Screen printing"
//        medium: free text — "Watercolor","Oil","Gouache","Gelatin silver print" etc.
//
// SMITHSONIAN: q= free text + unit_code=:
//        CHNDM=Cooper Hewitt Design, SAAM=American Art Museum,
//        NMAAHC=African American History, NMAH=American History,
//        NPG=National Portrait Gallery, HMSG=Hirshhorn (contemporary)
//
// NGA: classification= confirmed values:
//        "Painting","Photograph","Print","Drawing","Decorative Arts",
//        "Ceramic","Glass","Textile","Furniture","Jewelry"
//
// EUROPEANA: query= Boolean free text, always adds TYPE:IMAGE + reusability=open.
//        Use multilingual terms for maximum coverage.
//
// WELLCOME: workType='k' always (Pictures). query= narrows by subject.
//
// IA: subject= matched against item subject tags. mediatype='image'.
//
// COOPER: typeFilter= post-fetch filter on type/classification/medium fields.
//        Confirmed type values in their GitHub dump:
//        "Poster","Drawing","Print","Photograph","Textile","Furniture",
//        "Product","Jewelry","Ceramic","Wallcovering","Graphic design"
//
// WIKIMEDIA: category= exact Commons category name (case-sensitive).
//
// NYPL: subject= keyword filter. Requires NYPL_API_KEY.
// ═══════════════════════════════════════════════════════════════════════════════

export const CategoryMap: Record<string, SourceConfig[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GRAPHIC DESIGN
  //    Applied art for visual communication. Intent: sell, inform, persuade.
  //    Defined by REPRODUCIBILITY. This is NOT fine art — it is commercial art.
  //
  //    Sub-categories:
  //      Posters & Advertising — travel posters (Swiss Style), war propaganda,
  //        film posters, mid-century print ads, trade cards, commercial ephemera
  //      Typography & Lettering — type specimens, Bauhaus/Futurism layouts,
  //        avant-garde typography, experimental 90s type
  //      Identity & Branding — corporate logos, brand guides, trademarks
  //      Editorial/Publication — magazine covers, book jackets, layout spreads
  //      Packaging — record sleeves (Blue Note, Factory Records), consumer goods, labels
  // ═══════════════════════════════════════════════════════════════════════════
  GRAPHIC_DESIGN: [

    // ─────────────────────────────────────────────────────────────────────────
    // POSTERS & ADVERTISING
    // ─────────────────────────────────────────────────────────────────────────

    // MET — dept 9 (Drawings & Prints). objectName='Poster' is the MET's own
    // classification for commercial posters. q= required to pre-filter.
    { source: 'met', limit: 400,
      params: { q: 'poster', departmentId: '9', objectName: 'Poster' },
      subCategoryHint: 'Poster' },

    // MET — dept 21 (Modern & Contemporary). Has significant mid-century and
    // contemporary poster design including Warhol, Lichtenstein era graphic work.
    { source: 'met', limit: 150,
      params: { q: 'poster', departmentId: '21' },
      subCategoryHint: 'Poster' },

    // MET — Trade cards: 19th century illustrated advertising cards.
    // objectName='Trade card' is MET's own classification for these.
    { source: 'met', limit: 150,
      params: { q: 'trade card', departmentId: '9', objectName: 'Trade card' },
      subCategoryHint: 'Advertising' },

    // MET — Advertisements: MET classifies some commercial prints as 'Advertisement'
    { source: 'met', limit: 100,
      params: { q: 'advertisement', departmentId: '9', objectName: 'Advertisement' },
      subCategoryHint: 'Advertising' },

    // ARTIC — "Poster" is their exact artwork_type_title for graphic communication,
    // advertising posters, travel posters, propaganda. Strict Elasticsearch keyword.
    { source: 'artic', limit: 300,
      params: { artwork_type_title: 'Poster' },
      subCategoryHint: 'Poster' },

    // V&A — THES48943 is their dedicated Posters thesaurus node.
    // Contains travel, war, cultural event, and advertising posters.
    { source: 'va', limit: 300,
      params: { id_category: 'THES48943' },
      subCategoryHint: 'Poster' },

    // V&A — THES48876 = "Graphic Art" — their node for printed ephemera:
    // trade cards, handbills, advertisements, commercial printed matter.
    { source: 'va', limit: 200,
      params: { id_category: 'THES48876' },
      subCategoryHint: 'Advertising' },

    // LOC — 'posters' collection: WPA New Deal posters, WWII propaganda,
    // travel posters, health/safety posters. Confirmed working slug.
    { source: 'loc', limit: 400,
      params: { collection: 'posters' },
      subCategoryHint: 'Poster' },

    // LOC — 'baseball-cards' collection: illustrated trade cards from 1880s-1900s.
    // These are chromolithograph advertising cards — canonical commercial printing.
    { source: 'loc', limit: 150,
      params: { collection: 'baseball-cards' },
      subCategoryHint: 'Advertising' },

    // LOC — 'broadside-ballads': broadsides are the earliest mass-produced
    // typographic communication — typography + advertising in one.
    { source: 'loc', limit: 150,
      params: { collection: 'broadside-ballads' },
      subCategoryHint: 'Typography' },

    // RIJKS — affiche = Dutch for poster. Their affiche collection includes
    // Dutch Art Nouveau, Jugendstil, and mid-century design posters.
    { source: 'rijks', limit: 200,
      params: { type: 'affiche', q: '*' },
      subCategoryHint: 'Poster' },

    // HARVARD — worktype='Poster' is their primary classification for posters.
    { source: 'harvard', limit: 200,
      params: { worktype: 'Poster' },
      subCategoryHint: 'Poster' },

    // HARVARD — classification='Posters' is a separate classification field.
    // Both worktype and classification should be queried for full coverage.
    { source: 'harvard', limit: 150,
      params: { classification: 'Posters' },
      subCategoryHint: 'Poster' },

    // SMITHSONIAN NMAH — National Museum of American History. Strong American
    // poster and propaganda collection: WWII, political, advertising.
    { source: 'smithsonian', limit: 200,
      params: { q: 'poster propaganda advertisement', unit_code: 'NMAH' },
      subCategoryHint: 'Poster' },

    // SMITHSONIAN CHNDM — Cooper Hewitt Design Museum. Their graphic design
    // collection includes posters, packaging, identity.
    { source: 'smithsonian', limit: 150,
      params: { q: 'poster graphic design', unit_code: 'CHNDM' },
      subCategoryHint: 'Poster' },

    // COOPER — typeFilter='poster' matches type="Poster" in their collection dump.
    // Cooper Hewitt holds thousands of international design posters.
    { source: 'cooper', limit: 300,
      params: { typeFilter: 'poster' },
      subCategoryHint: 'Poster' },

    // EUROPEANA — European poster collections. Multilingual: poster/affiche/plakat/cartel.
    { source: 'europeana', limit: 200,
      params: { query: 'poster OR affiche OR plakat OR cartel' },
      subCategoryHint: 'Poster' },

    // EUROPEANA — Travel poster specifically: Swiss Style, railway, tourism.
    { source: 'europeana', limit: 150,
      params: { query: '"travel poster" OR "railway poster" OR "tourism poster" OR "Swiss poster"' },
      subCategoryHint: 'Poster' },

    // EUROPEANA — War propaganda specifically.
    { source: 'europeana', limit: 150,
      params: { query: '"war poster" OR "propaganda poster" OR "recruitment poster"' },
      subCategoryHint: 'Advertising' },

    // EUROPEANA — Trade cards and commercial ephemera.
    { source: 'europeana', limit: 150,
      params: { query: '"trade card" OR "advertising card" OR "commercial print" OR "printed ephemera"' },
      subCategoryHint: 'Advertising' },

    // WIKIMEDIA — Propaganda posters category (confirmed active, thousands of items).
    { source: 'wikimedia', limit: 150,
      params: { category: 'Propaganda posters' },
      subCategoryHint: 'Poster' },

    // WIKIMEDIA — Travel posters category.
    { source: 'wikimedia', limit: 150,
      params: { category: 'Travel posters' },
      subCategoryHint: 'Poster' },

    // WIKIMEDIA — WPA posters: New Deal government-commissioned graphic design.
    { source: 'wikimedia', limit: 100,
      params: { category: 'WPA posters' },
      subCategoryHint: 'Poster' },

    // WIKIMEDIA — Film posters category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Film posters' },
      subCategoryHint: 'Poster' },

    // WIKIMEDIA — Art Nouveau posters: Mucha, Toulouse-Lautrec, Steinlen.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Art Nouveau posters' },
      subCategoryHint: 'Poster' },

    // WELLCOME — Health and public safety posters. Wellcome has an exceptional
    // collection of social history graphic communication.
    { source: 'wellcome', limit: 200,
      params: { workType: 'k', query: 'poster propaganda health public warning' },
      subCategoryHint: 'Poster' },

    // IA — Poster subjects in image collection.
    { source: 'ia', limit: 200,
      params: { subject: 'posters', mediatype: 'image' },
      subCategoryHint: 'Poster' },

    // IA — Rave flyers: subcultural graphic design 1988-2000.
    // Archive.org holds the largest digitised rave flyer collection.
    { source: 'ia', limit: 200,
      params: { subject: 'rave flyer', mediatype: 'image' },
      subCategoryHint: 'Advertising' },

    // NYPL — Posters from their digital collections.
    { source: 'nypl', limit: 200,
      params: { subject: 'posters' },
      subCategoryHint: 'Poster' },

    // HARVARD Middle East Posters — Arabic, Iranian, Palestinian political posters.
    { source: 'harvardme', limit: 200,
      params: {},
      subCategoryHint: 'Poster' },

    // ─────────────────────────────────────────────────────────────────────────
    // TYPOGRAPHY & LETTERING
    // Type specimens, Bauhaus layouts, Futurism, Constructivism, experimental type
    // ─────────────────────────────────────────────────────────────────────────

    // COOPER — typeFilter='graphic design' matches objects classified as graphic
    // design, which includes type specimens, lettering, and layout work at Cooper Hewitt.
    { source: 'cooper', limit: 200,
      params: { typeFilter: 'graphic design' },
      subCategoryHint: 'Typography' },

    // EUROPEANA — Type specimens: printed sheets showing a typeface's characters.
    // Bauhaus, Constructivism, Futurism all produced significant typographic work.
    { source: 'europeana', limit: 150,
      params: { query: '"type specimen" OR "specimen sheet" OR lettering OR Bauhaus OR Constructivism OR Futurism OR "De Stijl"' },
      subCategoryHint: 'Typography' },

    // WELLCOME — Type specimens and lettering from their printing/publishing collection.
    { source: 'wellcome', limit: 100,
      params: { workType: 'k', query: 'type specimen lettering alphabet typography' },
      subCategoryHint: 'Typography' },

    // WIKIMEDIA — Bauhaus posters represent the peak of avant-garde typography.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Bauhaus posters' },
      subCategoryHint: 'Typography' },

    // ─────────────────────────────────────────────────────────────────────────
    // EDITORIAL / PUBLICATION
    // Magazine covers, book jackets, layout spreads, catalogues
    // ─────────────────────────────────────────────────────────────────────────

    // DESIGN REVIEWED — Entire site is curated editorial graphic design:
    // Swiss modernism, mid-century design, magazines, catalogues, books.
    // Their WordPress taxonomy maps to Editorial/Typography/Poster/Packaging in adapter.
    { source: 'designreviewed', limit: 500,
      params: {},
      subCategoryHint: 'Editorial' },

    // COOPER — Books, magazines, periodicals as designed objects.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'book' },
      subCategoryHint: 'Editorial' },

    // SMITHSONIAN CHNDM — Editorial and publication design in the Cooper Hewitt collection.
    { source: 'smithsonian', limit: 150,
      params: { q: 'magazine cover book jacket editorial publication layout', unit_code: 'CHNDM' },
      subCategoryHint: 'Editorial' },

    // ─────────────────────────────────────────────────────────────────────────
    // PACKAGING
    // Record sleeves, consumer goods, labels, boxes
    // ─────────────────────────────────────────────────────────────────────────

    // LETTERFORM ARCHIVE — Their Mastodon bot posts scans from the archive:
    // posters, books, type specimens, record covers, packaging, ephemera.
    // Tag-based sub-classification in the adapter handles the variety.
    { source: 'letterform', limit: 600,
      params: {},
      subCategoryHint: 'Packaging' },

    // COOPER — Packaging objects in their collection.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'packaging' },
      subCategoryHint: 'Packaging' },

    // EUROPEANA — Product labels, packaging, consumer goods.
    { source: 'europeana', limit: 150,
      params: { query: '"record sleeve" OR "album cover" OR packaging OR "product label" OR "tin label"' },
      subCategoryHint: 'Packaging' },

    // ─────────────────────────────────────────────────────────────────────────
    // IDENTITY & BRANDING
    // Corporate logos, brand guides, trademarks, corporate identity systems
    // ─────────────────────────────────────────────────────────────────────────

    // SMITHSONIAN CHNDM — Identity and branding work: Paul Rand IBM, CBS,
    // Saul Bass logos, corporate identity systems.
    { source: 'smithsonian', limit: 150,
      params: { q: 'logo trademark identity brand corporate mark', unit_code: 'CHNDM' },
      subCategoryHint: 'Identity & Branding' },
  ],


  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PAINTING
  //    Unique, non-reproducible works created with liquid media on a support.
  //    NEVER include prints, lithographs, or photographic reproductions.
  //
  //    Sub-categories:
  //      Oil — oil on canvas, oil on panel, oil on copper
  //      Watercolor — watercolour on paper
  //      Tempera — egg tempera, distemper
  //      Gouache — opaque watercolor
  //      Acrylic — modern synthetic paint
  //      Fresco — wall painting
  // ═══════════════════════════════════════════════════════════════════════════
  PAINTING: [

    // ─────────────────────────────────────────────────────────────────────────
    // OIL PAINTING
    // Oil on canvas, oil on panel, oil on copper. The primary painting medium.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — dept 11 = European Paintings. This entire department is oil and
    // tempera paintings on canvas/panel. No further q= filter needed because
    // the entire department is paintings.
    { source: 'met', limit: 400,
      params: { departmentId: '11' },
      subCategoryHint: 'Oil' },

    // MET — dept 21 (Modern & Contemporary). Filtered to objectName='Painting'
    // to exclude prints and photographs in the same department.
    { source: 'met', limit: 200,
      params: { q: 'oil painting canvas', departmentId: '21', objectName: 'Painting' },
      subCategoryHint: 'Oil' },

    // MET — Asian paintings: ink and color on silk/paper, East Asian tradition.
    { source: 'met', limit: 150,
      params: { q: 'painting', departmentId: '6', objectName: 'Painting' },
      subCategoryHint: 'Oil' },

    // NGA — classification='Painting' is their confirmed field value for all
    // paintings. NGA has exceptional Dutch, Flemish, French, Italian holdings.
    { source: 'nga', limit: 300,
      params: { classification: 'Painting' },
      subCategoryHint: 'Oil' },

    // ARTIC — classification_id='PC-1' = Painting and Sculpture of Europe dept.
    { source: 'artic', limit: 300,
      params: { classification_id: 'PC-1' },
      subCategoryHint: 'Oil' },

    // ARTIC — artwork_type_title='Painting' catches paintings outside the
    // European dept (American, Asian, Modern paintings).
    { source: 'artic', limit: 200,
      params: { artwork_type_title: 'Painting' },
      subCategoryHint: 'Oil' },

    // RIJKS — schilderij = Dutch for painting (oil/tempera). The Rijksmuseum
    // is the definitive source for Dutch Golden Age painting.
    { source: 'rijks', limit: 300,
      params: { type: 'schilderij', q: '*' },
      subCategoryHint: 'Oil' },

    // HARVARD — classification='Paintings' is their exact combined field.
    { source: 'harvard', limit: 200,
      params: { classification: 'Paintings' },
      subCategoryHint: 'Oil' },

    // V&A — THES48960 = Paintings thesaurus node.
    { source: 'va', limit: 200,
      params: { id_category: 'THES48960' },
      subCategoryHint: 'Oil' },

    // SMITHSONIAN SAAM — Smithsonian American Art Museum. Largest collection of
    // American paintings: Hudson River School, Ash Can School, Abstract Expressionism.
    { source: 'smithsonian', limit: 200,
      params: { q: 'oil painting canvas acrylic panel unique work', unit_code: 'SAAM' },
      subCategoryHint: 'Oil' },

    // EUROPEANA — "oil on canvas" / "oil on panel" — precise medium terms that
    // appear in museum records. Multilingual for broad European coverage.
    { source: 'europeana', limit: 200,
      params: { query: '"oil on canvas" OR "oil on panel" OR "huile sur toile" OR "olieverf op doek" OR "Öl auf Leinwand" OR "olio su tela"' },
      subCategoryHint: 'Oil' },

    // WIKIMEDIA — Paintings commons category. Large, well-curated.
    { source: 'wikimedia', limit: 200,
      params: { category: 'Paintings' },
      subCategoryHint: 'Oil' },

    // ─────────────────────────────────────────────────────────────────────────
    // WATERCOLOR
    // Transparent watercolor on paper. Distinct from oil — more intimate scale.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='watercolor' searches across all departments for watercolor medium.
    { source: 'met', limit: 200,
      params: { q: 'watercolor' },
      subCategoryHint: 'Watercolor' },

    // RIJKS — aquarel = Dutch for watercolor. Rijksmuseum has strong Dutch
    // watercolor tradition: topographical views, natural history, landscapes.
    { source: 'rijks', limit: 200,
      params: { type: 'aquarel', q: '*' },
      subCategoryHint: 'Watercolor' },

    // HARVARD — medium='Watercolor' is a free-text medium filter that matches
    // items whose medium field contains "Watercolor".
    { source: 'harvard', limit: 150,
      params: { medium: 'Watercolor' },
      subCategoryHint: 'Watercolor' },

    // EUROPEANA — watercolour multilingual: English/French/German/Italian.
    { source: 'europeana', limit: 150,
      params: { query: 'watercolour OR watercolor OR aquarelle OR acquerello OR Aquarell' },
      subCategoryHint: 'Watercolor' },

    // WELLCOME — Medical and natural history watercolor illustrations.
    // Wellcome has an exceptional watercolor collection (anatomy, botany, travel).
    { source: 'wellcome', limit: 150,
      params: { workType: 'k', query: 'watercolour painting' },
      subCategoryHint: 'Watercolor' },

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPERA
    // Egg tempera on panel. Pre-oil tradition: medieval and early Renaissance.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='tempera' finds medieval and Renaissance panel paintings.
    { source: 'met', limit: 150,
      params: { q: 'tempera', departmentId: '11' },
      subCategoryHint: 'Tempera' },

    // EUROPEANA — tempera on panel / tempera on wood.
    { source: 'europeana', limit: 150,
      params: { query: '"tempera on panel" OR "tempera on wood" OR "egg tempera" OR "distemper"' },
      subCategoryHint: 'Tempera' },

    // ─────────────────────────────────────────────────────────────────────────
    // GOUACHE
    // Opaque watercolor. Used extensively in design, illustration, and fine art.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='gouache' finds gouache works across all departments.
    { source: 'met', limit: 100,
      params: { q: 'gouache' },
      subCategoryHint: 'Gouache' },

    // HARVARD — medium='Gouache' free-text medium filter.
    { source: 'harvard', limit: 100,
      params: { medium: 'Gouache' },
      subCategoryHint: 'Gouache' },

    // EUROPEANA — gouache multilingual.
    { source: 'europeana', limit: 100,
      params: { query: 'gouache OR guache OR bodycolour OR "body colour"' },
      subCategoryHint: 'Gouache' },
  ],


  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRINTS_AND_DRAWINGS
  //    Works on Paper. Bridge between fine art and mass production.
  //    NEVER include commercial posters/ads (that is GRAPHIC_DESIGN).
  //
  //    Sub-categories:
  //      Etching — intaglio, acid-bitten copper plate
  //      Engraving — intaglio, burin-cut copper/steel plate
  //      Woodcut — relief print from carved wood block
  //      Lithograph — planographic, limestone/metal plate
  //      Screenprint (Serigraph) — push-through stencil
  //      Monotype — unique transferred impression
  //      Drawing — charcoal, graphite, ink, pastel, chalk
  //      Collage — physical cut-and-paste works
  // ═══════════════════════════════════════════════════════════════════════════
  PRINTS_AND_DRAWINGS: [

    // ─────────────────────────────────────────────────────────────────────────
    // ETCHING
    // Intaglio. Acid-bitten plate. Rembrandt, Goya, Whistler.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='etching' within dept 9 (Drawings & Prints). Pre-filters to
    // etching works before sampling. Confirmed to return Rembrandt, Goya etc.
    { source: 'met', limit: 200,
      params: { q: 'etching', departmentId: '9' },
      subCategoryHint: 'Etching' },

    // HARVARD — technique='Etching' is their exact classification.
    { source: 'harvard', limit: 150,
      params: { technique: 'Etching' },
      subCategoryHint: 'Etching' },

    // RIJKS — ets = Dutch specifically for etching (not the generic prent).
    { source: 'rijks', limit: 150,
      params: { type: 'ets', q: '*' },
      subCategoryHint: 'Etching' },

    // WIKIMEDIA — Etchings commons category.
    { source: 'wikimedia', limit: 150,
      params: { category: 'Etchings' },
      subCategoryHint: 'Etching' },

    // WELLCOME — Medical and scientific etchings. Strong collection.
    { source: 'wellcome', limit: 200,
      params: { workType: 'k', query: 'etching intaglio aquatint mezzotint drypoint' },
      subCategoryHint: 'Etching' },

    // EUROPEANA — etching multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'etching OR aquaforte OR gravure OR Radierung OR ets' },
      subCategoryHint: 'Etching' },

    // ─────────────────────────────────────────────────────────────────────────
    // ENGRAVING
    // Intaglio. Burin-cut plate. Dürer, Hogarth, Piranesi.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='engraving' within dept 9.
    { source: 'met', limit: 200,
      params: { q: 'engraving', departmentId: '9' },
      subCategoryHint: 'Engraving' },

    // ARTIC — classification_id='PC-2' = Prints and Drawings department.
    // Contains etchings, engravings, woodcuts, lithographs, drawings.
    { source: 'artic', limit: 300,
      params: { classification_id: 'PC-2' },
      subCategoryHint: 'Engraving' },

    // V&A — THES48927 = Prints (their general print thesaurus node).
    { source: 'va', limit: 200,
      params: { id_category: 'THES48927' },
      subCategoryHint: 'Engraving' },

    // LOC — 'fine-prints-american-before-1940': curated American fine art prints.
    // Pre-WWII etchings, engravings, lithographs by American printmakers.
    { source: 'loc', limit: 300,
      params: { collection: 'fine-prints-american-before-1940' },
      subCategoryHint: 'Engraving' },

    // RIJKS — prent = Dutch for print (generic: engraving, etching, woodcut).
    // Rijksmuseum holds one of the world's largest print collections.
    { source: 'rijks', limit: 300,
      params: { type: 'prent', q: '*' },
      subCategoryHint: 'Engraving' },

    // NGA — classification='Print' covers all intaglio and relief techniques.
    { source: 'nga', limit: 200,
      params: { classification: 'Print' },
      subCategoryHint: 'Engraving' },

    // HARVARD — classification='Prints' covers all printmaking.
    { source: 'harvard', limit: 200,
      params: { classification: 'Prints' },
      subCategoryHint: 'Print' },

    // SMITHSONIAN SAAM — Fine art prints in the American collection.
    { source: 'smithsonian', limit: 150,
      params: { q: 'engraving etching intaglio burin plate', unit_code: 'SAAM' },
      subCategoryHint: 'Engraving' },

    // WIKIMEDIA — Engravings commons category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Engravings' },
      subCategoryHint: 'Engraving' },

    // EUROPEANA — engraving multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'engraving OR gravure en taille-douce OR Kupferstich OR incisione' },
      subCategoryHint: 'Engraving' },

    // ─────────────────────────────────────────────────────────────────────────
    // WOODCUT
    // Relief print from carved wood block. Dürer, Hokusai, German Expressionism.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='woodcut' within dept 9.
    { source: 'met', limit: 150,
      params: { q: 'woodcut', departmentId: '9' },
      subCategoryHint: 'Woodcut' },

    // RIJKS — houtsnede = Dutch specifically for woodcut.
    { source: 'rijks', limit: 150,
      params: { type: 'houtsnede', q: '*' },
      subCategoryHint: 'Woodcut' },

    // HARVARD — technique='Woodcut'.
    { source: 'harvard', limit: 100,
      params: { technique: 'Woodcut' },
      subCategoryHint: 'Woodcut' },

    // WIKIMEDIA — Woodcuts commons category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Woodcuts' },
      subCategoryHint: 'Woodcut' },

    // EUROPEANA — woodcut multilingual: Holzschnitt, xylographie.
    { source: 'europeana', limit: 150,
      params: { query: 'woodcut OR Holzschnitt OR xylographie OR houtsnede OR woodblock print' },
      subCategoryHint: 'Woodcut' },

    // ─────────────────────────────────────────────────────────────────────────
    // LITHOGRAPH
    // Planographic print. Toulouse-Lautrec, Daumier, Goya.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='lithograph' within dept 9.
    { source: 'met', limit: 150,
      params: { q: 'lithograph', departmentId: '9' },
      subCategoryHint: 'Lithograph' },

    // RIJKS — lithografie = Dutch specifically for lithograph.
    { source: 'rijks', limit: 150,
      params: { type: 'lithografie', q: '*' },
      subCategoryHint: 'Lithograph' },

    // HARVARD — technique='Lithography'.
    { source: 'harvard', limit: 150,
      params: { technique: 'Lithography' },
      subCategoryHint: 'Lithograph' },

    // WIKIMEDIA — Lithographs commons category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Lithographs' },
      subCategoryHint: 'Lithograph' },

    // IA — lithograph subjects in image collection.
    { source: 'ia', limit: 150,
      params: { subject: 'lithograph', mediatype: 'image' },
      subCategoryHint: 'Lithograph' },

    // EUROPEANA — lithograph multilingual: lithographie, Lithografie, litografia.
    { source: 'europeana', limit: 150,
      params: { query: 'lithograph OR lithographie OR Lithografie OR chromolithograph OR litografia' },
      subCategoryHint: 'Lithograph' },

    // ─────────────────────────────────────────────────────────────────────────
    // SCREENPRINT (SERIGRAPH)
    // Push-through stencil. Warhol, Pop Art, contemporary.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — q='screenprint' within dept 9.
    { source: 'met', limit: 100,
      params: { q: 'screenprint', departmentId: '9' },
      subCategoryHint: 'Screenprint' },

    // HARVARD — technique='Screen printing'.
    { source: 'harvard', limit: 100,
      params: { technique: 'Screen printing' },
      subCategoryHint: 'Screenprint' },

    // RIJKS — zeefdruk = Dutch for screenprint/silkscreen.
    { source: 'rijks', limit: 100,
      params: { type: 'zeefdruk', q: '*' },
      subCategoryHint: 'Screenprint' },

    // WIKIMEDIA — Screenprints commons category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Screenprints' },
      subCategoryHint: 'Screenprint' },

    // ─────────────────────────────────────────────────────────────────────────
    // DRAWING
    // Charcoal, graphite, ink, pastel, chalk. Preparatory studies and works in own right.
    // CRITICAL: excludeObjectNames removes commercial posters/ads that share dept 9.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — dept 9 drawings. Excludes commercial art classifications.
    // q targets drawing media specifically.
    { source: 'met', limit: 250,
      params: {
        q: 'drawing charcoal graphite chalk pastel ink study',
        departmentId: '9',
        excludeObjectNames: ['Poster', 'Trade card', 'Advertisement', 'Commercial art', 'Label']
      },
      subCategoryHint: 'Drawing' },

    // ARTIC — "Drawing and Watercolor on Paper" is their exact artwork_type_title
    // for drawings. This is ARTIC's specific type for works on paper in drawing media.
    { source: 'artic', limit: 200,
      params: { artwork_type_title: 'Drawing and Watercolor on Paper' },
      subCategoryHint: 'Drawing' },

    // V&A — THES49144 = Drawings (their thesaurus node).
    { source: 'va', limit: 200,
      params: { id_category: 'THES49144' },
      subCategoryHint: 'Drawing' },

    // RIJKS — tekening = Dutch for drawing.
    { source: 'rijks', limit: 200,
      params: { type: 'tekening', q: '*' },
      subCategoryHint: 'Drawing' },

    // NGA — classification='Drawing'.
    { source: 'nga', limit: 200,
      params: { classification: 'Drawing' },
      subCategoryHint: 'Drawing' },

    // HARVARD — classification='Drawings'.
    { source: 'harvard', limit: 150,
      params: { classification: 'Drawings' },
      subCategoryHint: 'Drawing' },

    // COOPER — drawing objects in their collection: design sketches,
    // preparatory studies, technical drawings.
    { source: 'cooper', limit: 200,
      params: { typeFilter: 'drawing' },
      subCategoryHint: 'Drawing' },

    // LOC — historic-american-buildings: architectural drawings and surveys.
    { source: 'loc', limit: 200,
      params: { collection: 'historic-american-buildings' },
      subCategoryHint: 'Drawing' },

    // WELLCOME — Anatomical and scientific drawings: preparatory studies,
    // natural history, medical illustrations.
    { source: 'wellcome', limit: 150,
      params: { workType: 'k', query: 'drawing sketch study preparatory charcoal chalk' },
      subCategoryHint: 'Drawing' },

    // SMITHSONIAN SAAM — drawings in the American art collection.
    { source: 'smithsonian', limit: 150,
      params: { q: 'drawing sketch study graphite charcoal pastel', unit_code: 'SAAM' },
      subCategoryHint: 'Drawing' },

    // NYPL — prints and drawings from their digital collections.
    { source: 'nypl', limit: 200,
      params: { subject: 'prints' },
      subCategoryHint: 'Print' },

    // COOPER — print objects in their collection.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'print' },
      subCategoryHint: 'Print' },
  ],


  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PHOTOGRAPHY
  //    Works produced by the action of light on a sensitive surface.
  //
  //    Sub-categories:
  //      Fine Art Photography — Pictorialism, Modernism, Conceptual
  //      Photojournalism/Documentary — street, war, social documentation
  //      Portraiture — daguerreotypes, studio portraits, fashion
  //      Technical/Experimental — photograms, cyanotypes, infrared
  // ═══════════════════════════════════════════════════════════════════════════
  PHOTOGRAPHY: [

    // ─────────────────────────────────────────────────────────────────────────
    // FINE ART PHOTOGRAPHY
    // Pictorialism, straight photography, Modernism, Conceptual.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — dept 19 = Photographs. The entire MET photography department.
    // Contains Alfred Stieglitz, Edward Weston, Diane Arbus, Cindy Sherman.
    { source: 'met', limit: 300,
      params: { departmentId: '19' },
      subCategoryHint: 'Fine Art Photography' },

    // ARTIC — classification_id='PC-12' = Photography and Media department.
    { source: 'artic', limit: 300,
      params: { classification_id: 'PC-12' },
      subCategoryHint: 'Fine Art Photography' },

    // ARTIC — artwork_type_title='Photograph' catches photographs outside
    // the Photography department (e.g. in Modern Art dept).
    { source: 'artic', limit: 200,
      params: { artwork_type_title: 'Photograph' },
      subCategoryHint: 'Fine Art Photography' },

    // V&A — THES49308 = Photographs (their photography thesaurus node).
    { source: 'va', limit: 300,
      params: { id_category: 'THES49308' },
      subCategoryHint: 'Fine Art Photography' },

    // NGA — classification='Photograph'.
    { source: 'nga', limit: 200,
      params: { classification: 'Photograph' },
      subCategoryHint: 'Fine Art Photography' },

    // HARVARD — classification='Photographs'.
    { source: 'harvard', limit: 200,
      params: { classification: 'Photographs' },
      subCategoryHint: 'Fine Art Photography' },

    // HARVARD — technique='Photography'. Catches items classified by technique
    // rather than object type.
    { source: 'harvard', limit: 150,
      params: { technique: 'Photography' },
      subCategoryHint: 'Fine Art Photography' },

    // RIJKS — foto = Dutch for photograph.
    { source: 'rijks', limit: 200,
      params: { type: 'foto', q: '*' },
      subCategoryHint: 'Fine Art Photography' },

    // LOC — Ansel Adams Manzanar collection: iconic fine art photography,
    // shot at the Manzanar internment camp 1943. Adams at his finest.
    { source: 'loc', limit: 200,
      params: { collection: 'ansel-adams-manzanar' },
      subCategoryHint: 'Fine Art Photography' },

    // COOPER — Photograph objects in the design collection.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'photograph' },
      subCategoryHint: 'Fine Art Photography' },

    // ─────────────────────────────────────────────────────────────────────────
    // PHOTOJOURNALISM / DOCUMENTARY
    // Street photography, war photography, social documentation.
    // ─────────────────────────────────────────────────────────────────────────

    // LOC — FSA/OWI color photographs: Farm Security Administration, 1939-1943.
    // Dorothea Lange, Russell Lee, Jack Delano — the defining American documentary archive.
    { source: 'loc', limit: 400,
      params: { collection: 'fsa-owi-color-photographs' },
      subCategoryHint: 'Documentary' },

    // LOC — FSA/OWI black and white negatives: the b&w companion to above.
    { source: 'loc', limit: 300,
      params: { collection: 'fsa-owi-black-and-white-negatives' },
      subCategoryHint: 'Documentary' },

    // LOC — LOOK Magazine collection: photojournalism from the defining 20th
    // century photo magazine. Street photography, social issues, celebrity.
    { source: 'loc', limit: 300,
      params: { collection: 'look-magazine' },
      subCategoryHint: 'Photojournalism' },

    // SMITHSONIAN NMAAHC — National Museum of African American History and Culture.
    // Extraordinary documentary photography of Black American life.
    { source: 'smithsonian', limit: 200,
      params: { q: 'photograph documentary portrait', unit_code: 'NMAAHC' },
      subCategoryHint: 'Documentary' },

    // SMITHSONIAN NMAH — National Museum of American History photography.
    { source: 'smithsonian', limit: 200,
      params: { q: 'photograph journalism documentary news history', unit_code: 'NMAH' },
      subCategoryHint: 'Photojournalism' },

    // WELLCOME — Medical and social documentary photography.
    // Wellcome holds significant public health and social history photography.
    { source: 'wellcome', limit: 200,
      params: { workType: 'k', query: 'photograph documentary portrait street' },
      subCategoryHint: 'Documentary' },

    // IA — photograph subjects in image collections.
    { source: 'ia', limit: 200,
      params: { subject: 'photographs', mediatype: 'image' },
      subCategoryHint: 'Documentary' },

    // EUROPEANA — documentary photography across European institutions.
    { source: 'europeana', limit: 150,
      params: { query: '"documentary photography" OR "street photography" OR "social photography" OR photojournalism' },
      subCategoryHint: 'Documentary' },

    // NYPL — photographs from their digital collections.
    { source: 'nypl', limit: 200,
      params: { subject: 'photographs' },
      subCategoryHint: 'Photojournalism' },

    // ─────────────────────────────────────────────────────────────────────────
    // PORTRAITURE
    // Studio portraits, daguerreotypes, fashion photography.
    // ─────────────────────────────────────────────────────────────────────────

    // LOC — Gottlieb Collection: fine portrait photography of jazz musicians,
    // literary figures, intellectuals. 1930s-1970s. Exceptional quality.
    { source: 'loc', limit: 200,
      params: { collection: 'gottlieb-collection' },
      subCategoryHint: 'Portraiture' },

    // LOC — Civil War photographs: daguerreotypes and wet plate portraits.
    // The earliest large-scale portrait photography in American history.
    { source: 'loc', limit: 200,
      params: { collection: 'civil-war-photographs' },
      subCategoryHint: 'Portraiture' },

    // SMITHSONIAN NPG — National Portrait Gallery photography.
    { source: 'smithsonian', limit: 150,
      params: { q: 'portrait photograph studio', unit_code: 'NPG' },
      subCategoryHint: 'Portraiture' },

    // EUROPEANA — daguerreotype, albumen print, carte de visite.
    // All are portrait photography formats from European archives.
    { source: 'europeana', limit: 200,
      params: { query: 'daguerreotype OR "albumen print" OR "carte de visite" OR "cabinet card" OR "studio portrait"' },
      subCategoryHint: 'Portraiture' },

    // WIKIMEDIA — portrait photography category.
    { source: 'wikimedia', limit: 150,
      params: { category: 'Black and white photographs' },
      subCategoryHint: 'Portraiture' },

    // ─────────────────────────────────────────────────────────────────────────
    // TECHNICAL / EXPERIMENTAL
    // Photograms, cyanotypes, infrared, lumen prints, alternative process.
    // ─────────────────────────────────────────────────────────────────────────

    // EUROPEANA — experimental photographic processes: cyanotype, photogram,
    // calotype, collodion. Multilingual for broad European coverage.
    { source: 'europeana', limit: 150,
      params: { query: '"gelatin silver" OR cyanotype OR photogram OR calotype OR collodion OR "albumen print" OR "gum bichromate"' },
      subCategoryHint: 'Experimental Photography' },

    // HARVARD — gelatin silver print as medium. This is the most common
    // fine art photography medium of the 20th century.
    { source: 'harvard', limit: 150,
      params: { medium: 'Gelatin silver print' },
      subCategoryHint: 'Experimental Photography' },

    // WELLCOME — experimental and technical photography:
    // X-rays, photomicrographs, scientific photography.
    { source: 'wellcome', limit: 150,
      params: { workType: 'k', query: 'cyanotype photogram calotype experimental process' },
      subCategoryHint: 'Experimental Photography' },

    // Arab Image Foundation — SWANA documentary and portrait photography.
    { source: 'aif', limit: 200,
      params: {},
      subCategoryHint: 'Documentary' },
  ],


  // ═══════════════════════════════════════════════════════════════════════════
  // 5. DECORATIVE_ARTS
  //    Applied Arts / Craft. Aesthetic value applied to functional form.
  //
  //    Sub-categories:
  //      Ceramics & Glass — pottery, porcelain, stained glass, blown glass
  //      Furniture — seating, tables, cabinetry (MCM, Art Deco)
  //      Textiles & Fashion — tapestries, embroidery, garments, lace
  //      Metalwork & Jewelry — silverware, enamels, clocks, adornment
  // ═══════════════════════════════════════════════════════════════════════════
  DECORATIVE_ARTS: [

    // ─────────────────────────────────────────────────────────────────────────
    // CERAMICS & GLASS
    // Pottery, porcelain, stained glass, blown glass, faience.
    // ─────────────────────────────────────────────────────────────────────────

    // MET — dept 12 = European Sculpture and Decorative Arts.
    // Contains Meissen, Sèvres, Delftware, Venetian glass.
    { source: 'met', limit: 300,
      params: { departmentId: '12' },
      subCategoryHint: 'Ceramics & Glass' },

    // MET — dept 6 = Asian Art, specifically porcelain objects.
    // Chinese export porcelain, Japanese Imari, Korean celadon.
    { source: 'met', limit: 200,
      params: { q: 'porcelain', departmentId: '6', objectName: 'Porcelain' },
      subCategoryHint: 'Ceramics & Glass' },

    // MET — dept 1 = American Decorative Arts. American pottery and glass.
    { source: 'met', limit: 150,
      params: { q: 'ceramic pottery glass', departmentId: '1' },
      subCategoryHint: 'Ceramics & Glass' },

    // ARTIC — artwork_type_title='Ceramic'. Their specific type for ceramics.
    { source: 'artic', limit: 200,
      params: { artwork_type_title: 'Ceramic' },
      subCategoryHint: 'Ceramics & Glass' },

    // ARTIC — artwork_type_title='Glass'. Their specific type for glass objects.
    { source: 'artic', limit: 150,
      params: { artwork_type_title: 'Glass' },
      subCategoryHint: 'Ceramics & Glass' },

    // ARTIC — artwork_type_title='Vessel'. Often ceramic or glass vessels.
    { source: 'artic', limit: 100,
      params: { artwork_type_title: 'Vessel' },
      subCategoryHint: 'Ceramics & Glass' },

    // ARTIC — Applied Arts of Europe department.
    { source: 'artic', limit: 150,
      params: { department_title: 'Applied Arts of Europe' },
      subCategoryHint: 'Ceramics & Glass' },

    // V&A — THES48852 = Ceramics (their dedicated ceramics thesaurus node).
    // The V&A has one of the world's finest ceramics collections.
    { source: 'va', limit: 300,
      params: { id_category: 'THES48852' },
      subCategoryHint: 'Ceramics & Glass' },

    // RIJKS — aardewerk = Dutch for earthenware/ceramics. Includes Delft.
    { source: 'rijks', limit: 200,
      params: { type: 'aardewerk', q: '*' },
      subCategoryHint: 'Ceramics & Glass' },

    // RIJKS — porselein = Dutch for porcelain. Chinese export and European.
    { source: 'rijks', limit: 150,
      params: { type: 'porselein', q: '*' },
      subCategoryHint: 'Ceramics & Glass' },

    // RIJKS — glas = Dutch for glass.
    { source: 'rijks', limit: 100,
      params: { type: 'glas', q: '*' },
      subCategoryHint: 'Ceramics & Glass' },

    // NGA — classification='Ceramic'.
    { source: 'nga', limit: 150,
      params: { classification: 'Ceramic' },
      subCategoryHint: 'Ceramics & Glass' },

    // NGA — classification='Glass'.
    { source: 'nga', limit: 100,
      params: { classification: 'Glass' },
      subCategoryHint: 'Ceramics & Glass' },

    // COOPER — ceramic objects in their design collection.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'ceramic' },
      subCategoryHint: 'Ceramics & Glass' },

    // HARVARD — classification='Ceramics and Glass' (their exact combined term).
    { source: 'harvard', limit: 150,
      params: { classification: 'Ceramics and Glass' },
      subCategoryHint: 'Ceramics & Glass' },

    // SMITHSONIAN CHNDM — ceramics in the design museum collection.
    { source: 'smithsonian', limit: 150,
      params: { q: 'ceramics pottery porcelain glass vessel', unit_code: 'CHNDM' },
      subCategoryHint: 'Ceramics & Glass' },

    // EUROPEANA — ceramics multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'ceramics OR pottery OR porcelain OR faience OR earthenware OR stoneware OR Delftware OR maiolica' },
      subCategoryHint: 'Ceramics & Glass' },

    // WIKIMEDIA — Ceramics commons category.
    { source: 'wikimedia', limit: 150,
      params: { category: 'Ceramics' },
      subCategoryHint: 'Ceramics & Glass' },

    // ─────────────────────────────────────────────────────────────────────────
    // FURNITURE
    // Seating, tables, cabinetry. Mid-Century Modern, Art Deco, Baroque.
    // ─────────────────────────────────────────────────────────────────────────

    // V&A — THES49006 = Furniture (their furniture thesaurus node).
    // The V&A has exceptional furniture: Chippendale, Morris, Eames-era.
    { source: 'va', limit: 200,
      params: { id_category: 'THES49006' },
      subCategoryHint: 'Furniture' },

    // RIJKS — meubilair = Dutch for furniture.
    { source: 'rijks', limit: 150,
      params: { type: 'meubilair', q: '*' },
      subCategoryHint: 'Furniture' },

    // NGA — classification='Decorative Arts' includes furniture.
    { source: 'nga', limit: 200,
      params: { classification: 'Decorative Arts' },
      subCategoryHint: 'Furniture' },

    // NGA — classification='Furniture' specifically.
    { source: 'nga', limit: 100,
      params: { classification: 'Furniture' },
      subCategoryHint: 'Furniture' },

    // COOPER — product/industrial design filter catches furniture and
    // designed objects: chairs, lamps, clocks, product design.
    { source: 'cooper', limit: 200,
      params: { typeFilter: 'product' },
      subCategoryHint: 'Furniture' },

    // HARVARD — classification='Furniture' (exact).
    { source: 'harvard', limit: 100,
      params: { classification: 'Furniture' },
      subCategoryHint: 'Furniture' },

    // SMITHSONIAN CHNDM — furniture design. Cooper Hewitt holds major
    // Mid-Century Modern and contemporary furniture design.
    { source: 'smithsonian', limit: 150,
      params: { q: 'furniture chair table cabinet desk design', unit_code: 'CHNDM' },
      subCategoryHint: 'Furniture' },

    // EUROPEANA — furniture multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'furniture OR cabinet OR chair OR "chaise" OR Möbel OR meuble OR meubles' },
      subCategoryHint: 'Furniture' },

    // ─────────────────────────────────────────────────────────────────────────
    // TEXTILES & FASHION
    // Tapestries, embroidery, garments, lace, woven textiles.
    // ─────────────────────────────────────────────────────────────────────────

    // V&A — THES48881 = Textiles (their primary textiles thesaurus node).
    // V&A has world's finest textile collection: tapestries, printed fabrics, woven.
    { source: 'va', limit: 300,
      params: { id_category: 'THES48881' },
      subCategoryHint: 'Textiles & Fashion' },

    // V&A — THES48991 = Fashion and Dress (garments, costume, accessories).
    { source: 'va', limit: 200,
      params: { id_category: 'THES48991' },
      subCategoryHint: 'Textiles & Fashion' },

    // ARTIC — Textiles department.
    { source: 'artic', limit: 200,
      params: { department_title: 'Textiles' },
      subCategoryHint: 'Textiles & Fashion' },

    // ARTIC — artwork_type_title='Textile'.
    { source: 'artic', limit: 150,
      params: { artwork_type_title: 'Textile' },
      subCategoryHint: 'Textiles & Fashion' },

    // RIJKS — textiel = Dutch for textile.
    { source: 'rijks', limit: 150,
      params: { type: 'textiel', q: '*' },
      subCategoryHint: 'Textiles & Fashion' },

    // RIJKS — kant = Dutch for lace. Strong Dutch lace collection.
    { source: 'rijks', limit: 100,
      params: { type: 'kant', q: '*' },
      subCategoryHint: 'Textiles & Fashion' },

    // RIJKS — tapijt = Dutch for carpet/tapestry.
    { source: 'rijks', limit: 100,
      params: { type: 'tapijt', q: '*' },
      subCategoryHint: 'Textiles & Fashion' },

    // COOPER — textile objects. Cooper Hewitt's largest single collection category.
    { source: 'cooper', limit: 300,
      params: { typeFilter: 'textile' },
      subCategoryHint: 'Textiles & Fashion' },

    // HARVARD — classification='Textiles and Fashion Arts' (their exact combined term).
    { source: 'harvard', limit: 150,
      params: { classification: 'Textiles and Fashion Arts' },
      subCategoryHint: 'Textiles & Fashion' },

    // SMITHSONIAN CHNDM — textiles and fashion design.
    { source: 'smithsonian', limit: 200,
      params: { q: 'textile fabric tapestry embroidery lace fashion garment', unit_code: 'CHNDM' },
      subCategoryHint: 'Textiles & Fashion' },

    // EUROPEANA — tapestry, embroidery, lace, woven textiles multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'tapestry OR textile OR embroidery OR lace OR weaving OR "woven fabric" OR broderie OR Gobelins' },
      subCategoryHint: 'Textiles & Fashion' },

    // WIKIMEDIA — Textile arts commons category.
    { source: 'wikimedia', limit: 100,
      params: { category: 'Textile arts' },
      subCategoryHint: 'Textiles & Fashion' },

    // ─────────────────────────────────────────────────────────────────────────
    // METALWORK & JEWELRY
    // Silverware, enamels, clocks, personal adornment. Goldsmiths, jewellers.
    // ─────────────────────────────────────────────────────────────────────────

    // V&A — THES48858 = Metalwork (silver, bronze, iron, copper objects).
    { source: 'va', limit: 200,
      params: { id_category: 'THES48858' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // V&A — THES49232 = Jewellery (rings, necklaces, brooches, etc.).
    { source: 'va', limit: 200,
      params: { id_category: 'THES49232' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // V&A — THES49185 = Silver (distinct from general Metalwork).
    { source: 'va', limit: 100,
      params: { id_category: 'THES49185' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // RIJKS — zilverwerk = Dutch for silverwork. Strong Dutch silver collection.
    { source: 'rijks', limit: 100,
      params: { type: 'zilverwerk', q: '*' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // RIJKS — goud = Dutch for goldwork.
    { source: 'rijks', limit: 100,
      params: { type: 'goud', q: '*' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // RIJKS — sieraad = Dutch for jewellery.
    { source: 'rijks', limit: 100,
      params: { type: 'sieraad', q: '*' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // COOPER — jewelry objects in the design collection.
    { source: 'cooper', limit: 150,
      params: { typeFilter: 'jewelry' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // HARVARD — classification='Metalwork and Jewelry' (their exact combined term).
    { source: 'harvard', limit: 150,
      params: { classification: 'Metalwork and Jewelry' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // NGA — classification='Jewelry'.
    { source: 'nga', limit: 100,
      params: { classification: 'Jewelry' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // ARTIC — artwork_type_title='Metalwork'.
    { source: 'artic', limit: 150,
      params: { artwork_type_title: 'Metalwork' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // SMITHSONIAN CHNDM — metalwork and jewelry design.
    { source: 'smithsonian', limit: 150,
      params: { q: 'metalwork jewelry silver gold enamel clock watch', unit_code: 'CHNDM' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // EUROPEANA — silverware, enamels, goldsmith work multilingual.
    { source: 'europeana', limit: 150,
      params: { query: 'silverware OR goldsmith OR enamel OR jewelry OR jewellery OR metalwork OR "silver gilt" OR orfèvrerie' },
      subCategoryHint: 'Metalwork & Jewelry' },

    // WELLCOME — decorative arts: metalwork, enamels, ornamental objects.
    { source: 'wellcome', limit: 150,
      params: { workType: 'k', query: 'metalwork silver jewelry enamel clock ornament decorative' },
      subCategoryHint: 'Metalwork & Jewelry' },
  ],
};
