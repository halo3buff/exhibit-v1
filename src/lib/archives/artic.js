export async function fetchArtic(query) {
  const classIds = ["PC-14", "PC-12", "PC-8", "PC-2", "PC-15", "PC-21", "PC-3", "PC-10", "PC-7", "PC-1"];
  
  // Query each classification separately (parallel requests)
  const promises = classIds.map(async (classId) => {
    try {
      const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][classification_id]=${classId}&fields=id,title,image_id,artist_display,date_display&limit=10`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  });
  
  const results = await Promise.all(promises);
  const allItems = results.flat();
  
  return allItems
    .filter(item => item.image_id) // Must have image
    .map(item => ({
      id: `artic-${item.id}`,
      title: item.title || "Untitled",
      author: item.artist_display || "Unknown",
      year: item.date_display || "Unknown",
      imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
      source: "Art Institute of Chicago",
      link: `https://www.artic.edu/artworks/${item.id}`
    }));
}