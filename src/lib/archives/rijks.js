import { getLocationsForType } from './source-mappings';

export async function fetchRijks(query, contentType = null) {
  // Get relevant types based on contentType, or use all types
  const types = contentType
    ? getLocationsForType('rijks', contentType)
    : ["prent", "tekening", "foto", "affiches", "boek", "ornamentprent", "design"];
  
  const apiKey = process.env.NEXT_PUBLIC_RIJKS_API_KEY || "0fiuZFh4";
  
  let allItems = [];
  for (const type of types) {
    try {
      const res = await fetch(`https://www.rijksmuseum.nl/api/en/collection?key=${apiKey}&q=${encodeURIComponent(query)}&type=${type}&imgonly=true&ps=5`);
      const data = await res.json();
      if (data.artObjects) allItems.push(...data.artObjects);
    } catch (e) {
      console.error(`[RIJKS] Error fetching type ${type}:`, e);
    }
  }

  return allItems.map(item => ({
    id: `rijks-${item.objectNumber}`,
    title: item.title,
    author: item.principalOrFirstMaker,
    year: item.dating?.presentingDate || "Unknown",
    imageUrl: item.webImage?.url,
    source: "Rijksmuseum",
    link: item.links?.web || `https://www.rijksmuseum.nl/en/collection/${item.objectNumber}`,
    objectType: item.objectTypes?.[0], // ADD THIS
    medium: item.materials?.[0] // ADD THIS
  })).filter(item => item.imageUrl);
}