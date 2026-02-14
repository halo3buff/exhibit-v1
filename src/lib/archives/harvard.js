export async function fetchHarvard(query) {
    // We target specific "Classifications": 
    // 21 (Prints), 172 (Graphic Design), 23 (Photographs), 30 (Posters)
    const classifications = [21, 172, 23, 30];
    const classFilter = classifications.join('|');
    
    // Harvard's API allows us to filter by classification and images-only in one go
    const url = `https://api.harvardartmuseums.org/object?q=${encodeURIComponent(query)}&classification=${classFilter}&hasimage=1&size=25&apikey=NOT_REQUIRED_FOR_BASIC`;
  
    // Note: Harvard technically prefers a key for high volume, 
    // but for a student/dev project, you can often test with their public endpoints.
    // If you want a permanent one, it's instant here: https://harvardartmuseums.org/collections/api
    
    const res = await fetch(url);
    const data = await res.json();
    
    return (data.records || []).map(item => ({
      id: `harvard-${item.id}`,
      title: item.title,
      author: item.people?.[0]?.displayname || "Harvard Art Museums",
      year: item.dated || "Unknown",
      imageUrl: item.primaryimageurl,
      source: "Harvard Art Museums",
      link: item.url
    })).filter(item => item.imageUrl);
  }