import { getLocationsForType } from './source-mappings';

export async function fetchVA(query, contentType = null) {
  // Get relevant category IDs based on contentType, or use all
  const ids = contentType
    ? getLocationsForType('va', contentType)
    : ["THES48956", "THES48937", "THES48881", "THES48914", "THES253336", "THES48943"];
  
  const idQuery = ids.map(id => `id_category:${id}`).join(" OR ");
  
  try {
    const res = await fetch(`https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(query)}&q_entity_type=${encodeURIComponent(idQuery)}&images_exist=true&page_size=25`);
    const data = await res.json();
    
    return (data.records || []).map(item => ({
      id: `va-${item.systemNumber}`,
      title: item._primaryTitle,
      author: item._primaryMaker?.name || "V&A Museum",
      year: item._primaryDate,
      imageUrl: item._images?._primary_thumbnail,
      source: "V&A Museum",
      link: `https://collections.vam.ac.uk/item/${item.systemNumber}`,
      classification: item._primaryCategory, // ADD THIS
      objectType: item._primaryPlace?.name || item._primaryCategory // ADD THIS
    })).filter(item => item.imageUrl);
  } catch (e) {
    console.error('[V&A] Error:', e);
    return [];
  }
}