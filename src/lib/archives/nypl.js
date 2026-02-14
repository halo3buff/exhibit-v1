export async function fetchNYPL(query) {
    const topics = ["Posters", "Prints", "Photography", "Manuscripts", "Maps", "Art & Architecture"];
    const topicQuery = topics.map(t => `topic:"${t}"`).join(" OR ");
    const apiKey = process.env.NEXT_PUBLIC_NYPL_API_KEY;
  
    // NYPL uses a 'Token' header for security
    const res = await fetch(`http://api.repo.nypl.org/api/v1/items/search?q=${encodeURIComponent(query)} AND (${encodeURIComponent(topicQuery)})&publicDomainOnly=true`, {
      headers: { Authorization: `Token token="${apiKey}"` }
    });
    const data = await res.json();
    
    const results = data.nyplAPI?.response?.result || [];
    return results.map(item => ({
      id: `nypl-${item.uuid}`,
      title: item.title,
      author: "NYPL Digital Collections",
      year: "Various",
      imageUrl: `https://images.nypl.org/index.php?id=${item.imageID}&t=w`,
      source: "NYPL",
      link: item.itemLink
    })).filter(item => item.imageUrl);
  }