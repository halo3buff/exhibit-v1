export async function fetchArtic(query) {
  // We combine all your requested categories into one big "Super Filter"
  const classIds = ["PC-14", "PC-12", "PC-8", "PC-2", "PC-15", "PC-21", "PC-3", "PC-10", "PC-7", "PC-1"];
  const filterString = classIds.map(id => `classification_id:"${id}"`).join(" OR ");
  
  // This tells the Chicago computer: "Search for the query, but only if it's in these categories"
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[bool][must][][query_string][query]=${encodeURIComponent(filterString)}&fields=id,title,image_id,artist_display,date_display&limit=25`;
  
  const res = await fetch(url);
  const json = await res.json();
  
  return (json.data || []).map(item => ({
    id: `artic-${item.id}`,
    title: item.title,
    author: item.artist_display || "ArtIC",
    year: item.date_display,
    imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
    source: "Art Institute of Chicago",
    link: `https://www.artic.edu/artworks/${item.id}`
  })).filter(item => item.imageUrl && !item.imageUrl.includes("null"));
}