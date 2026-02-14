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

function searchLocalManifests(query, filters) {
  const manifestDir = path.join(process.cwd(), 'public', 'manifests');
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
          const matchesText = keywords.length > 0 ? keywords.some(key => searchContent.includes(key)) : true;
          const itemCategories = categorizeItem(item);
          const matchesMetadata = matchesCategories({ ...item, categories: itemCategories }, filters);
          
          const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== "");
          return hasActiveFilters ? matchesMetadata : matchesText;
        });
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
    // Logic: Use specific topic if provided, else use the first available filter value as the search term
    const topic = searchParams.get("topic") || searchParams.get("movement") || searchParams.get("type") || "Design";
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const filters = {
      type: searchParams.get("type"),
      movement: searchParams.get("movement"),
      era: searchParams.get("era")
    };

    const cacheKey = `${topic.toLowerCase()}-${JSON.stringify(filters)}`;
    if (cache.has(cacheKey)) return new Response(JSON.stringify(cache.get(cacheKey)), { status: 200 });

    const localItems = searchLocalManifests(topic, filters);
    
    // RESTORED: Full external API calls
    const results = await Promise.allSettled([
      searchMet(topic),
      searchArtic(topic),
      searchVA(topic),
      searchHarvard(topic),
      searchLoc(topic),
      searchNypl(topic),
      searchRijks(topic),
      searchWikimedia(topic)
    ]);

    const liveItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);

    const raw = [...localItems, ...liveItems];
    const unique = [];
    const seen = new Set();
    
    for (const item of raw) {
      if (item?.imageUrl && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    
    const processed = unique
      .map(item => ({ ...item, categories: categorizeItem(item) }))
      .filter(item => matchesCategories(item, filters));

    let final = processed.slice(0, 400);

    // Only run AI validation if we have results and a topic that isn't the default
    if (apiKey && final.length > 0 && searchParams.get("topic")) {
      const topTier = final.slice(0, 10);
      const validated = await batchValidate(topTier, topic, apiKey, 10);
      final = [...validated, ...final.slice(10)];
    }

    cache.set(cacheKey, final);
    return new Response(JSON.stringify(final), { status: 200 });
  } catch (error) {
    console.error("[SEARCH] CRITICAL ERROR:", error);
    return new Response(JSON.stringify([]), { status: 500 });
  }
}