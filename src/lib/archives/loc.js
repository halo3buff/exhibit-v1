import { getLocationsForType } from './source-mappings';

export async function fetchLOC(query, contentType = null) {
  // Get relevant locations based on content type
  const locations = contentType 
    ? getLocationsForType('loc', contentType)
    : ["fsa", "pos", "wpapos", "app", "ade", "cpn", "gmd", "mss", "papr", "rbc"];
  
  const locFilter = locations.map(l => `location:${l}`).join(" OR ");
  
  const res = await fetch(`https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fa=${encodeURIComponent(locFilter)}&fo=json&c=25`);
  const data = await res.json();
  
  return (data.results || []).map(item => ({
    id: `loc-${item.id}`,
    title: item.title,
    author: item.contributor?.[0] || "Library of Congress",
    year: item.date,
    imageUrl: item.image_url?.[0],
    source: "Library of Congress",
    link: item.url,
    // Add raw metadata for categorization
    format: item.original_format,
    location: item.location
  })).filter(item => item.imageUrl);
}