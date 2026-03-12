// src/harvester/engine/classifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// WEIGHTED CLASSIFICATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

import { RawItem, ClassificationResult, ArchiveItem, SourceName } from '../types.js';
import { MET_TAXONOMY } from '../mappings/met-taxonomy.js';
import { ARTIC_TAXONOMY } from '../mappings/artic-taxonomy.js';
import { VA_TAXONOMY } from '../mappings/va-taxonomy.js';
import { RIJKS_HARVEST_TYPE_SCORES, RIJKS_KEYWORD_SCORES } from '../mappings/rijks-taxonomy.js';
import { SMITHSONIAN_TAXONOMY } from '../mappings/smithsonian-taxonomy.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
export const CONFIG = {
  THRESHOLD: 20,
  HAS_IMAGE_BONUS: 5,
  HAS_CREATOR_BONUS: 3,
  HAS_DATE_BONUS: 2,
  NEGATIVE_SIGNAL_PENALTY: -15,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
export function classifyItem(raw: RawItem): ClassificationResult {
  const { source, data } = raw;
  switch (source) {
    case 'met':          return classifyMet(data as Record<string, unknown>, raw);
    case 'artic':        return classifyArtic(data as Record<string, unknown>, raw);
    case 'va':           return classifyVa(data as Record<string, unknown>, raw);
    case 'rijks':        return classifyRijks(data as Record<string, unknown>, raw);
    case 'smithsonian':  return classifySmithsonian(data as Record<string, unknown>, raw);
    // CH files are saved flat (no .data wrapper), so pass raw itself as the data object
    case 'cooperhewitt':   return classifyCooperHewitt(raw as unknown as Record<string, unknown>, raw);
    // DA files are also saved flat (no .data wrapper) — fields live at root level
    case 'designarchive':  return classifyDesignArchive(raw as unknown as Record<string, unknown>, raw);
    default:
      return { accepted: false, score: 0, reasons: [`Unknown source: ${source}`] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  return String(val);
}

function extractYear(dateStr: string): string {
  if (!dateStr) return 'n.d.';
  const match = dateStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? match[0] : 'n.d.';
}

// ─────────────────────────────────────────────────────────────────────────────
// MET CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
function classifyMet(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  const departmentId   = data.departmentId as number;
  const objectName     = str(data.objectName);
  const classification = str(data.classification);
  const medium         = str(data.medium);
  const title          = str(data.title);

  for (const [catName, rules] of Object.entries(MET_TAXONOMY)) {
    let categoryScore = 0;
    const catReasons: string[] = [];

    if ((rules as any).departmentIds?.includes(departmentId)) {
      categoryScore += 8;
      catReasons.push(`Dept ${departmentId} matches ${catName} (+8)`);
    }

    if (objectName && (rules as any).objectNameScores?.[objectName]) {
      const { subCategory, score: objScore } = (rules as any).objectNameScores[objectName];
      categoryScore += objScore;
      bestSubCategory = subCategory;
      catReasons.push(`Object '${objectName}' → ${subCategory} (+${objScore})`);
    }

    if (classification && (rules as any).classificationScores?.[classification]) {
      const classScore = (rules as any).classificationScores[classification];
      categoryScore += classScore;
      catReasons.push(`Classification '${classification}' (+${classScore})`);
    }

    if (medium && (rules as any).mediumScores?.[medium]) {
      const medScore = (rules as any).mediumScores[medium];
      categoryScore += medScore;
      catReasons.push(`Medium '${medium}' (+${medScore})`);
      // Set a default subCategory for the category if not already set by objectName
      if (!bestSubCategory && (rules as any).defaultSubCategory) {
        bestSubCategory = (rules as any).defaultSubCategory;
      }
    }

    if ((rules as any).excludeObjectNames?.includes(objectName)) {
      categoryScore += CONFIG.NEGATIVE_SIGNAL_PENALTY;
      catReasons.push(`Excluded object '${objectName}' (${CONFIG.NEGATIVE_SIGNAL_PENALTY})`);
    }

    if (categoryScore > score) {
      score = categoryScore;
      reasons.length = 0;
      reasons.push(...catReasons);
    }
  }

  if (data.primaryImage) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }
  if (data.artistDisplayName) {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }
  if (data.objectDate) {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id: `met-${data.objectID}`,
      title: title || 'Untitled',
      author: str(data.artistDisplayName) || 'Unknown',
      year: extractYear(str(data.objectDate)),
      imageUrl: str(data.primaryImage) || null,
      source: 'met' as SourceName,
      link: `https://www.metmuseum.org/art/collection/search/${data.objectID}`,
      department: str(data.department) || 'Unknown',
      classification: classification || 'Unknown',
      medium: medium || 'Unknown',
      objectType: objectName || 'Unknown',
      mainCategory,
      subCategory: bestSubCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIC CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
function classifyArtic(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  const artworkType    = str(data.artwork_type_title);
  const classification = str(data.classification_title);
  const department     = str(data.department_title);
  const medium         = str(data.medium_display);
  const title          = str(data.title);

  for (const [catName, rules] of Object.entries(ARTIC_TAXONOMY)) {
    let categoryScore = 0;
    const catReasons: string[] = [];

    if (artworkType && (rules as any).artworkTypeScores?.[artworkType]) {
      const { subCategory, score: typeScore } = (rules as any).artworkTypeScores[artworkType];
      categoryScore += typeScore;
      bestSubCategory = subCategory;
      catReasons.push(`Type '${artworkType}' → ${subCategory} (+${typeScore})`);
    }

    if (classification && (rules as any).classificationScores?.[classification]) {
      const classScore = (rules as any).classificationScores[classification];
      categoryScore += classScore;
      catReasons.push(`Classification '${classification}' (+${classScore})`);
    }

    if (department && (rules as any).departmentScores?.[department]) {
      const deptScore = (rules as any).departmentScores[department];
      categoryScore += deptScore;
      catReasons.push(`Department '${department}' (+${deptScore})`);
    }

    if (categoryScore > score) {
      score = categoryScore;
      reasons.length = 0;
      reasons.push(...catReasons);
    }
  }

  if (data.image_id) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }
  if (data.artist_display) {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }
  if (data.date_display) {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  // If no artworkType/classification matched, assign default subCategory by department
  if (!bestSubCategory) {
    const deptDefaults: Record<string, string> = {
      'Prints and Drawings':               'Etching/Woodcut/Lithograph',
      'Applied Arts of Europe':            'Ceramics & Glass',
      'American Decorative Arts':          'Ceramics & Glass',
      'Architecture and Design':           'Drawings',
      'Painting and Sculpture of Europe':  'Oil',
      'Modern and Contemporary Art':       'Oil',
      'Photography and Media':             'Photograph',
    };
    const dept = str(data.department_title);
    if (deptDefaults[dept]) {
      bestSubCategory = deptDefaults[dept];
      reasons.push(`Default subCategory for dept '${dept}' → ${bestSubCategory}`);
    }
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  const imageId = data.image_id as string;
  return {
    accepted: true, score, reasons,
    item: {
      id: `artic-${data.id}`,
      title: title || 'Untitled',
      author: str(data.artist_display) || 'Unknown',
      year: extractYear(str(data.date_display)),
      imageUrl: imageId ? `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg` : null,
      source: 'artic' as SourceName,
      link: `https://www.artic.edu/artworks/${data.id}`,
      department: department || 'Unknown',
      classification: classification || 'Unknown',
      medium: medium || 'Unknown',
      objectType: artworkType || 'Unknown',
      mainCategory,
      subCategory: bestSubCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// V&A CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
function classifyVa(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  const objectType = str(data.objectType);
  const primaryCat = str((data as any)._primaryCategory);
  const title      = str((data as any)._primaryTitle);
  const medium     = str(data.materialsAndTechniques);

  for (const [catName, rules] of Object.entries(VA_TAXONOMY)) {
    let categoryScore = 0;
    const catReasons: string[] = [];

    if (objectType && (rules as any).objectTypeScores?.[objectType]) {
      const { subCategory, score: typeScore } = (rules as any).objectTypeScores[objectType];
      categoryScore += typeScore;
      bestSubCategory = subCategory;
      catReasons.push(`objectType '${objectType}' → ${subCategory} (+${typeScore})`);
    }

    if (primaryCat && (rules as any).categoryScores?.[primaryCat]) {
      const catScore = (rules as any).categoryScores[primaryCat];
      categoryScore += catScore;
      catReasons.push(`_primaryCategory '${primaryCat}' (+${catScore})`);
    }

    if (categoryScore > score) {
      score = categoryScore;
      reasons.length = 0;
      reasons.push(...catReasons);
    }
  }

  const imageUrl = extractVaImageUrl(data);
  if (imageUrl) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }
  if ((data as any)._primaryMaker?.name) {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }
  if ((data as any)._primaryDate) {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id: `va-${data.systemNumber}`,
      title: title || 'Untitled',
      author: str((data as any)._primaryMaker?.name) || 'Unknown',
      year: extractYear(str((data as any)._primaryDate)),
      imageUrl,
      source: 'va' as SourceName,
      link: `https://collections.vam.ac.uk/item/${data.systemNumber}/`,
      department: str((data as any)._primaryPlace) || 'V&A Museum',
      classification: objectType || primaryCat || 'Unknown',
      medium: medium || 'Unknown',
      objectType: objectType || 'Unknown',
      mainCategory,
      subCategory: bestSubCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

function extractVaImageUrl(data: Record<string, unknown>): string | null {
  const images = (data as any)._images;
  if (!images) return null;
  if (images.iiif_url) {
    return `${images.iiif_url}/full/!1280,1280/0/default.jpg`;
  }
  if (images._primary_thumbnail) {
    return String(images._primary_thumbnail).replace(/\/full\/![\\d,]+\//, '/full/!1280,1280/');
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RIJKS CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
function rijksTitle(d: Record<string, any>): string {
  const names: any[] = d.identified_by || [];
  const primary = names.find((n: any) =>
    n.type === 'Name' &&
    n.classified_as?.some((c: any) => c.id?.includes('300404670') || c.id?.includes('300417200'))
  );
  if (primary?.content) return String(primary.content);
  return String(names.find((n: any) => n.type === 'Name')?.content || 'Untitled');
}

function rijksInventory(d: Record<string, any>): string {
  return String(
    (d.identified_by || []).find((i: any) =>
      i.type === 'Identifier' &&
      i.classified_as?.some((c: any) => c.id?.includes('300312355'))
    )?.content || ''
  );
}

function rijksYear(d: Record<string, any>): string {
  const ts = d.produced_by?.timespan;
  if (!ts) return 'n.d.';
  const m = (ts.begin_of_the_begin || ts.end_of_the_end || '').match(/^(\d{4})/);
  return m ? m[1] : 'n.d.';
}

function rijksArtist(d: Record<string, any>): string {
  for (const ref of d.produced_by?.referred_to_by || []) {
    const isEN = ref.language?.some((l: any) => l.id?.includes('300388277'));
    if (isEN && ref.content) return String(ref.content).replace(/\s*\(.*\)\s*$/, '').trim();
  }
  for (const part of d.produced_by?.part || []) {
    const carriedOutBy = part.assigned_by?.[0]?.assigned?.[0];
    if (carriedOutBy?.id) {
      const name = part.referred_to_by?.find((r: any) =>
        r.language?.some((l: any) => l.id?.includes('300388277'))
      )?.content;
      if (name) return String(name).replace(/\s*\(.*\)\s*$/, '').trim();
    }
  }
  return 'Unknown';
}

function rijksMedium(d: Record<string, any>): string {
  const techniques = d.produced_by?.technique || [];
  if (techniques.length > 0) {
    const tech = techniques[0];
    return str(tech.identified_by?.[0]?.content || tech._label || 'Unknown');
  }
  return 'Unknown';
}

function rijksDescription(d: Record<string, any>): string {
  return (d.referred_to_by || []).map((r: any) => r.content || '').filter(Boolean).join(' ');
}

function rijksImageUrl(d: Record<string, any>): string | null {
  if (d.representation?.length) return String(d.representation[0].id);
  if (d._webImageUrl) return String(d._webImageUrl);
  return null;
}

function classifyRijks(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const d = data as Record<string, any>;
  let score = 0;
  let subCategory = '';
  const reasons: string[] = [];

  const harvestType = str(d._harvestType);
  if (harvestType) {
    const entry = RIJKS_HARVEST_TYPE_SCORES[harvestType.toLowerCase()];
    if (entry) {
      score += entry.score;
      subCategory = entry.subCategory;
      reasons.push(`_harvestType "${harvestType}" → ${subCategory} (+${entry.score})`);
    }
  }

  if (score === 0) {
    const combined = `${rijksTitle(d)} ${rijksDescription(d)}`.toLowerCase();
    for (const rule of RIJKS_KEYWORD_SCORES) {
      if (rule.keywords.some(kw => combined.includes(kw))) {
        score += rule.score;
        subCategory = rule.subCategory;
        reasons.push(`keyword "${rule.keywords[0]}" → ${rule.subCategory} (+${rule.score})`);
        break;
      }
    }
  }

  const imageUrl = rijksImageUrl(d);
  if (imageUrl) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }

  const artist = rijksArtist(d);
  if (artist && artist !== 'Unknown') {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }

  const year = rijksYear(d);
  if (year && year !== 'n.d.') {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const numericId  = str(raw.id);
  const inventory  = rijksInventory(d);
  const mainCategory = mapSubToMain(subCategory);

  return {
    accepted: true, score, reasons,
    item: {
      id: `rijks-${numericId}`,
      source: 'rijks' as SourceName,
      link: inventory
        ? `https://www.rijksmuseum.nl/en/collection/${inventory}`
        : `https://www.rijksmuseum.nl/en/search`,
      title: rijksTitle(d),
      author: artist,
      year: rijksYear(d),
      imageUrl,
      department: 'Rijksmuseum',
      classification: harvestType || 'Unknown',
      medium: rijksMedium(d),
      objectType: harvestType || 'Unknown',
      mainCategory,
      subCategory: subCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMITHSONIAN CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
function classifySmithsonian(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  const d          = data as Record<string, any>;
  const unitCode   = str(d.unitCode);
  const objectType = str(d.content?.freetext?.objectType?.[0]?.content);
  const title      = str(d.title);

  for (const [catName, rules] of Object.entries(SMITHSONIAN_TAXONOMY)) {
    let categoryScore = 0;
    const catReasons: string[] = [];

    if (unitCode && (rules as any).unitCodeScores?.[unitCode]) {
      const unitScore = (rules as any).unitCodeScores[unitCode];
      categoryScore += unitScore;
      catReasons.push(`Unit '${unitCode}' matches ${catName} (+${unitScore})`);
    }

    if (objectType && (rules as any).objectTypeScores?.[objectType]) {
      const { subCategory, score: typeScore } = (rules as any).objectTypeScores[objectType];
      categoryScore += typeScore;
      bestSubCategory = subCategory;
      catReasons.push(`Type '${objectType}' → ${subCategory} (+${typeScore})`);
    }

    if (categoryScore > score) {
      score = categoryScore;
      reasons.length = 0;
      reasons.push(...catReasons);
    }
  }

  const media: any[]   = d.content?.descriptiveNonRepeating?.online_media?.media ?? [];
  const imageEntry      = media.find((m: any) => String(m.type ?? '').toLowerCase() === 'images') ?? media[0];
  const imageUrl        = imageEntry?.content ? String(imageEntry.content) : null;

  if (imageUrl) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }

  const siArtist = str(d.content?.freetext?.name?.[0]?.content);
  if (siArtist) {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }

  const siDate = str(d.content?.freetext?.date?.[0]?.content);
  if (siDate) {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  // If item passed via unitCode but had no objectType match,
  // assign the institution's default subCategory
  if (!bestSubCategory) {
    const unitCodeDefaults: Record<string, string> = {
      'CHNDM':  'Posters & Advertising',
      'SAAM':   'Oil',
      'NPG':    'Oil',
      'NMAH':   'Photograph',
      'NMAAHC': 'Photograph',
      'NMAI':   'Ceramics & Glass',
    };
    if (unitCodeDefaults[unitCode]) {
      bestSubCategory = unitCodeDefaults[unitCode];
      reasons.push(`Default subCategory for '${unitCode}' → ${bestSubCategory}`);
    }
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id: `smithsonian-${data.id}`,
      title: title || 'Untitled',
      author: siArtist || 'Unknown',
      year: extractYear(siDate),
      imageUrl,
      source: 'smithsonian' as SourceName,
      link: str(d.content?.descriptiveNonRepeating?.record_link)
        || `https://collections.si.edu/search/record/${data.id}`,
      department: unitCode || 'Unknown',
      classification: objectType || 'Unknown',
      medium: str(d.content?.freetext?.physicalDescription?.[0]?.content) || 'Unknown',
      objectType: objectType || 'Unknown',
      mainCategory,
      subCategory: bestSubCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COOPER HEWITT CLASSIFIER
//
// CH files are saved flat by harvest-cooperhewitt.ts — NOT the standard
// {id, source, fetchedAt, data} wrapper. Shape is:
//   { id, source, title, medium, date, imageUrl, url, department, objectType, raw: {...github obj} }
//
// In classifyItem, `data = raw.data` will be undefined for CH files.
// We handle this by passing `raw` itself as the data argument in the dispatch.
//
// The GitHub JSON object (data.raw) has a clean `type` field: "Poster", "Drawing", etc.
// That is the primary classification signal.
// ─────────────────────────────────────────────────────────────────────────────
const CH_TYPE_MAP: Record<string, { subCategory: string; score: number }> = {
  // Graphic Design
  'poster':              { subCategory: 'Posters & Advertising',  score: 25 },
  'posters':             { subCategory: 'Posters & Advertising',  score: 25 },
  'advertisement':       { subCategory: 'Posters & Advertising',  score: 22 },
  'broadside':           { subCategory: 'Posters & Advertising',  score: 22 },
  'trade card':          { subCategory: 'Posters & Advertising',  score: 22 },
  'showcard':            { subCategory: 'Posters & Advertising',  score: 20 },
  'handbill':            { subCategory: 'Posters & Advertising',  score: 20 },
  'chromolithograph':    { subCategory: 'Posters & Advertising',  score: 18 },
  'type specimen':       { subCategory: 'Typography & Lettering', score: 25 },
  'typeface':            { subCategory: 'Typography & Lettering', score: 25 },
  'lettering':           { subCategory: 'Typography & Lettering', score: 22 },
  'alphabet':            { subCategory: 'Typography & Lettering', score: 20 },
  'calligraphy':         { subCategory: 'Typography & Lettering', score: 20 },
  'logo':                { subCategory: 'Identity & Branding',    score: 25 },
  'trademark':           { subCategory: 'Identity & Branding',    score: 25 },
  'logotype':            { subCategory: 'Identity & Branding',    score: 25 },
  'monogram':            { subCategory: 'Identity & Branding',    score: 22 },
  'letterhead':          { subCategory: 'Identity & Branding',    score: 22 },
  'stationery':          { subCategory: 'Identity & Branding',    score: 20 },
  'book jacket':         { subCategory: 'Editorial/Publication',  score: 25 },
  'book cover':          { subCategory: 'Editorial/Publication',  score: 25 },
  'dust jacket':         { subCategory: 'Editorial/Publication',  score: 25 },
  'magazine cover':      { subCategory: 'Editorial/Publication',  score: 25 },
  'brochure':            { subCategory: 'Editorial/Publication',  score: 22 },
  'catalog':             { subCategory: 'Editorial/Publication',  score: 22 },
  'menu':                { subCategory: 'Editorial/Publication',  score: 20 },
  'annual report':       { subCategory: 'Editorial/Publication',  score: 20 },
  'label':               { subCategory: 'Packaging',              score: 25 },
  'packaging':           { subCategory: 'Packaging',              score: 25 },
  'wrapper':             { subCategory: 'Packaging',              score: 22 },
  // Prints & Drawings
  'print':               { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'prints':              { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'etching':             { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'engraving':           { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'woodcut':             { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'woodblock':           { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'lithograph':          { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'screenprint':         { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'aquatint':            { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'mezzotint':           { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'linocut':             { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'drypoint':            { subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  'drawing':             { subCategory: 'Drawings',                   score: 25 },
  'drawings':            { subCategory: 'Drawings',                   score: 25 },
  'sketch':              { subCategory: 'Drawings',                   score: 22 },
  'collage':             { subCategory: 'Collage',                    score: 25 },
  // Photography
  'photograph':          { subCategory: 'Photograph', score: 25 },
  'photography':         { subCategory: 'Photograph', score: 25 },
  'daguerreotype':       { subCategory: 'Photograph', score: 25 },
  'tintype':             { subCategory: 'Photograph', score: 25 },
  'cyanotype':           { subCategory: 'Photograph', score: 25 },
  // Painting
  'painting':            { subCategory: 'Oil',                score: 22 },
  'watercolor':          { subCategory: 'Watercolor/Gouache', score: 22 },
  'watercolour':         { subCategory: 'Watercolor/Gouache', score: 22 },
};

function classifyCooperHewitt(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  // data = the whole CH file object (flat, not wrapped in .data)
  // data.raw = the GitHub JSON with the clean `type` field
  const ch     = ((data as any).raw ?? {}) as Record<string, any>;
  const type   = str(ch.type).toLowerCase();
  const medium = str((data as any).medium || ch.medium).toLowerCase();
  const title  = str((data as any).title).toLowerCase();
  const imageUrl = str((data as any).imageUrl) || null;

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  // 1. Try exact type match
  if (type && CH_TYPE_MAP[type]) {
    const { subCategory, score: typeScore } = CH_TYPE_MAP[type];
    bestSubCategory = subCategory;
    score += typeScore;
    reasons.push(`CH type "${ch.type}" → ${subCategory} (+${typeScore})`);
  }

  // 2. Try partial type match (handles compound types like "letterpress printing")
  if (!bestSubCategory && type) {
    for (const [key, rule] of Object.entries(CH_TYPE_MAP)) {
      if (type.includes(key)) {
        bestSubCategory = rule.subCategory;
        score += rule.score - 3; // slight penalty for partial match
        reasons.push(`CH type "${ch.type}" ~ "${key}" → ${rule.subCategory} (+${rule.score - 3})`);
        break;
      }
    }
  }

  // 3. Medium fallback
  if (!bestSubCategory) {
    if (/gelatin silver|albumen|daguerreotype|chromogenic|cyanotype|platinum print/.test(medium)) {
      bestSubCategory = 'Photograph';
      score += 18;
      reasons.push(`medium photo process → Photograph (+18)`);
    } else if (/etching|engraving|lithograph|woodcut|screenprint|aquatint|mezzotint/.test(medium)) {
      bestSubCategory = 'Etching/Woodcut/Lithograph';
      score += 18;
      reasons.push(`medium print process → Etching/Woodcut/Lithograph (+18)`);
    } else if (/watercolou?r|gouache/.test(medium)) {
      bestSubCategory = 'Watercolor/Gouache';
      score += 15;
      reasons.push(`medium watercolor → Watercolor/Gouache (+15)`);
    } else if (/oil on/.test(medium)) {
      bestSubCategory = 'Oil';
      score += 15;
      reasons.push(`medium oil → Oil (+15)`);
    } else {
      // Everything else in this dept defaults to Posters & Advertising
      // (GD dept has no furniture/ceramics/textiles)
      bestSubCategory = 'Posters & Advertising';
      score += 12;
      reasons.push(`GD dept fallback → Posters & Advertising (+12)`);
    }
  }

  if (imageUrl) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }

  const participants = (ch.participants ?? []) as any[];
  const artist = participants.find((p: any) => p?.person?.name)?.person?.name ?? '';
  if (artist) {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has artist (+${CONFIG.HAS_CREATOR_BONUS})`);
  }

  const date = str((data as any).date || ch.date);
  if (date) {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has date (+${CONFIG.HAS_DATE_BONUS})`);
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id: str(data.id),
      source: 'cooperhewitt' as SourceName,
      link: str((data as any).url) || `https://collection.cooperhewitt.org/objects/${str(ch.id)}/`,
      title: str((data as any).title) || 'Untitled',
      author: artist || 'Unknown',
      year: extractYear(date),
      imageUrl,
      department: 'Drawings, Prints, and Graphic Design',
      classification: str(ch.type) || 'Unknown',
      medium: str((data as any).medium || ch.medium) || 'Unknown',
      objectType: str(ch.type) || 'Unknown',
      mainCategory,
      subCategory: bestSubCategory || 'Uncategorized',
      confidenceScore: score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: SubCategory → MainCategory
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// DESIGN ARCHIVE (AIGA)
// Raw files are saved flat (same shape as the harvest record, no .data wrapper).
// Key fields: title, author, year, imageUrl, url, discipline, formats[], collections[]
// ─────────────────────────────────────────────────────────────────────────────

// discipline → subCategory
const DA_DISCIPLINE_MAP: Record<string, { subCategory: string; score: number }> = {
  'Advertising':                   { subCategory: 'Posters & Advertising',  score: 22 },
  'Poster':                        { subCategory: 'Posters & Advertising',  score: 25 },
  'Posters':                       { subCategory: 'Posters & Advertising',  score: 25 },
  'Environmental Design':          { subCategory: 'Identity & Branding',    score: 18 },
  'Identity / Branding':           { subCategory: 'Identity & Branding',    score: 25 },
  'Branding':                      { subCategory: 'Identity & Branding',    score: 25 },
  'Identity':                      { subCategory: 'Identity & Branding',    score: 25 },
  'Packaging':                     { subCategory: 'Packaging',              score: 25 },
  'Typography':                    { subCategory: 'Typography & Lettering', score: 25 },
  'Lettering':                     { subCategory: 'Typography & Lettering', score: 22 },
  'Editorial':                     { subCategory: 'Editorial/Publication',  score: 22 },
  'Book Design':                   { subCategory: 'Editorial/Publication',  score: 22 },
  'Publication':                   { subCategory: 'Editorial/Publication',  score: 22 },
  'Interactive':                   { subCategory: 'Posters & Advertising',  score: 14 },
  'Motion':                        { subCategory: 'Posters & Advertising',  score: 14 },
  'Illustration':                  { subCategory: 'Posters & Advertising',  score: 16 },
};

// format keywords → subCategory (applied when discipline doesn't match)
const DA_FORMAT_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'poster',       subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'advertisement',subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'brochure',     subCategory: 'Posters & Advertising',  score: 16 },
  { keyword: 'logo',         subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'identity',     subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'packaging',    subCategory: 'Packaging',              score: 22 },
  { keyword: 'label',        subCategory: 'Packaging',              score: 18 },
  { keyword: 'typeface',     subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'typography',   subCategory: 'Typography & Lettering', score: 20 },
  { keyword: 'lettering',    subCategory: 'Typography & Lettering', score: 18 },
  { keyword: 'book',         subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'magazine',     subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'annual report',subCategory: 'Editorial/Publication',  score: 18 },
];

function classifyDesignArchive(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const discipline  = str((data as any).discipline).trim();
  const formats     = ((data as any).formats ?? []) as string[];
  const title       = str((data as any).title).toLowerCase();
  const imageUrl    = str((data as any).imageUrl) || null;
  const author      = str((data as any).author);
  const year        = str((data as any).year);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  // 1. Discipline exact match
  const disciplineKey = Object.keys(DA_DISCIPLINE_MAP).find(
    k => k.toLowerCase() === discipline.toLowerCase()
  );
  if (disciplineKey) {
    const { subCategory, score: s } = DA_DISCIPLINE_MAP[disciplineKey];
    bestSubCategory = subCategory;
    score += s;
    reasons.push(`discipline "${discipline}" → ${subCategory} (+${s})`);
  }

  // 2. Discipline partial match (handles values like "Identity / Branding Programs")
  if (!bestSubCategory && discipline) {
    for (const [key, rule] of Object.entries(DA_DISCIPLINE_MAP)) {
      if (discipline.toLowerCase().includes(key.toLowerCase())) {
        bestSubCategory = rule.subCategory;
        score += rule.score - 3;
        reasons.push(`discipline partial "${discipline}" ~ "${key}" → ${rule.subCategory} (+${rule.score - 3})`);
        break;
      }
    }
  }

  // 3. Formats array scan
  if (!bestSubCategory && formats.length > 0) {
    for (const fmt of formats) {
      const fmtLower = fmt.toLowerCase();
      const hit = DA_FORMAT_MAP.find(r => fmtLower.includes(r.keyword));
      if (hit) {
        bestSubCategory = hit.subCategory;
        score += hit.score;
        reasons.push(`format "${fmt}" → ${hit.subCategory} (+${hit.score})`);
        break;
      }
    }
  }

  // 4. Title keyword fallback (weak signal)
  if (!bestSubCategory) {
    for (const r of DA_FORMAT_MAP) {
      if (title.includes(r.keyword)) {
        bestSubCategory = r.subCategory;
        score += Math.floor(r.score * 0.6);
        reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${Math.floor(r.score * 0.6)})`);
        break;
      }
    }
  }

  // 5. AIGA is a graphic design archive — if we still have nothing, default
  if (!bestSubCategory) {
    bestSubCategory = 'Posters & Advertising';
    score += 15;
    reasons.push(`AIGA archive default → Posters & Advertising (+15)`);
  }

  // Bonuses
  if (imageUrl) {
    score += CONFIG.HAS_IMAGE_BONUS;
    reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`);
  }
  if (author && author !== 'Unknown') {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`);
  }
  if (year && year !== 'n.d.') {
    score += CONFIG.HAS_DATE_BONUS;
    reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`);
  }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id:         str((data as any).id),
      source:     'designarchive' as SourceName,
      link:       str((data as any).url) || '',
      title:      str((data as any).title) || 'Untitled',
      author:     author || 'Unknown',
      year:       year || 'n.d.',
      imageUrl,
      department: 'Graphic Design',
      classification: discipline || 'Graphic Design',
      medium:     formats.join(', ') || 'Unknown',
      objectType: discipline || 'Graphic Design',
      mainCategory,
      subCategory:       bestSubCategory,
      confidenceScore:   score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
function mapSubToMain(subCategory: string | null): string {
  if (!subCategory) return 'Uncategorized';
  const mapping: Record<string, string> = {
    'Posters & Advertising':      'Graphic Design',
    'Typography & Lettering':     'Graphic Design',
    'Identity & Branding':        'Graphic Design',
    'Editorial/Publication':      'Graphic Design',
    'Packaging':                  'Graphic Design',
    'Oil':                        'Painting',
    'Watercolor/Gouache':         'Painting',
    'Tempera/Fresco':             'Painting',
    'Etching/Woodcut/Lithograph': 'Prints & Drawings',
    'Drawings':                   'Prints & Drawings',
    'Collage':                    'Prints & Drawings',
    'Photograph':                 'Photography',
    'Ceramics & Glass':           'Decorative Arts',
    'Furniture':                  'Decorative Arts',
    'Textiles & Fashion':         'Decorative Arts',
    'Metalwork & Jewelry':        'Decorative Arts',
  };
  return mapping[subCategory] || 'Uncategorized';
}
