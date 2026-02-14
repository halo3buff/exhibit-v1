export async function fetchLOC(query) {
    // Mapping the specialized "Locations" within the LOC digital vaults
    const locations = ["fsa", "pos", "wpapos", "app", "ade", "cpn", "gmd", "mss", "papr", "rbc"];
    const locFilter = locations.map(l => `location:${l}`).join(" OR ");
    
    // fo=json tells them we want data, c=25 is the count
    const res = await fetch(`https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fa=${encodeURIComponent(locFilter)}&fo=json&c=25`);
    const data = await res.json();
    
    return (data.results || []).map(item => ({
      id: `loc-${item.id}`,
      title: item.title,
      author: item.contributor?.[0] || "Library of Congress",
      year: item.date,
      imageUrl: item.image_url?.[0], // Grabs the first thumbnail
      source: "Library of Congress",
      link: item.url
    })).filter(item => item.imageUrl);
  }