import { getLocationsForType } from './source-mappings';

export async function fetchNYPL(query, contentType = null) {
  // Get relevant topics based on content type
  const topics = contentType
    ? getLocationsForType('nypl', contentType)
    : ["Posters", "Prints", "Photography", "Manuscripts", "Maps", "Art & Architecture"];
  
  const topicFilter = topics.map(t => `topic:"${t}"`).join(" OR ");
  
  const res = await fetch(`https://api.repo.nypl.org/api/v2/items/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(topicFilter)}&per_page=30`);
  const data = await res.json();
  
  return (data.nyplAPI?.response?.result || [])
    .filter(item => item.imageID)
    .map(item => ({
      id: `nypl-${item.uuid}`,
      title: item.title || "Item",
      author: item.creator || "NYPL",
      year: item.dateIssued || "Unknown",
      imageUrl: `https://images.nypl.org/?id=${item.imageID[0]}&t=w`,
      source: "NYPL",
      link: `https://digitalcollections.nypl.org/items/${item.uuid}`,
      format: item.typeOfResource
    }));
}