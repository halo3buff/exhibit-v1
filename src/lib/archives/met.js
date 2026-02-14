export async function fetchMet(query) {
  // These are the "Room Numbers" for all 10 of your categories
  const deptIds = [19, 21, 8, 12, 5, 6, 15, 14, 17];
  let allObjectIds = [];

  // This loop goes through every "Room" and looks for your search term
  for (const id of deptIds) {
    const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/search?departmentId=${id}&hasImages=true&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.objectIDs) {
      // We take the top 5 from each department to keep things fast
      allObjectIds.push(...data.objectIDs.slice(0, 5));
    }
  }

  // Now we get the actual photos and titles for those IDs
  const results = await Promise.all(
    allObjectIds.slice(0, 25).map(async (id) => {
      try {
        const itemRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        const item = await itemRes.json();
        if (!item.primaryImageSmall) return null;
        return {
          id: `met-${id}`,
          title: item.title,
          author: item.artistDisplayName || "The Met",
          year: item.objectDate,
          imageUrl: item.primaryImageSmall,
          source: "The Met",
          link: item.objectURL
        };
      } catch (e) { return null; }
    })
  );
  return results.filter(Boolean);
}