export async function fetchRijks(query) {
    const types = ["prent", "tekening", "foto", "affiches", "boek", "ornamentprent", "design"];
    const apiKey = process.env.NEXT_PUBLIC_RIJKS_API_KEY;
    
    let allItems = [];
    for (const type of types) {
      const res = await fetch(`https://www.rijksmuseum.nl/api/en/collection?key=${apiKey}&q=${encodeURIComponent(query)}&type=${type}&imgonly=true&ps=5`);
      const data = await res.json();
      if (data.artObjects) allItems.push(...data.artObjects);
    }
  
    return allItems.map(item => ({
      id: `rijks-${item.objectNumber}`,
      title: item.title,
      author: item.principalOrFirstMaker,
      year: "Unknown",
      imageUrl: item.webImage?.url,
      source: "Rijksmuseum",
      link: item.links.web
    })).filter(item => item.imageUrl);
  }