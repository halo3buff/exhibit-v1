import { fetchMet as searchMet } from "@/lib/archives/met";
import { fetchArtic as searchArtic } from "@/lib/archives/artic";
import { fetchVA as searchVA } from "@/lib/archives/va";
import { fetchHarvard as searchHarvard } from "@/lib/archives/harvard";
import { fetchLOC as searchLoc } from "@/lib/archives/loc";
import { fetchNYPL as searchNypl } from "@/lib/archives/nypl";
import { fetchRijks as searchRijks } from "@/lib/archives/rijks";
import { fetchWikimedia as searchWikimedia } from "@/lib/archives/wikimedia";
import { mapItemToCanonicalType } from "@/lib/source-mappers";

import fs from 'fs';
import path from 'path';

const cache = new Map();

/**
 * Search local manifest files (harvest JSONs)
 * Currently only includes MoMA - add more as you get real data
 */
function searchLocalManifests(contentType = null) {
  const manifestDir = path.join(process.cwd(), 'public/manifests');
  
  // ONLY include manifests with real data
  const files = [
    'moma.json'  // Real data from moma_raw.json
    // Add more as you get real data:
    // 'letterform.json',
    // 'bauhaus.json',
    // etc.
  ];
  
  let localResults = [];

  files.forEach(file => {
    const filePath = path.join(manifestDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const items = data
          .map(item => {
            // Use source mapper to get canonical category
            const canonicalType = mapItemToCanonicalType(item);
            
            return {
              ...item,
              _computedType: canonicalType
            };
          })
          .filter(item => {
            const hasImage = item.imageUrl && item.imageUrl.trim() !== "";
            const hasType = item._computedType !== null;
            const matchesType = contentType ? item._computedType === contentType : true;
            return hasImage && hasType && matchesType;
          })
          .map(item => {
            // Remove temporary computed type
            const { _computedType, ...originalItem } = item;
            return originalItem;
          });

        localResults = [...localResults, ...items];
      } catch (e) {
        console.error(`[API] Error reading ${file}:`, e);
      }
    }
  });

  return localResults;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "design";
  const contentType = searchParams.get("type");

  console.log(`[API] Searching for type: ${contentType || 'ALL'}, query: ${query}`);

  // Check cache
  const cacheKey = `${query}-${contentType}`;
  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < 300000) { // 5 min cache
      console.log(`[API] Cache hit: ${cachedData.data.length} items`);
      return new Response(JSON.stringify(cachedData.data), { status: 200 });
    }
  }

  // Search local manifests (harvest JSONs)
  const localItems = searchLocalManifests(contentType);
  console.log(`[API] Local manifests: ${localItems.length} items`);

  // Search live APIs
  const apiPromises = [
    searchMet(query, contentType),
    searchArtic(query, contentType),
    searchVA(query, contentType),
    searchHarvard(query, contentType),
    searchLoc(query, contentType),
    searchNypl(query, contentType),
    searchRijks(query, contentType),
    searchWikimedia(query, contentType)
  ];

  const apiResults = await Promise.allSettled(apiPromises);
  
  const liveItems = apiResults
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value || [])
    .map(item => {
      // Use source mapper to get canonical category
      const canonicalType = mapItemToCanonicalType(item);
      
      return {
        ...item,
        _computedType: canonicalType
      };
    })
    .filter(item => item.imageUrl)
    .filter(item => item._computedType !== null) // Exclude unmapped items
    .filter(item => (contentType ? item._computedType === contentType : true))
    .map(item => {
      // Remove temporary computed type
      const { _computedType, ...originalItem } = item;
      return originalItem;
    });

  console.log(`[API] Live APIs: ${liveItems.length} items`);

  // Combine and deduplicate
  const raw = [...localItems, ...liveItems];
  const unique = [];
  const seen = new Set();
  
  for (const item of raw) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }

  // Shuffle and limit
  const final = unique.sort(() => 0.5 - Math.random()).slice(0, 100);

  console.log(`[API] Final results: ${final.length} items (${unique.length} unique before limiting to 100)`);

  // Cache results
  cache.set(cacheKey, { data: final, timestamp: Date.now() });

  return new Response(JSON.stringify(final), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}