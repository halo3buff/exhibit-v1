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
    case 'cooperhewitt':   return classifyCooperHewitt(raw as unknown as Record<string, unknown>, raw);
    case 'designarchive':  return classifyDesignArchive(raw as unknown as Record<string, unknown>, raw);
    case 'letterformarchive': return classifyLetterformArchive(raw as unknown as Record<string, unknown>, raw);
    case 'designreviewed':    return classifyDesignReviewed(raw as unknown as Record<string, unknown>, raw);
    case 'tdr':               return classifyArena(raw as unknown as Record<string, unknown>, raw);
    case 'europeana':         return classifyEuropeana(raw as unknown as Record<string, unknown>, raw);
    case 'nypl':              return classifyNypl(raw as unknown as Record<string, unknown>, raw);
    case 'gallica':           return classifyGallica(raw as unknown as Record<string, unknown>, raw);
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
    return String(images._primary_thumbnail).replace(/\/full\/![\d,]+\//, '/full/!1280,1280/');
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
// ─────────────────────────────────────────────────────────────────────────────
const CH_TYPE_MAP: Record<string, { subCategory: string; score: number }> = {
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
  'photograph':          { subCategory: 'Photograph', score: 25 },
  'photography':         { subCategory: 'Photograph', score: 25 },
  'daguerreotype':       { subCategory: 'Photograph', score: 25 },
  'tintype':             { subCategory: 'Photograph', score: 25 },
  'cyanotype':           { subCategory: 'Photograph', score: 25 },
  'painting':            { subCategory: 'Oil',                score: 22 },
  'watercolor':          { subCategory: 'Watercolor/Gouache', score: 22 },
  'watercolour':         { subCategory: 'Watercolor/Gouache', score: 22 },
};

function classifyCooperHewitt(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const ch     = ((data as any).raw ?? {}) as Record<string, any>;
  const type   = str(ch.type).toLowerCase();
  const medium = str((data as any).medium || ch.medium).toLowerCase();
  const title  = str((data as any).title).toLowerCase();
  const imageUrl = str((data as any).imageUrl) || null;

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  if (type && CH_TYPE_MAP[type]) {
    const { subCategory, score: typeScore } = CH_TYPE_MAP[type];
    bestSubCategory = subCategory;
    score += typeScore;
    reasons.push(`CH type "${ch.type}" → ${subCategory} (+${typeScore})`);
  }

  if (!bestSubCategory && type) {
    for (const [key, rule] of Object.entries(CH_TYPE_MAP)) {
      if (type.includes(key)) {
        bestSubCategory = rule.subCategory;
        score += rule.score - 3;
        reasons.push(`CH type "${ch.type}" ~ "${key}" → ${rule.subCategory} (+${rule.score - 3})`);
        break;
      }
    }
  }

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
// DESIGN ARCHIVE (AIGA)
// ─────────────────────────────────────────────────────────────────────────────
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

  const disciplineKey = Object.keys(DA_DISCIPLINE_MAP).find(
    k => k.toLowerCase() === discipline.toLowerCase()
  );
  if (disciplineKey) {
    const { subCategory, score: s } = DA_DISCIPLINE_MAP[disciplineKey];
    bestSubCategory = subCategory;
    score += s;
    reasons.push(`discipline "${discipline}" → ${subCategory} (+${s})`);
  }

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

  if (!bestSubCategory) {
    bestSubCategory = 'Posters & Advertising';
    score += 15;
    reasons.push(`AIGA archive default → Posters & Advertising (+15)`);
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (author && author !== 'Unknown') { score += CONFIG.HAS_CREATOR_BONUS; reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`); }
  if (year && year !== 'n.d.') { score += CONFIG.HAS_DATE_BONUS; reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

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
// LETTERFORM ARCHIVE CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const LFA_WORKTYPE_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'type specimen',   subCategory: 'Typography & Lettering', score: 28 },
  { keyword: 'type ephemera',   subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'typeface',        subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'lettering',       subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'calligraphy',     subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'manuscript',      subCategory: 'Typography & Lettering', score: 20 },
  { keyword: 'book cover',      subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'book',            subCategory: 'Editorial/Publication',  score: 18 },
  { keyword: 'periodical',      subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'newspaper',       subCategory: 'Editorial/Publication',  score: 18 },
  { keyword: 'magazine',        subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'journal',         subCategory: 'Editorial/Publication',  score: 18 },
  { keyword: 'poster',          subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'advertisement',   subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'postcard',        subCategory: 'Posters & Advertising',  score: 18 },
  { keyword: 'brochure',        subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'broadside',       subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'flyer',           subCategory: 'Posters & Advertising',  score: 18 },
  { keyword: 'logo',            subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'identity',        subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'signage',         subCategory: 'Identity & Branding',    score: 20 },
  { keyword: 'label',           subCategory: 'Packaging',              score: 20 },
  { keyword: 'packaging',       subCategory: 'Packaging',              score: 22 },
  { keyword: 'photograph',      subCategory: 'Photograph',             score: 20 },
  { keyword: 'drawing',         subCategory: 'Drawings',               score: 16 },
  { keyword: 'print',           subCategory: 'Etching/Woodcut/Lithograph', score: 16 },
];

const LFA_DISCIPLINE_BONUS: Record<string, { subCategory: string; bonus: number }> = {
  'lettering':      { subCategory: 'Typography & Lettering', bonus: 8 },
  'typography':     { subCategory: 'Typography & Lettering', bonus: 8 },
  'calligraphy':    { subCategory: 'Typography & Lettering', bonus: 8 },
  'graphic design': { subCategory: 'Posters & Advertising',  bonus: 5 },
  'cover design':   { subCategory: 'Editorial/Publication',  bonus: 8 },
  'poster design':  { subCategory: 'Posters & Advertising',  bonus: 8 },
  'book design':    { subCategory: 'Editorial/Publication',  bonus: 8 },
};

function classifyLetterformArchive(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const title     = str((data as any).title).toLowerCase();
  const imageUrl  = str((data as any).imageUrl) || null;
  const author    = str((data as any).author).replace(/\s*;\s*/g, ', ').trim();
  const rawYear   = str((data as any).year);
  const year      = rawYear === '-' ? '' : rawYear;
  const worktypes = ((data as any).worktypes ?? []) as string[];
  const subjects  = ((data as any).subjects  ?? []) as string[];
  const countries = ((data as any).countries ?? []) as string[];

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const wt of worktypes) {
    const wtLower = wt.toLowerCase();
    const hit = LFA_WORKTYPE_MAP.find(r => wtLower.includes(r.keyword));
    if (hit && !bestSubCategory) {
      bestSubCategory = hit.subCategory;
      score += hit.score;
      reasons.push(`worktype "${wt}" → ${hit.subCategory} (+${hit.score})`);
    }
  }

  for (const subj of subjects) {
    const lower = subj.toLowerCase();
    if (!lower.startsWith('discipline:')) continue;
    const disc = lower.replace('discipline:', '').trim();
    const hit = LFA_DISCIPLINE_BONUS[disc];
    if (hit) {
      if (!bestSubCategory) bestSubCategory = hit.subCategory;
      score += hit.bonus;
      reasons.push(`discipline subject "${disc}" (+${hit.bonus})`);
    }
  }

  if (!bestSubCategory) {
    for (const r of LFA_WORKTYPE_MAP) {
      if (title.includes(r.keyword)) {
        bestSubCategory = r.subCategory;
        score += Math.floor(r.score * 0.6);
        reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${Math.floor(r.score * 0.6)})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    bestSubCategory = 'Typography & Lettering';
    score += 18;
    reasons.push('LFA archive default → Typography & Lettering (+18)');
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (author && author !== 'Unknown' && author !== '-') {
    score += CONFIG.HAS_CREATOR_BONUS;
    reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`);
  }
  if (year) { score += CONFIG.HAS_DATE_BONUS; reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  const origin = countries.filter(c => c !== '-').join(', ') || undefined;

  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'letterformarchive' as SourceName,
      link:           str((data as any).url) || '',
      title:          str((data as any).title) || 'Untitled',
      author:         (author && author !== '-') ? author : 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     'Typography & Graphic Design',
      classification: worktypes.join(', ') || 'Unknown',
      medium:         worktypes.join(', ') || 'Unknown',
      objectType:     worktypes[0] || 'Unknown',
      origin,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN REVIEWED CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const DR_FORMAT_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'graphis',              subCategory: 'Editorial/Publication',  score: 28 },
  { keyword: 'idea',                 subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'typographica',         subCategory: 'Editorial/Publication',  score: 28 },
  { keyword: 'typografia',           subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'gebrauchsgraphik',     subCategory: 'Editorial/Publication',  score: 28 },
  { keyword: 'architectural design', subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'neue grafik',          subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'projekt',              subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'rassegna',             subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'magazine',             subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'periodical',           subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'annual report',        subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'catalogue',            subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'catalog',              subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'journal',              subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'brochure',             subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'book',                 subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'type specimen',        subCategory: 'Typography & Lettering', score: 28 },
  { keyword: 'type-specimen',        subCategory: 'Typography & Lettering', score: 28 },
  { keyword: 'typeface',             subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'typography',           subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'lettering',            subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'font',                 subCategory: 'Typography & Lettering', score: 20 },
  { keyword: 'poster',               subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'record',               subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'album',                subCategory: 'Posters & Advertising',  score: 18 },
  { keyword: 'stamp',                subCategory: 'Posters & Advertising',  score: 18 },
  { keyword: 'matchbox',             subCategory: 'Packaging',              score: 22 },
  { keyword: 'label',                subCategory: 'Packaging',              score: 20 },
  { keyword: 'packaging',            subCategory: 'Packaging',              score: 22 },
  { keyword: 'identity',             subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'logo',                 subCategory: 'Identity & Branding',    score: 22 },
];

function extractYearFromTitle(title: string): string {
  const m = title.match(/\b(1[89]\d{2}|20[0-2]\d)\b/g);
  if (!m) return '';
  return m[m.length - 1];
}

function looksLikePersonName(s: string): boolean {
  const words = s.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (/\d/.test(s)) return false;
  return words.every(w => /^[A-ZÁÉÍÓÚÀÈÌÒÙÄÖÜÑ]/.test(w));
}

function classifyDesignReviewed(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const rawTitle = str((data as any).title);
  const title    = rawTitle
    .replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#[0-9]+;/g, ' ')
    .toLowerCase().trim();
  const slug     = str((data as any).slug).toLowerCase();
  const imageUrl = str((data as any).imageUrl) || null;
  const tags     = ((data as any).formats ?? []) as string[];

  const authorTag = tags.find(looksLikePersonName) ?? '';
  const year = extractYearFromTitle(rawTitle);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const r of DR_FORMAT_MAP) {
    if (title.includes(r.keyword)) {
      bestSubCategory = r.subCategory;
      score += r.score;
      reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${r.score})`);
      break;
    }
  }

  if (!bestSubCategory) {
    for (const r of DR_FORMAT_MAP) {
      const slugKw = r.keyword.replace(/\s+/g, '-');
      if (slug.includes(slugKw)) {
        bestSubCategory = r.subCategory;
        score += r.score - 2;
        reasons.push(`slug keyword "${slugKw}" → ${r.subCategory} (+${r.score - 2})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    bestSubCategory = 'Editorial/Publication';
    score += 18;
    reasons.push('Design Reviewed archive default → Editorial/Publication (+18)');
  }

  if (imageUrl)  { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (authorTag) { score += CONFIG.HAS_CREATOR_BONUS; reasons.push(`Has author tag (+${CONFIG.HAS_CREATOR_BONUS})`); }
  if (year)      { score += CONFIG.HAS_DATE_BONUS;    reasons.push(`Year in title (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);

  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'designreviewed' as SourceName,
      link:           str((data as any).url) || '',
      title:          rawTitle
                        .replace(/&amp;/g, '&').replace(/&#8211;/g, '–')
                        .replace(/&#[0-9]+;/g, ' ').trim() || 'Untitled',
      author:         authorTag || 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     'Graphic Design',
      classification: bestSubCategory,
      medium:         'Printed Matter',
      objectType:     bestSubCategory,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARE.NA / TDR CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const ARENA_CHANNEL_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'designers republic',  subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'swiss',               subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'bauhaus',             subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'constructiv',         subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'poster',              subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'psychedelic',         subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'album',               subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'warp',                subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'brutalist',           subCategory: 'Posters & Advertising',  score: 20 },
  { keyword: 'graphic design',      subCategory: 'Posters & Advertising',  score: 18 },
  { keyword: 'type',                subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'typograph',           subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'lettering',           subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'font',                subCategory: 'Typography & Lettering', score: 20 },
  { keyword: 'book',                subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'editorial',           subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'magazine',            subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'packaging',           subCategory: 'Packaging',              score: 22 },
  { keyword: 'identity',            subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'branding',            subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'corporate',           subCategory: 'Identity & Branding',    score: 20 },
];

function classifyArena(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const title       = str((data as any).title).toLowerCase().trim();
  const channelDesc = str((data as any).channelDesc).toLowerCase();
  const tags        = ((data as any).tags ?? []) as string[];
  const imageUrl    = str((data as any).imageUrl) || null;
  const year        = str((data as any).year);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const r of ARENA_CHANNEL_MAP) {
    if (channelDesc.includes(r.keyword)) {
      bestSubCategory = r.subCategory;
      score += r.score;
      reasons.push(`channel "${channelDesc}" → ${r.subCategory} (+${r.score})`);
      break;
    }
  }

  if (!bestSubCategory) {
    for (const r of ARENA_CHANNEL_MAP) {
      if (title.includes(r.keyword)) {
        bestSubCategory = r.subCategory;
        score += r.score - 2;
        reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${r.score - 2})`);
        break;
      }
    }
  }

  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    for (const r of ARENA_CHANNEL_MAP) {
      if (tagLower.includes(r.keyword)) {
        if (!bestSubCategory) bestSubCategory = r.subCategory;
        score += Math.floor(r.score * 0.4);
        reasons.push(`tag "${tag}" (+${Math.floor(r.score * 0.4)})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    bestSubCategory = 'Posters & Advertising';
    score += 18;
    reasons.push('Are.na graphic design channel default → Posters & Advertising (+18)');
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (year)     { score += CONFIG.HAS_DATE_BONUS;    reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'tdr' as SourceName,
      link:           str((data as any).url) || '',
      title:          str((data as any).title) || 'Untitled',
      author:         str((data as any).author) || 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     'Graphic Design',
      classification: bestSubCategory,
      medium:         'Digital Image',
      objectType:     bestSubCategory,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EUROPEANA CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const EUROPEANA_TYPE_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'poster',          subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'affiche',         subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'plakat',          subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'advertisement',   subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'broadside',       subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'trade card',      subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'type specimen',   subCategory: 'Typography & Lettering', score: 28 },
  { keyword: 'typography',      subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'lettering',       subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'typeface',        subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'logo',            subCategory: 'Identity & Branding',    score: 25 },
  { keyword: 'trademark',       subCategory: 'Identity & Branding',    score: 25 },
  { keyword: 'identity',        subCategory: 'Identity & Branding',    score: 22 },
  { keyword: 'book cover',      subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'magazine',        subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'periodical',      subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'packaging',       subCategory: 'Packaging',              score: 25 },
  { keyword: 'label',           subCategory: 'Packaging',              score: 22 },
  { keyword: 'lithograph',      subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'etching',         subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'woodcut',         subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'engraving',       subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'print',           subCategory: 'Etching/Woodcut/Lithograph', score: 20 },
  { keyword: 'drawing',         subCategory: 'Drawings',               score: 22 },
  { keyword: 'photograph',      subCategory: 'Photograph',             score: 25 },
  { keyword: 'photography',     subCategory: 'Photograph',             score: 25 },
  { keyword: 'painting',        subCategory: 'Oil',                    score: 22 },
  { keyword: 'watercolor',      subCategory: 'Watercolor/Gouache',     score: 22 },
  { keyword: 'watercolour',     subCategory: 'Watercolor/Gouache',     score: 22 },
  { keyword: 'ceramic',         subCategory: 'Ceramics & Glass',       score: 22 },
  { keyword: 'textile',         subCategory: 'Textiles & Fashion',     score: 22 },
  { keyword: 'furniture',       subCategory: 'Furniture',              score: 22 },
];

function classifyEuropeana(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const title     = str((data as any).title).toLowerCase();
  const dcType    = ((data as any).dcType ?? []) as string[];
  const dcSubject = ((data as any).dcSubject ?? []) as string[];
  const imageUrl  = str((data as any).imageUrl) || null;
  const author    = str((data as any).author);
  const year      = str((data as any).year);
  const country   = str((data as any).country);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const t of dcType) {
    const tLower = t.toLowerCase();
    const hit = EUROPEANA_TYPE_MAP.find(r => tLower.includes(r.keyword));
    if (hit && !bestSubCategory) {
      bestSubCategory = hit.subCategory;
      score += hit.score;
      reasons.push(`dcType "${t}" → ${hit.subCategory} (+${hit.score})`);
    }
  }

  if (!bestSubCategory) {
    for (const s of dcSubject) {
      const sLower = s.toLowerCase();
      const hit = EUROPEANA_TYPE_MAP.find(r => sLower.includes(r.keyword));
      if (hit) {
        bestSubCategory = hit.subCategory;
        score += hit.score - 3;
        reasons.push(`dcSubject "${s}" → ${hit.subCategory} (+${hit.score - 3})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    for (const r of EUROPEANA_TYPE_MAP) {
      if (title.includes(r.keyword)) {
        bestSubCategory = r.subCategory;
        score += r.score - 5;
        reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${r.score - 5})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    bestSubCategory = 'Posters & Advertising';
    score += 15;
    reasons.push('Europeana IMAGE default → Posters & Advertising (+15)');
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (author)   { score += CONFIG.HAS_CREATOR_BONUS; reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`); }
  if (year)     { score += CONFIG.HAS_DATE_BONUS;    reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'europeana' as SourceName,
      link:           str((data as any).url) || '',
      title:          str((data as any).title) || 'Untitled',
      author:         author || 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     str((data as any).provider) || 'Europeana',
      classification: dcType[0] || bestSubCategory,
      medium:         dcType[0] || 'Unknown',
      objectType:     dcType[0] || bestSubCategory,
      origin:         country || undefined,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NYPL CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const NYPL_TITLE_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'poster',          subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'broadside',       subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'advertisement',   subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'trade card',      subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'menu',            subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'type specimen',   subCategory: 'Typography & Lettering', score: 28 },
  { keyword: 'typeface',        subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'book cover',      subCategory: 'Editorial/Publication',  score: 25 },
  { keyword: 'magazine',        subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'catalog',         subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'catalogue',       subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'packaging',       subCategory: 'Packaging',              score: 25 },
  { keyword: 'label',           subCategory: 'Packaging',              score: 22 },
  { keyword: 'lithograph',      subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'etching',         subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'engraving',       subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keyword: 'woodcut',         subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keyword: 'photograph',      subCategory: 'Photograph',             score: 22 },
  { keyword: 'portrait',        subCategory: 'Photograph',             score: 18 },
  { keyword: 'drawing',         subCategory: 'Drawings',               score: 20 },
  { keyword: 'map',             subCategory: 'Drawings',               score: 18 },
  { keyword: 'ephemera',        subCategory: 'Posters & Advertising',  score: 18 },
];

function classifyNypl(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const title          = str((data as any).title).toLowerCase();
  const typeOfResource = str((data as any).typeOfResource).toLowerCase();
  const imageUrl       = str((data as any).imageUrl) || null;
  const author         = str((data as any).author);
  const year           = str((data as any).year);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const r of NYPL_TITLE_MAP) {
    if (title.includes(r.keyword)) {
      bestSubCategory = r.subCategory;
      score += r.score;
      reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${r.score})`);
      break;
    }
  }

  if (!bestSubCategory) {
    if (typeOfResource.includes('still image')) {
      bestSubCategory = 'Posters & Advertising';
      score += 18;
      reasons.push('typeOfResource "still image" → Posters & Advertising (+18)');
    } else if (typeOfResource.includes('text')) {
      bestSubCategory = 'Editorial/Publication';
      score += 15;
      reasons.push('typeOfResource "text" → Editorial/Publication (+15)');
    } else {
      bestSubCategory = 'Posters & Advertising';
      score += 12;
      reasons.push('NYPL default → Posters & Advertising (+12)');
    }
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (author)   { score += CONFIG.HAS_CREATOR_BONUS; reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`); }
  if (year)     { score += CONFIG.HAS_DATE_BONUS;    reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'nypl' as SourceName,
      link:           str((data as any).url) || '',
      title:          str((data as any).title) || 'Untitled',
      author:         author || 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     'New York Public Library',
      classification: typeOfResource || bestSubCategory,
      medium:         typeOfResource || 'Unknown',
      objectType:     bestSubCategory,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLICA CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────
const GALLICA_SUBJECT_MAP: Array<{ keyword: string; subCategory: string; score: number }> = [
  { keyword: 'affiche',         subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'poster',          subCategory: 'Posters & Advertising',  score: 28 },
  { keyword: 'publicité',       subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'réclame',         subCategory: 'Posters & Advertising',  score: 25 },
  { keyword: 'lithograph',      subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'lithographie',    subCategory: 'Etching/Woodcut/Lithograph', score: 25 },
  { keyword: 'gravure',         subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keyword: 'estampe',         subCategory: 'Etching/Woodcut/Lithograph', score: 22 },
  { keyword: 'typographie',     subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'typography',      subCategory: 'Typography & Lettering', score: 25 },
  { keyword: 'caractère',       subCategory: 'Typography & Lettering', score: 22 },
  { keyword: 'illustration',    subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'magazine',        subCategory: 'Editorial/Publication',  score: 22 },
  { keyword: 'revue',           subCategory: 'Editorial/Publication',  score: 20 },
  { keyword: 'photographie',    subCategory: 'Photograph',             score: 22 },
  { keyword: 'photograph',      subCategory: 'Photograph',             score: 22 },
  { keyword: 'dessin',          subCategory: 'Drawings',               score: 20 },
  { keyword: 'drawing',         subCategory: 'Drawings',               score: 20 },
  { keyword: 'peinture',        subCategory: 'Oil',                    score: 20 },
  { keyword: 'painting',        subCategory: 'Oil',                    score: 20 },
  { keyword: 'aquarelle',       subCategory: 'Watercolor/Gouache',     score: 22 },
  { keyword: 'art nouveau',     subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'art déco',        subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'graphisme',       subCategory: 'Posters & Advertising',  score: 22 },
  { keyword: 'packaging',       subCategory: 'Packaging',              score: 22 },
  { keyword: 'étiquette',       subCategory: 'Packaging',              score: 20 },
];

function classifyGallica(data: Record<string, unknown>, raw: RawItem): ClassificationResult {
  const title    = str((data as any).title).toLowerCase();
  const type     = str((data as any).type).toLowerCase();
  const subjects = ((data as any).subject ?? []) as string[];
  const imageUrl = str((data as any).imageUrl) || null;
  const author   = str((data as any).author);
  const year     = str((data as any).year);

  let score = 0;
  const reasons: string[] = [];
  let bestSubCategory: string | null = null;

  for (const subj of subjects) {
    const sLower = subj.toLowerCase();
    const hit = GALLICA_SUBJECT_MAP.find(r => sLower.includes(r.keyword));
    if (hit && !bestSubCategory) {
      bestSubCategory = hit.subCategory;
      score += hit.score;
      reasons.push(`subject "${subj}" → ${hit.subCategory} (+${hit.score})`);
      break;
    }
  }

  if (!bestSubCategory) {
    for (const r of GALLICA_SUBJECT_MAP) {
      if (title.includes(r.keyword)) {
        bestSubCategory = r.subCategory;
        score += r.score - 4;
        reasons.push(`title keyword "${r.keyword}" → ${r.subCategory} (+${r.score - 4})`);
        break;
      }
    }
  }

  if (!bestSubCategory) {
    if (type.includes('estampe') || type.includes('image')) {
      bestSubCategory = 'Posters & Advertising';
      score += 15;
      reasons.push(`type "${type}" → Posters & Advertising (+15)`);
    } else if (type.includes('monographie') || type.includes('fascicule')) {
      bestSubCategory = 'Editorial/Publication';
      score += 15;
      reasons.push(`type "${type}" → Editorial/Publication (+15)`);
    } else {
      bestSubCategory = 'Posters & Advertising';
      score += 12;
      reasons.push('Gallica default → Posters & Advertising (+12)');
    }
  }

  if (imageUrl) { score += CONFIG.HAS_IMAGE_BONUS;   reasons.push(`Has image (+${CONFIG.HAS_IMAGE_BONUS})`); }
  if (author)   { score += CONFIG.HAS_CREATOR_BONUS; reasons.push(`Has author (+${CONFIG.HAS_CREATOR_BONUS})`); }
  if (year)     { score += CONFIG.HAS_DATE_BONUS;    reasons.push(`Has year (+${CONFIG.HAS_DATE_BONUS})`); }

  if (score < CONFIG.THRESHOLD) {
    return { accepted: false, score, reasons: [...reasons, `Below threshold (${CONFIG.THRESHOLD})`] };
  }

  const mainCategory = mapSubToMain(bestSubCategory);
  return {
    accepted: true, score, reasons,
    item: {
      id:             str((data as any).id),
      source:         'gallica' as SourceName,
      link:           str((data as any).url) || '',
      title:          str((data as any).title) || 'Untitled',
      author:         author || 'Unknown',
      year:           year || 'n.d.',
      imageUrl,
      department:     'Bibliothèque nationale de France',
      classification: subjects[0] || bestSubCategory,
      medium:         type || 'Unknown',
      objectType:     bestSubCategory,
      mainCategory,
      subCategory:           bestSubCategory,
      confidenceScore:       score,
      classificationReasons: reasons,
    } as ArchiveItem,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: SubCategory → MainCategory
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