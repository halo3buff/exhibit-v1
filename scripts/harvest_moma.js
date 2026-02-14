const fs = require('fs');
const path = require('path');

async function harvestMoMA() {
    console.log("🚚 Starting MoMA Deep Scan...");
    const inputPath = path.join(__dirname, 'moma_raw.json');
    const outputPath = path.join(__dirname, '../src/data/manifests/moma.json');

    try {
        const rawData = fs.readFileSync(inputPath, 'utf8');
        const data = JSON.parse(rawData);

        // This version prints out the first item's keys so we can debug together!
        console.log("📝 Debugging - The first item's keys are:", Object.keys(data[0]));

        const curated = data
            .filter(item => {
                // We look for ANY key that contains "Thumbnail" or "URL"
                const imageUrl = item.ThumbnailURL || item.thumbnailUrl || item.URL || item.url;
                const dept = (item.Department || item.department || "").toLowerCase();
                
                // Flexible check: Does it have an image and is it related to design/arch/photo?
                const hasImage = imageUrl && imageUrl.includes('http');
                const isDesign = dept.includes("arch") || dept.includes("design") || dept.includes("photo") || dept.includes("draw");
                
                return hasImage && isDesign;
            })
            .map(item => ({
                id: `moma-${item.ObjectID || item.objectid || Math.random()}`,
                title: item.Title || item.title || "Untitled",
                author: (item.Artist || item.artist || ["Unknown"])[0],
                year: item.Date || item.date || "Unknown",
                imageUrl: item.ThumbnailURL || item.thumbnailUrl,
                source: "MoMA",
                link: `https://www.moma.org/collection/works/${item.ObjectID || item.objectid}`
            }));

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(curated.slice(0, 3000), null, 2));
        
        console.log(`✨ Found and saved ${curated.length} items!`);
        
    } catch (error) {
        console.error("❌ Deep Scan failed:", error.message);
    }
}

harvestMoMA();