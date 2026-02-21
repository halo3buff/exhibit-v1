const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// --- CONFIG ---
const dbPath = path.join(process.cwd(), 'artworks.db');
const OLLAMA_URL = "http://localhost:11434/api/generate";
const MANIFEST_DIR = path.join(process.cwd(), 'public', 'manifests');

const HARVEST_FILES = [
  'artic.json', 'cooperhewitt.json', 'met.json', 
  'moma.json', 'va.json', 'zurich.json'
];

const db = new sqlite3.Database(dbPath);

async function run() {
    console.log("🚀 STARTING SUPREME AI VISION SCAN...");

    // 1. Create Table (Doesn't delete old data, allows Resuming)
    await new Promise((resolve) => {
        db.run(`CREATE TABLE IF NOT EXISTS artworks (
            id TEXT PRIMARY KEY,
            title TEXT,
            author TEXT,
            year TEXT,
            main_category TEXT,
            imageUrl TEXT,
            source TEXT,
            is_ai_verified INTEGER DEFAULT 0
        )`, resolve);
    });

    for (const fileName of HARVEST_FILES) {
        const filePath = path.join(MANIFEST_DIR, fileName);
        if (!fs.existsSync(filePath)) continue;

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`\n📂 Scanning ${fileName}...`);

        for (const item of data) {
            // 2. RESUME LOGIC: Check if already verified
            const alreadyDone = await new Promise(res => {
                db.get("SELECT is_ai_verified FROM artworks WHERE id = ?", [item.id], (err, row) => {
                    res(row && row.is_ai_verified === 1);
                });
            });

            if (alreadyDone) continue; 

            let finalCategory = 'unclassified';

            if (item.imageUrl && item.imageUrl.startsWith('http')) {
                process.stdout.write(`👁️  AI Analyzing: ${item.title?.substring(0, 30)}... `);
                
                try {
                    const imgRes = await axios.get(item.imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
                    const base64 = Buffer.from(imgRes.data, 'binary').toString('base64');

                    // 3. THE SMART CLUE PROMPT
                    const prompt = `
                    TASK: Identify the art category.
                    CLUES:
                    - Title: ${item.title || 'Unknown'}
                    - Author: ${item.author || 'Unknown'}
                    - Type: ${item.objectType || 'Unknown'}
                    - Department: ${item.department || item.classification || 'Unknown'}
                    - Medium: ${item.medium || 'Unknown'}

                    Based on the image and clues, pick ONE: prints, drawings, photographs, paintings, sculpture, decorative-arts, textiles, architecture, books-manuscripts.
                    Reply with ONLY the word.`;

                    const aiRes = await axios.post(OLLAMA_URL, {
                        model: "llava",
                        prompt: prompt,
                        images: [base64],
                        stream: false
                    });
                    
                    finalCategory = aiRes.data.response.trim().toLowerCase().replace(/[.\n\r]/g, "");
                    process.stdout.write(`✅ [${finalCategory}]\n`);
                } catch (e) {
                    process.stdout.write(`❌ [Error: ${e.message.substring(0, 10)}]\n`);
                }
            }

            // 4. SAVE & MARK VERIFIED
            await new Promise((resolve) => {
                db.run(
                    `INSERT OR REPLACE INTO artworks (id, title, author, year, main_category, imageUrl, source, is_ai_verified) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                    [item.id, item.title, item.author, item.year, finalCategory, item.imageUrl, item.source],
                    resolve
                );
            });
        }
    }

    // 5. FINAL TABLE REPORT
    console.log("\n" + "=".repeat(40));
    console.log("📊 FINAL AI CATEGORY COUNTS");
    console.log("=".repeat(40));
    db.all("SELECT main_category, COUNT(*) as count FROM artworks GROUP BY main_category ORDER BY count DESC", [], (err, rows) => {
        console.table(rows);
        db.close();
    });
}

run();