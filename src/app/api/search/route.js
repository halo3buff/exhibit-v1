import { fetchMet as searchMet } from "@/lib/archives/met";
import { fetchArtic as searchArtic } from "@/lib/archives/artic";
import { fetchVA as searchVA } from "@/lib/archives/va";
import { fetchHarvard as searchHarvard } from "@/lib/archives/harvard";
import { fetchLOC as searchLoc } from "@/lib/archives/loc";
import { fetchNYPL as searchNypl } from "@/lib/archives/nypl";
import { fetchRijks as searchRijks } from "@/lib/archives/rijks";
import { fetchWikimedia as searchWikimedia } from "@/lib/archives/wikimedia";
import { batchValidate } from "@/lib/ai-validator";

import fs from 'fs';
import path from 'path';

const cache = new Map();

/**
 * Helper to search local manifests with "Smart Matching" logic.
 * Splits the query into keywords to ensure items match even if titles are specific.
 */
function searchLocalManifests(query) {
  const manifestDir = path.join(process.cwd(), 'src/data/manifests');
  const files = ['moma.json', 'letterform.json', 'swiss.json', 'bauhaus.json', 'jstor.json'];
  let localResults = [];

  // Normalize query and split into keywords (e.g., "MoMA Design" -> ["moma", "design"])
  const keywords = query.toLowerCase().split(/[\s&]+/).filter(word => word.length > 2);

  files.forEach(file => {
    const filePath = path.join(manifestDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const filtered = data.filter(item => {
          const searchContent = `${item.title} ${item.author} ${item.source}`.toLowerCase();
          
          // Match if ANY of the user's keywords are found in the metadata
          // OR if the source itself matches the query (e.g., searching "Bauhaus")
          return keywords.some(key => searchContent.includes(key)) || 
                 item.source.toLowerCase().includes(query.toLowerCase());
        });
        
        localResults.push(...filtered);
      } catch (e) {
        console.error(`[SEARCH] Error reading ${file}:`, e);
      }
    }
  });
  
  // Sort results so that items containing more of the keywords appear first
  return localResults.sort((a, b) => {
    const aText = `${a.title} ${a.author}`.toLowerCase();
    const bText = `${b.text} ${b.author}`.toLowerCase();
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

    // 1. Check Cache
    const cached = cache.get(topic.toLowerCase());
    if (cached) return new Response(JSON.stringify(cached), { 
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" } 
    });

    // 2. Search Local "Holy Grail" Manifests
    const localItems = searchLocalManifests(topic);

    // 3. Global Live Search (Standardized naming with safety fallbacks)
    const results = await Promise.allSettled([
      searchMet ? searchMet(topic) : Promise.resolve([]),
      searchArtic ? searchArtic(topic) : Promise.resolve([]),
      searchVA ? searchVA(topic) : Promise.resolve([]),
      searchHarvard ? searchHarvard(topic) : Promise.resolve([]),
      searchLoc ? searchLoc(topic) : Promise.resolve([]),
      searchNypl ? searchNypl(topic) : Promise.resolve([]),
      searchRijks ? searchRijks(topic) : Promise.resolve([]),
      searchWikimedia ? searchWikimedia(topic) : Promise.resolve([])
    ]);

    const liveItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);

    // 4. Merge & Deduplicate
    const raw = [...localItems, ...liveItems];
    const unique = [];
    const seen = new Set();
    
    for (const item of raw) {
      if (item?.imageUrl && !seen.has(item.imageUrl)) {
        seen.add(item.imageUrl);
        unique.push(item);
      }
    }

    // --- AI VALIDATION STEP ---
    // We only validate the top tier to keep response times under 5 seconds.
    let final = unique.slice(0, 400);
    
    if (apiKey && unique.length > 0) {
        console.log(`[SEARCH] Validating top 15 results for "${topic}"`);
        const topTier = unique.slice(0, 15);
        const validatedTopTier = await batchValidate(topTier, topic, apiKey, 15);
        // Combine validated items with the rest of the unvalidated results
        final = [...validatedTopTier, ...unique.slice(15, 400)];
    }

    // 5. Cache and Return
    cache.set(topic.toLowerCase(), final);

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