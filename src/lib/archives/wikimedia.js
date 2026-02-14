export async function fetchWikimedia(query) {
    const categories = ["Featured_pictures_on_Wikimedia_Commons", "Posters", "Typography", "Graphic_design", "Woodcuts"];
    const catQuery = categories.map(c => `incategory:"${c}"`).join(" OR ");
    
    // This API is a bit complex, but it's the most powerful way to search Commons
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)} ${encodeURIComponent(catQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
    
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
  }