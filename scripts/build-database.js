/**
 * MUSEUM-GRADE ARCHIVE ENGINE v5.0 - SOURCE-AWARE
 * -----------------------------------------------------------------------------
 * Target Categories: 
 * 1. Painting | 2. Sculpture | 3. Works on Paper | 4. Photography 
 * 5. Architecture | 6. Decorative Art
 * -----------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(process.cwd(), 'artworks.db');
const MANIFEST_DIR = path.join(process.cwd(), 'public', 'manifests');
const HARVEST_FILES = ['artic.json', 'cooperhewitt.json', 'met.json', 'moma.json', 'va.json', 'zurich.json'];

if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new sqlite3.Database(dbPath);

const normalize = (val) => String(val || "").toLowerCase().trim();

/**
 * SOURCE-AWARE CATEGORY RESOLUTION
 * Uses specific priority fields identified for each museum manifest.
 */
function resolveMainCategory(item, source) {
    // --- 1. ZURICH GLOBAL OVERRIDE ---
    if (source === 'zurich.json') return "Works on Paper";

    // Extract key fields
    const classification = normalize(item.classification || item.Classification);
    const department = normalize(item.department || item.Department);
    const objType = normalize(item.objectType || item.category);
    const medium = normalize(item.medium || item.Medium);
    const title = normalize(item.title);

    let bestGuess = null;

    // --- 2. SOURCE-SPECIFIC PRIORITY LOGIC ---

    if (source === 'artic.json') {
        // Priority: Classification
        if (/painting/i.test(classification)) bestGuess = "Painting";
        else if (/photograph/i.test(classification)) bestGuess = "Photography";
        else if (/drawing|print|lithograph|etching/i.test(classification)) bestGuess = "Works on Paper";
        else if (/architecture|fragment/i.test(classification)) bestGuess = "Architecture";
    } 

    else if (source === 'met.json') {
        // Priority: Classification -> then Department
        if (/drawings|prints/i.test(classification)) bestGuess = "Works on Paper";
        else if (/photographs/i.test(department)) bestGuess = "Photography";
        else if (/paintings/i.test(department)) bestGuess = "Painting";
        else if (/sculpture/i.test(department)) bestGuess = "Sculpture";
    }

    else if (source === 'moma.json') {
        // SURGICAL FIX: Strict keyword ordering to stop "Architecture & Design" from defaulting to Decorative Art
        const context = `${classification} ${title} ${medium}`;
        if (/elevation|plan|architectural|building|model/i.test(context)) bestGuess = "Architecture";
        else if (/photograph/i.test(classification)) bestGuess = "Photography";
        else if (/print|drawing|illustrated book|lithograph|poster|etching|woodcut|letterpress|silkscreen/i.test(context)) bestGuess = "Works on Paper";
        else if (/design/i.test(classification)) bestGuess = "Decorative Art";
    }

    else if (source === 'va.json') {
        // Priority: ObjectType
        if (/drawing|poster|print/i.test(objType)) bestGuess = "Works on Paper";
        else if (/photograph/i.test(objType)) bestGuess = "Photography";
    }

    else if (source === 'cooperhewitt.json') {
        // Priority: Category -> then Classification
        if (/print|typography|illustration/i.test(objType)) bestGuess = "Works on Paper";
        else if (/sidewall|wallpaper/i.test(classification)) bestGuess = "Decorative Art";
    }

    // --- 3. WATERTIGHT KEYWORD FALLBACK (If source-specific check failed) ---
    if (!bestGuess) {
        const fullContext = `${classification} ${department} ${objType} ${medium} ${title}`;
        
        // SURGICAL FIX: Fine Arts keywords MUST come before generic "Design" or "Department" keywords
        if (/photograph|silver print|albumen|negative/i.test(fullContext)) return "Photography";
        if (/painting|oil on/i.test(fullContext)) return "Painting";
        if (/sculpture|bronze|statue|bust/i.test(fullContext)) return "Sculpture";
        if (/drawing|print|etching|lithograph|poster|book|magazine|paper|ink on/i.test(fullContext)) return "Works on Paper";
        if (/architecture|elevation|plan|blueprint|construction/i.test(fullContext)) return "Architecture";
        
        // Only if none of the above match do we check for Decorative Art specifics
        if (/furniture|textile|ceramic|glass|vase|teapot|pitcher|mirror|jewelry|metalwork|lighting|stoneware|earthenware|basketry|vessel|sidewall/i.test(fullContext)) return "Decorative Art";
        
        // Final fallback: If it mentions "design" and hasn't been caught by paper/architecture yet
        if (/design/i.test(fullContext)) return "Decorative Art";

        return "Works on Paper"; 
    }

    return bestGuess;
}

/**
 * EXECUTION BLOCK
 */
async function run() {
    console.log("🏛️  STARTING EXPLICIT SOURCE-AWARE BUILD...");

    db.serialize(() => {
        db.run(`CREATE TABLE artworks (
            id TEXT PRIMARY KEY,
            title TEXT,
            author TEXT,
            year TEXT,
            main_category TEXT,
            source TEXT,
            imageUrl TEXT,
            link TEXT,
            classification TEXT,
            medium TEXT,
            sub_category TEXT
        )`);

        const stmt = db.prepare(`INSERT OR REPLACE INTO artworks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const file of HARVEST_FILES) {
            const filePath = path.join(MANIFEST_DIR, file);
            if (!fs.existsSync(filePath)) continue;

            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`🔍 Processing ${file} using targeted field priority...`);

            data.forEach(item => {
                const finalCat = resolveMainCategory(item, file);
                stmt.run([
                    `${file.split('.')[0]}-${item.id}`,
                    item.title || "Untitled",
                    item.author || "Unknown",
                    item.year || "n.d.",
                    finalCat,
                    file,
                    item.imageUrl || "",
                    item.link || "",
                    item.classification || item.Classification || "",
                    item.medium || item.Medium || "",
                    item.department || item.Department || ""
                ]);
            });
        }

        stmt.finalize(() => {
            console.log("\n📊 BUILD COMPLETE. CROSS-REFERENCE AUDIT:");
            db.all(`SELECT main_category, COUNT(*) as count FROM artworks GROUP BY main_category ORDER BY count DESC`, (err, rows) => {
                console.table(rows);
                db.close();
            });
        });
    });
}

run();