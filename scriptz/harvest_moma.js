const fs = require('fs');
const path = require('path');

/**
 * MOMA HARVEST - PRODUCTION
 * 
 * Reads moma_raw.json and creates a cleaned manifest.
 * Preserves MoMA's original taxonomy (Department, Classification, Medium).
 * The source mapper will handle categorization at runtime.
 * 
 * IMPORTANT: This script requires moma_raw.json in the scripts/ directory.
 * This should be the actual MoMA collection data export.
 */

async function harvestMoMA() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  MoMA Collection Harvest");
    console.log("═══════════════════════════════════════════════════════════\n");
    
    const inputPath = path.join(__dirname, 'moma_raw.json');
    const outputPath = path.join(__dirname, '../public/manifests/moma.json');

    // Check if source data exists
    if (!fs.existsSync(inputPath)) {
        console.error("❌ ERROR: moma_raw.json not found in scripts/ directory");
        console.error("\nTo use this script, you need:");
        console.error("1. Download MoMA collection data");
        console.error("2. Save as scripts/moma_raw.json");
        console.error("3. Run this script again\n");
        process.exit(1);
    }

    try {
        // Read and parse source data
        console.log("📖 Reading moma_raw.json...");
        const rawData = fs.readFileSync(inputPath, 'utf8');
        const data = JSON.parse(rawData);
        console.log(`   Found ${data.length} total records\n`);

        // Filter and transform
        console.log("🔍 Filtering for artwork with images...");
        const curated = data.filter(item => {
            const imgUrl = item.ImageURL || item.URL;
            const dept = (item.Department || "").toLowerCase();
            const classification = (item.Classification || "").toLowerCase();
            
            // Must have a valid image URL
            const hasImage = imgUrl && String(imgUrl).startsWith('http');
            if (!hasImage) return false;
            
            // Filter for visual arts departments
            // Include: Photography, Drawings & Prints, Painting & Sculpture,
            //          Architecture & Design
            // Exclude: Film, Media and Performance (for now)
            const isVisualArt = 
                dept.includes("photo") || 
                dept.includes("draw") || 
                dept.includes("print") ||
                dept.includes("painting") || 
                dept.includes("sculpture") || 
                dept.includes("architecture") ||
                dept.includes("design") ||
                classification.includes("poster");
            
            return hasImage && isVisualArt;
        }).map(item => {
            // Clean author field
            let cleanAuthor = "Unknown Artist";
            if (item.Artist) {
                cleanAuthor = Array.isArray(item.Artist) 
                    ? item.Artist[0] 
                    : String(item.Artist).split(',')[0];
            }

            // Return cleaned item with original taxonomy preserved
            return {
                id: `moma-${item.ObjectID}`,
                title: item.Title || "Untitled Work",
                author: cleanAuthor,
                year: item.Date || "Unknown",
                imageUrl: item.ImageURL, 
                source: "The Museum of Modern Art",
                link: item.URL || `https://www.moma.org/collection/works/${item.ObjectID}`,
                
                // PRESERVE ORIGINAL TAXONOMY
                // These fields will be used by source mapper at runtime
                Department: item.Department || "",
                Classification: item.Classification || "",
                Medium: item.Medium || "",
                
                // Lowercase versions for easier matching
                department: (item.Department || "").toLowerCase(),
                classification: (item.Classification || "").toLowerCase(),
                medium: (item.Medium || "").toLowerCase(),
                
                // Additional metadata
                culture: item.Nationality 
                    ? (Array.isArray(item.Nationality) ? item.Nationality[0] : item.Nationality) 
                    : ""
            };
        });

        console.log(`   ✓ Filtered to ${curated.length} visual art items with images\n`);

        // Create output directory if needed
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Limit to first 8000 and save
        const limited = curated.slice(0, 8000);
        fs.writeFileSync(outputPath, JSON.stringify(limited, null, 2));
        
        console.log("═══════════════════════════════════════════════════════════");
        console.log("  ✅ SUCCESS");
        console.log("═══════════════════════════════════════════════════════════");
        console.log(`\n📁 Saved: public/manifests/moma.json`);
        console.log(`   Items: ${limited.length}`);
        console.log(`   Taxonomy preserved: Department, Classification, Medium\n`);
        
        // Show sample of what we're working with
        console.log("───────────────────────────────────────────────────────────");
        console.log("Sample Taxonomy (first 5 items):");
        console.log("───────────────────────────────────────────────────────────\n");
        
        limited.slice(0, 5).forEach((item, i) => {
            console.log(`${i + 1}. ${item.title}`);
            console.log(`   Department: ${item.Department}`);
            console.log(`   Classification: ${item.Classification}`);
            console.log(`   Medium: ${item.Medium.substring(0, 60)}${item.Medium.length > 60 ? '...' : ''}`);
            console.log();
        });
        
        // Show department distribution
        console.log("───────────────────────────────────────────────────────────");
        console.log("Department Distribution:");
        console.log("───────────────────────────────────────────────────────────\n");
        
        const deptCounts = {};
        limited.forEach(item => {
            const dept = item.Department || 'Unknown';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
        
        Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([dept, count]) => {
                const percentage = (count / limited.length * 100).toFixed(1);
                console.log(`   ${dept.padEnd(30)} ${count.toString().padStart(5)} (${percentage}%)`);
            });
        
        console.log("\n═══════════════════════════════════════════════════════════\n");
        
    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        console.error("\nStack trace:");
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the harvest
harvestMoMA();