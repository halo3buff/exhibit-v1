import { fetchMet as searchMet } from "@/lib/archives/met";
import { fetchArtic as searchArtic } from "@/lib/archives/artic";
import { fetchVA as searchVA } from "@/lib/archives/va";
import { fetchHarvard as searchHarvard } from "@/lib/archives/harvard";
import { fetchLOC as searchLoc } from "@/lib/archives/loc";
import { fetchNYPL as searchNypl } from "@/lib/archives/nypl";
import { fetchRijks as searchRijks } from "@/lib/archives/rijks";
import { fetchWikimedia as searchWikimedia } from "@/lib/archives/wikimedia";
import { batchValidate } from "@/lib/ai-validator";
import { categorizeItem, matchesCategories } from "@/lib/utils/categorize";

import fs from 'fs';
import path from 'path';

const cache = new Map();

// Detect content type from query
function detectContentType(query) {
  const lowerQuery = query.toLowerCase();
  
  // Order matters - check most specific first
  if (lowerQuery.includes('typography') || lowerQuery.includes('typeface') || lowerQuery.includes('font')) return 'typography';
  if (lowerQuery.includes('sketch') || lowerQuery.includes('drawing')) return 'drawing';
  if (lowerQuery.includes('photo')) return 'photograph';
  if (lowerQuery.includes('poster')) return 'poster';
  if (lowerQuery.includes('print') && !lowerQuery.includes('photo')) return 'print';
  if (lowerQuery.includes('furniture') || lowerQuery.includes('chair')) return 'furniture';
  if (lowerQuery.includes('textile') || lowerQuery.includes('fabric')) return 'textile';
  if (lowerQuery.includes('architect')) return 'architecture';
  if (lowerQuery.includes('book') || lowerQuery.includes('manuscript')) return 'manuscript';
  
  return null; // Use default mappings
}

function searchLocalManifests(query) {
  const manifestDir = path.join(process.cwd(), 'public/manifests');
  const files = ['moma.json', 'letterform.json', 'swiss.json', 'bauhaus.json', 'jstor.json'];
  let localResults = [];

  const keywords = query.toLowerCase().split(/[\s&]+/).filter(word => word.length > 2);

  files.forEach(file => {
    const filePath = path.join(manifestDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const filtered = data.filter(item => {
          const searchContent = `${item.title} ${item.author} ${item.source}`.toLowerCase();
          return keywords.some(key => searchContent.includes(key)) || 
                 item.source.toLowerCase().includes(query.toLowerCase());
        });
        
        console.log(`[MANIFEST ${file}] Found ${filtered.length} items`);
        localResults.push(...filtered);
      } catch (e) {
        console.error(`[SEARCH] Error reading ${file}:`, e);
      }
    }
  });
  
  return localResults.sort((a, b) => {
    const aText = `${a.title} ${a.author}`.toLowerCase();
    const bText = `${b.title} ${b.author}`.toLowerCase();
    const aCount = keywords.filter(k => aText.includes(k)).length;
    const bCount = keywords.filter(k => bText.includes(k)).length;
    return bCount - aCount;
  });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic") || "Design";
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    // Detect content type from query
    const contentType = detectContentType(topic);
    
    const filters = {
      type: searchParams.get("type"),
      medium: searchParams.get("medium"),
      movement: searchParams.get("movement"),
      era: searchParams.get("era")
    };

    console.log(`\n[SEARCH] Query: "${topic}"`);
    if (contentType) console.log(`[CONTENT TYPE] Detected: ${contentType}`);
    if (Object.values(filters).some(v => v)) console.log(`[FILTERS]`, filters);

    const cacheKey = `${topic}-${contentType}-${JSON.stringify(filters)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] HIT - Returning ${cached.length} items`);
      return new Response(JSON.stringify(cached), { 
        status: 200,
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" } 
      });
    }

    const localItems = searchLocalManifests(topic);
    console.log(`[MANIFESTS] Total: ${localItems.length} items`);

    // Pass contentType to each source
    console.log(`[APIs] Querying 8 sources with content-specific locations...`);
    const results = await Promise.allSettled([
      searchMet ? searchMet(topic, contentType) : Promise.resolve([]),
      searchArtic ? searchArtic(topic, contentType) : Promise.resolve([]),
      searchVA ? searchVA(topic, contentType) : Promise.resolve([]),
      searchHarvard ? searchHarvard(topic) : Promise.resolve([]),
      searchLoc ? searchLoc(topic, contentType) : Promise.resolve([]),
      searchNypl ? searchNypl(topic, contentType) : Promise.resolve([]),
      searchRijks ? searchRijks(topic) : Promise.resolve([]),
      searchWikimedia ? searchWikimedia(topic) : Promise.resolve([])
    ]);

    const liveItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);
    
    console.log(`[APIs] Total: ${liveItems.length} items`);

    const raw = [...localItems, ...liveItems];
    console.log(`[MERGE] Before dedup: ${raw.length} items`);
    
    const unique = [];
    const seen = new Set();
    
    for (const item of raw) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    
    console.log(`[DEDUP] After dedup: ${unique.length} unique items`);

    const withImages = unique.filter(item => item.imageUrl);
    console.log(`[FILTER] With images: ${withImages.length} items`);

    console.log(`[CATEGORIZE] Analyzing items...`);
    const categorized = withImages.map(item => ({
      ...item,
      categories: categorizeItem(item)
    }));

    const filtered = categorized.filter(item => matchesCategories(item, filters));
    console.log(`[CATEGORY FILTER] After filtering: ${filtered.length} items`);

    let final = filtered.slice(0, 400);
    
    if (apiKey && filtered.length > 0) {
      console.log(`[AI] Validating top 15 results`);
      const topTier = filtered.slice(0, 15);
      const validatedTopTier = await batchValidate(topTier, topic, apiKey, 15);
      final = [...validatedTopTier, ...filtered.slice(15, 400)];
    }

    console.log(`[FINAL] Returning ${final.length} items\n`);

    cache.set(cacheKey, final);

    return new Response(JSON.stringify(final), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  } catch (error) {
    console.error("[SEARCH] CRITICAL ERROR:", error);
    return new Response(JSON.stringify([]), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}