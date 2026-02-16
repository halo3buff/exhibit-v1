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

function searchLocalManifests(query, contentType = null) {
  const manifestDir = path.join(process.cwd(), 'public/manifests');
  const files = ['moma.json', 'letterform.json', 'swiss.json', 'bauhaus.json', 'jstor.json'];
  let localResults = [];

  files.forEach(file => {
    const filePath = path.join(manifestDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // If contentType is specified, ONLY return items that match by classification/medium/objectType
        // Do NOT do keyword matching on titles
        const filtered = data.filter(item => {
          if (!item.imageUrl) return false;
          
          // If we have a contentType filter, check the item's metadata fields
          if (contentType) {
            const classificationText = [
              item.classification || '',
              item.objectType || '',
              item.medium || ''
            ].join(' ').toLowerCase();
            
            // Check if item's native classification matches the requested type
            const typeMatches = {
              photograph: ['photograph', 'photo', 'gelatin silver'],
              drawing: ['drawing', 'sketch', 'graphite', 'charcoal', 'pencil'],
              print: ['lithograph', 'etching', 'engraving', 'woodcut', 'screenprint'],
              poster: ['poster', 'affiche', 'placard'],
              painting: ['painting', 'oil', 'acrylic', 'watercolor', 'canvas'],
              furniture: ['furniture', 'chair', 'table', 'desk', 'sessel'],
              textile: ['textile', 'fabric', 'weave'],
              typography: ['typography', 'typeface', 'font', 'specimen'],
              architecture: ['architecture', 'building', 'architectural'],
              sculpture: ['sculpture', 'bronze', 'marble', 'ceramic']
            };
            
            const keywords = typeMatches[contentType] || [];
            const matchesType = keywords.some(keyword => classificationText.includes(keyword));
            
            if (!matchesType) return false;
          }
          
          return true;
        });
        
        console.log(`[MANIFEST ${file}] Found ${filtered.length} items${contentType ? ` (type: ${contentType})` : ''}`);
        localResults.push(...filtered);
      } catch (e) {
        console.error(`[SEARCH] Error reading ${file}:`, e);
      }
    }
  });
  
  return localResults;
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

    const localItems = searchLocalManifests(topic, contentType || filters.type);
    console.log(`[MANIFESTS] Total: ${localItems.length} items`);

    // Pass contentType to each source
    console.log(`[APIs] Querying 8 sources with content-specific locations...`);
    const results = await Promise.allSettled([
      searchMet ? searchMet(topic, contentType) : Promise.resolve([]),
      searchArtic ? searchArtic(topic, contentType) : Promise.resolve([]),
      searchVA ? searchVA(topic, contentType) : Promise.resolve([]),
      searchHarvard ? searchHarvard(topic, contentType) : Promise.resolve([]),
      searchLoc ? searchLoc(topic, contentType) : Promise.resolve([]),
      searchNypl ? searchNypl(topic, contentType) : Promise.resolve([]),
      searchRijks ? searchRijks(topic, contentType) : Promise.resolve([]),
      searchWikimedia ? searchWikimedia(topic, contentType) : Promise.resolve([])
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
      categories: categorizeItem(item, contentType || filters.type)
    }));

    const filtered = categorized.filter(item => matchesCategories(item, filters));
    console.log(`[CATEGORY FILTER] After filtering: ${filtered.length} items`);

    let final = filtered.slice(0, 1000);
    
    if (apiKey && filtered.length > 0) {
      console.log(`[AI] Validating top 15 results`);
      const topTier = filtered.slice(0, 15);
      const validatedTopTier = await batchValidate(topTier, topic, apiKey, 15);
      final = [...validatedTopTier, ...filtered.slice(15, 1000)];
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