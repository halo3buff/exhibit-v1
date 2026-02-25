import { ArchiveItem } from '../types.js';

export const smithsonianAdapter = (raw: any): ArchiveItem => {
  // 1. Normalize the "Grimey" vs "Official" data structure
  // The Smithsonian API puts everything in .content, the public search doesn't.
  const content = raw.content || raw; 
  const desData = content.descriptiveNonRepeating || {};
  const indexed = content.indexedStructured || {};
  const freetext = content.freetext || {};

  // 2. Resolve the Image (Prioritize high-res content over thumbnails)
  const img = desData.online_media?.media?.[0]?.content || 
              desData.online_media?.media?.[0]?.thumbnail || "";

  // 3. Construct the item with deep safety checks
  return {
    id: `si-${raw.id || desData.record_ID || Math.random().toString(36).substr(2, 9)}`,
    title: raw.title || desData.title || "Untitled",
    
    // Smithsonian data is often nested in "freetext" arrays
    author: freetext.name?.[0]?.content || indexed.name?.[0] || "Unknown",
    year: freetext.date?.[0]?.content || indexed.date?.[0] || "n.d.",
    
    imageUrl: img,
    source: desData.data_source || "Smithsonian Institution",
    link: desData.record_link || `https://collections.si.edu/search/detail/${raw.id}`,
    
    department: indexed.unit?.[0] || "Unknown",
    classification: indexed.object_type?.[0] || "Unknown",
    
    // Map medium and culture safely
    medium: freetext.physicalDescription?.[0]?.content || freetext.notes?.[0]?.content || "Unknown",
    culture: indexed.culture?.[0] || "Unknown",
    
    _raw: raw
  };
};