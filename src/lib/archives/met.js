export async function fetchMet(query) {
  const deptIds = [19, 21, 8, 12, 5, 6, 15, 14, 17];
  let allObjectIds = [];

  // Query all departments in parallel for speed
  const deptPromises = deptIds.map(async (id) => {
    try {
      const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${id}&hasImages=true&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      return data.objectIDs?.slice(0, 15) || []; // 15 per dept
    } catch {
      return [];
    }
  });

  const deptResults = await Promise.all(deptPromises);
  allObjectIds = deptResults.flat();

  // Fetch details for all items (max 135)
  const results = await Promise.all(
    allObjectIds.slice(0, 135).map(async (id) => {
      try {
        const itemRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const item = await itemRes.json();
        
        // Use primaryImage first, fallback to primaryImageSmall
        const imageUrl = item.primaryImage || item.primaryImageSmall;
        if (!imageUrl) return null;
        
        return {
          id: `met-${id}`,
          title: item.title || "Untitled",
          author: item.artistDisplayName || "Unknown",
          year: item.objectDate || "Unknown",
          imageUrl: imageUrl,
          source: "The Met",
          link: item.objectURL
        };
      } catch {
        return null;
      }
    })
  );
  
  return results.filter(Boolean);
}