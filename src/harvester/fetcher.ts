import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cooper Hewitt Weighted ID Logic
function getCooperWeightedId(): number {
  const r = Math.random();
  if (r < 0.60) return Math.floor(Math.random() * (18850000 - 18600000) + 18600000);
  if (r < 0.85) return Math.floor(Math.random() * (18600000 - 18400000) + 18400000);
  return Math.floor(Math.random() * (18400000 - 18000000) + 18000000);
}

export async function fetchSourceData(source: string, config: any) {
  const { filterId, filterType } = config;

  try {
    switch (source) {
      case 'cooper': {
        // THE GRIMEY WAY: GitHub Raw Files
        const batchIds = Array.from({ length: 250 }, () => getCooperWeightedId());
        const results = await Promise.all(batchIds.map(async (id) => {
          const sId = String(id);
          const url = `https://raw.githubusercontent.com/cooperhewitt/collection/master/objects/${sId.substring(0, 3)}/${sId.substring(3, 6)}/${sId.substring(6)}/${id}.json`;
          try {
            const res = await axios.get(url, { timeout: 1500 });
            return res.data;
          } catch { return null; }
        }));
        return results.filter(obj => obj && obj.images?.length > 0);
      }

      case 'met': {
        // SEMI-GRIMEY: Public API with Sequential Delay
        const metSearch = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects?${filterType}=${filterId}`);
        const metIDs = metSearch.data.objectIDs?.slice(0, 30) || [];
        const results = [];
        for (const id of metIDs) {
          try {
            const res = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            results.push(res.data);
            await delay(200); 
          } catch { continue; }
        }
        return results;
      }

      case 'smithsonian': {
        // THE GRIMEY WAY: Use the Unit ID to hit their public JSON fallback if key is missing
        const apiKey = process.env.SMITHSONIAN_API_KEY;
        const url = apiKey 
          ? `https://api.si.edu/openaccess/api/v1.0/search?api_key=${apiKey}&q=${filterId}&limit=50`
          : `https://collections.si.edu/search/results.json?q=${filterId}&max=50`; // Public search endpoint
        const res = await axios.get(url);
        return apiKey ? res.data.response.rows : res.data.items;
      }

      case 'loc': {
        // THE GRIMEY WAY: Direct Collection JSON
        const locRes = await axios.get(`https://www.loc.gov/collections/${filterId}/?fo=json&at=results&c=50`);
        return locRes.data.results;
      }

      case 'artic': {
        const articRes = await axios.get(`https://api.artic.edu/api/v1/artworks/search?query[term][${filterType}]=${filterId}&limit=50&fields=id,title,image_id,artist_display,date_display,medium_display,place_of_origin,department_title,classification_title`);
        return articRes.data.data;
      }

      case 'rave':
      case 'designreviewed': {
        // PURE SCRAPE
        const url = source === 'rave' 
          ? `https://ravepreservationproject.com/gallery/${filterId}`
          : `https://designreviewed.com/category/${filterId}`;
        const html = await axios.get(url);
        return [cheerio.load(html.data)];
      }

      default:
        // Fallback for sources that strictly require keys (Rijks, Harvard, NYPL)
        return fetchWithKey(source, filterId, filterType);
    }
  } catch (error: any) {
    console.error(`❌ Error fetching ${source}:`, error.message);
    return [];
  }
}

async function fetchWithKey(source: string, filterId: string, filterType: string) {
  if (source === 'harvard') {
    const res = await axios.get(`https://api.harvardartmuseums.org/object?${filterType}=${filterId}&size=50&apikey=${process.env.HARVARD_API_KEY}`);
    return res.data.records;
  }
  if (source === 'rijks') {
    const res = await axios.get(`https://www.rijksmuseum.nl/api/en/collection?key=${process.env.RIJKS_API_KEY}&type=${filterId}&ps=50`);
    return res.data.artObjects;
  }
  return [];
}