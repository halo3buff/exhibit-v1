import { getLocationsForType } from './source-mappings';

export async function fetchWikimedia(query, contentType = null) {
  // Get relevant categories based on contentType, or use all
  const categories = contentType
    ? getLocationsForType('wikimedia', contentType)
    : ["Featured_pictures_on_Wikimedia_Commons", "Posters", "Typography", "Graphic_design", "Woodcuts"];
  
  const catQuery = categories.map(c => `incategory:"${c}"`).join(" OR ");
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)} ${encodeURIComponent(catQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages || {};
    
    return Object.values(pages).map(page => ({
      id: `wiki-${page.pageid}`,
      title: page.title.replace("File:", "").replace(".jpg", "").replace(".png", ""),
      author: page.imageinfo?.[0]?.extmetadata?.Artist?.value?.replace(/<[^>]*>?/gm, '') || "Wikimedia Commons",
      year: page.imageinfo?.[0]?.extmetadata?.DateTimeOriginal?.value || "Unknown",
      imageUrl: page.imageinfo?.[0]?.url,
      source: "Wikimedia Commons",
      link: `https://commons.wikimedia.org/wiki/${page.title}`
    })).filter(item => item.imageUrl);
  } catch (e) {
    console.error('[WIKIMEDIA] Error:', e);
    return [];
  }
}