const fs = require('fs');
const path = require('path');

async function harvestMoMA() {
    console.log("🚚 Starting MoMA Deep Scan (Design + Fine Art)...");
    const inputPath = path.join(__dirname, 'moma_raw.json');
    const outputPath = path.join(__dirname, '../src/data/manifests/moma.json');

    try {
        if (!fs.existsSync(inputPath)) {
            throw new Error(`moma_raw.json not found in ${__dirname}`);
        }

        const rawData = fs.readFileSync(inputPath, 'utf8');
        const data = JSON.parse(rawData);

        console.log("🔍 DATA AUDIT:");
        console.log(`Total records in raw file: ${data.length}`);

        const curated = data.filter(item => {
            const imgUrl = item.ImageURL || item.URL;
            const dept = (item.Department || "").toLowerCase();
            const classification = (item.Classification || "").toLowerCase();
            
            // Only items with a real web link to an image
            const hasImage = imgUrl && String(imgUrl).startsWith('http');
            
            // EXPANDED FILTER: Design + Fine Art + Architecture + Drawings
            const isTargetDept = 
                dept.includes("arch") || 
                dept.includes("design") || 
                dept.includes("photo") || 
                dept.includes("painting") || // ✅ Added Fine Art
                dept.includes("sculpture") || // ✅ Added Fine Art
                dept.includes("draw") || 
                classification.includes("print") ||
                classification.includes("poster");
            
            return hasImage && isTargetDept;
        }).map(item => {
            let cleanAuthor = "Unknown Artist";
            if (item.Artist) {
                cleanAuthor = Array.isArray(item.Artist) ? item.Artist[0] : String(item.Artist).split(',')[0];
            }

            return {
                id: `moma-${item.ObjectID}`,
                title: item.Title || "Untitled Work",
                author: cleanAuthor,
                year: item.Date || "Unknown",
                imageUrl: item.ImageURL, 
                source: "The Museum of Modern Art",
                link: item.URL || `https://www.moma.org/collection/works/${item.ObjectID}`,
                
                // ✅ ENHANCED CATEGORY DATA FOR CLAUDE'S SYSTEM
                medium: item.Medium || "",
                classification: item.Classification || "",
                objectType: item.Department || "",
                culture: item.Nationality ? (Array.isArray(item.Nationality) ? item.Nationality[0] : item.Nationality) : ""
            };
        });

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Expanded limit to 8,000 to accommodate the new Fine Art items
        fs.writeFileSync(outputPath, JSON.stringify(curated.slice(0, 8000), null, 2));
        
        console.log("-----------------------------------------");
        console.log(`✅ MATCHED (FINE ART + DESIGN): ${curated.length}`);
        console.log(`📁 FILE SAVED: src/data/manifests/moma.json`);
        console.log("-----------------------------------------");
        
    } catch (error) {
        console.error("❌ Deep Scan failed:", error.message);
    }
}

harvestMoMA();