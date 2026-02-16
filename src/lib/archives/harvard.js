import { getLocationsForType } from './source-mappings';

export async function fetchHarvard(query, contentType = null) {
  // These are Harvard's classification IDs - keeping your existing mapping
  const allClassifications = {
    prints: 21,
    graphicDesign: 172,
    photographs: 23,
    posters: 30
  };
  
  // Map contentType to Harvard classification IDs
  let classifications;
  if (contentType) {
    // Use source-mappings to determine which classifications to query
    const types = getLocationsForType('harvard', contentType);
    if (types && types.includes('prints')) {
      classifications = [allClassifications.prints, allClassifications.graphicDesign];
    } else if (types && types.includes('photographs')) {
      classifications = [allClassifications.photographs];
    } else {
      // Default for this contentType
      classifications = [allClassifications.prints, allClassifications.graphicDesign, allClassifications.photographs];
    }
  } else {
    // No contentType - use all (current behavior preserved)
    classifications = Object.values(allClassifications);
  }
  
  const classFilter = classifications.join('|');
  const url = `https://api.harvardartmuseums.org/object?q=${encodeURIComponent(query)}&classification=${classFilter}&hasimage=1&size=25&apikey=NOT_REQUIRED_FOR_BASIC`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  return (data.records || []).map(item => ({
    id: `harvard-${item.id}`,
    title: item.title,
    author: item.people?.[0]?.displayname || "Harvard Art Museums",
    year: item.dated || "Unknown",
    imageUrl: item.primaryimageurl,
    source: "Harvard Art Museums",
    link: item.url,
    classification: item.classification, // ADD THIS
    medium: item.medium, // ADD THIS
    objectType: item.objectname // ADD THIS
  })).filter(item => item.imageUrl);
}