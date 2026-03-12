// src/scripts/reclassify.mjs
// Re-classifies every artwork in the DB using the stored metadata fields.
// Does NOT require raw files — works entirely from what's already in artworks.db
//
// Usage:
//   node src/scripts/reclassify.mjs          → dry run (shows what would change)
//   node src/scripts/reclassify.mjs --commit  → apply changes to DB

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB_PATH = path.join(ROOT, 'artworks.db');
const COMMIT  = process.argv.includes('--commit');

// ── SUB → MAIN mapping ───────────────────────────────────────────────────────
const SUB_TO_MAIN = {
  'Posters & Advertising':      'Graphic Design',
  'Typography & Lettering':     'Graphic Design',
  'Identity & Branding':        'Graphic Design',
  'Editorial/Publication':      'Graphic Design',
  'Packaging':                  'Graphic Design',
  'Oil':                        'Painting',
  'Watercolor/Gouache':         'Painting',
  'Tempera/Fresco':             'Painting',
  'Etching/Woodcut/Lithograph': 'Prints & Drawings',
  'Drawings':                   'Prints & Drawings',
  'Collage':                    'Prints & Drawings',
  'Photograph':                 'Photography',
  'Ceramics & Glass':           'Decorative Arts',
  'Furniture':                  'Decorative Arts',
  'Textiles & Fashion':         'Decorative Arts',
  'Metalwork & Jewelry':        'Decorative Arts',
};

// ── SCORING RULES — applied to normalized DB fields ──────────────────────────
// Each rule: { match: string|regex, field: 'objectType'|'classification'|'medium'|'department', subCategory, score }
const RULES = [
  // ── PHOTOGRAPHY (check first — very clear signals) ────────────────────────
  { field:'objectType',     match:/photograph|daguerreotype|tintype|ambrotype|cyanotype|calotype|albumen|gelatin silver|photogram|photomontage|stereograph/i, subCategory:'Photograph',                  score:22 },
  { field:'classification', match:/photograph|photography/i,                                                                                                   subCategory:'Photograph',                  score:16 },
  { field:'medium',         match:/gelatin silver|albumen print|daguerreotype|cyanotype|platinum print|photogravure|salted paper/i,                            subCategory:'Photograph',                  score:20 },

  // ── GRAPHIC DESIGN ────────────────────────────────────────────────────────
  { field:'objectType',     match:/^poster$/i,                                 subCategory:'Posters & Advertising',  score:22 },
  { field:'objectType',     match:/advertisement|trade card|broadside|handbill|ephemera|showcard|chromolithograph/i, subCategory:'Posters & Advertising',  score:18 },
  { field:'objectType',     match:/type specimen|typeface|lettering|alphabet/i, subCategory:'Typography & Lettering', score:22 },
  { field:'objectType',     match:/logo|trademark|logotype/i,                  subCategory:'Identity & Branding',    score:20 },
  { field:'objectType',     match:/book jacket|book cover|magazine cover|magazine|periodical|menu|programme/i, subCategory:'Editorial/Publication', score:18 },
  { field:'objectType',     match:/^label$|^packaging$|^wrapper$/i,            subCategory:'Packaging',              score:20 },
  { field:'classification', match:/graphic design|commercial art|visual communication|advertising|typography/i, subCategory:'Posters & Advertising', score:14 },
  { field:'department',     match:/graphic design|graphic arts|commercial art/i, subCategory:'Posters & Advertising', score:12 },

  // ── PAINTING ─────────────────────────────────────────────────────────────
  { field:'medium',         match:/oil on canvas|oil on panel|oil on wood|oil on copper/i, subCategory:'Oil',                score:22 },
  { field:'objectType',     match:/^oil painting$/i,                           subCategory:'Oil',                    score:22 },
  { field:'objectType',     match:/^painting$|^panel painting$/i,              subCategory:'Oil',                    score:16 },
  { field:'medium',         match:/watercolou?r/i,                             subCategory:'Watercolor/Gouache',     score:20 },
  { field:'objectType',     match:/watercolou?r|watercolou?r painting/i,       subCategory:'Watercolor/Gouache',     score:20 },
  { field:'medium',         match:/gouache/i,                                  subCategory:'Watercolor/Gouache',     score:18 },
  { field:'medium',         match:/tempera/i,                                  subCategory:'Tempera/Fresco',         score:18 },
  { field:'medium',         match:/fresco/i,                                   subCategory:'Tempera/Fresco',         score:18 },
  { field:'classification', match:/^paintings?$/i,                             subCategory:'Oil',                    score:12 },

  // ── PRINTS & DRAWINGS ────────────────────────────────────────────────────
  { field:'objectType',     match:/etching|engraving|aquatint|mezzotint|drypoint|intaglio/i, subCategory:'Etching/Woodcut/Lithograph', score:22 },
  { field:'objectType',     match:/woodcut|wood engraving|woodblock|linocut|relief print/i,  subCategory:'Etching/Woodcut/Lithograph', score:22 },
  { field:'objectType',     match:/^lithograph$|screenprint|silkscreen|monotype/i,           subCategory:'Etching/Woodcut/Lithograph', score:20 },
  { field:'objectType',     match:/^print$/i,                                                subCategory:'Etching/Woodcut/Lithograph', score:16 },
  { field:'medium',         match:/etching|engraving|lithograph|woodcut|aquatint|mezzotint|drypoint|screenprint/i, subCategory:'Etching/Woodcut/Lithograph', score:18 },
  { field:'objectType',     match:/^drawing$|^sketch$|^study$|^pastel$|^charcoal$/i,        subCategory:'Drawings',                   score:18 },
  { field:'objectType',     match:/^collage$/i,                                              subCategory:'Collage',                    score:20 },
  { field:'classification', match:/^prints?$|^drawings?$|printmaking|graphic arts/i,         subCategory:'Etching/Woodcut/Lithograph', score:12 },

  // ── DECORATIVE ARTS ───────────────────────────────────────────────────────
  { field:'objectType',     match:/ceramic|pottery|porcelain|earthenware|stoneware|^vase$|^bowl$|^plate$|^cup$/i, subCategory:'Ceramics & Glass', score:18 },
  { field:'objectType',     match:/^glass$|glassware/i,                        subCategory:'Ceramics & Glass',    score:18 },
  { field:'objectType',     match:/furniture|^chair$|^table$|^cabinet$|^desk$|^chest$|^bed$/i, subCategory:'Furniture', score:18 },
  { field:'objectType',     match:/textile|tapestry|^dress$|costume|lace|embroidery|^rug$/i, subCategory:'Textiles & Fashion', score:18 },
  { field:'objectType',     match:/metalwork|silver|^jewelry$|^jewellery$|necklace|brooch|^ring$|bracelet|pendant/i, subCategory:'Metalwork & Jewelry', score:18 },
  { field:'classification', match:/ceramics?|glass|furniture|textiles?|costume|metalwork|jewellery|jewelry|decorative/i, subCategory:'Ceramics & Glass', score:12 },
];

// ── NEGATIVE signals — if these match, heavily penalize that subCategory's main ─
const NEGATIVE_RULES = [
  // Don't call a photograph a painting
  { field:'objectType', match:/photograph|daguerreotype|tintype/i, penalizeMain:'Painting',   penalty:-20 },
  { field:'objectType', match:/photograph|daguerreotype|tintype/i, penalizeMain:'Prints & Drawings', penalty:-15 },
  // Don't call a poster a print
  { field:'objectType', match:/^poster$/i,                         penalizeMain:'Prints & Drawings', penalty:-15 },
  // Don't call oil paintings prints
  { field:'medium',     match:/oil on canvas|oil on panel/i,       penalizeMain:'Prints & Drawings', penalty:-20 },
  { field:'medium',     match:/oil on canvas|oil on panel/i,       penalizeMain:'Photography',       penalty:-20 },
];

function scoreItem(row) {
  // Gather scores per subCategory
  const subScores = {};

  for (const rule of RULES) {
    const val = (row[rule.field] || '').trim();
    if (!val || val === 'Unknown') continue;

    const matched = rule.match instanceof RegExp
      ? rule.match.test(val)
      : val.toLowerCase().includes(rule.match.toLowerCase());

    if (matched) {
      subScores[rule.subCategory] = (subScores[rule.subCategory] || 0) + rule.score;
    }
  }

  if (Object.keys(subScores).length === 0) return null;

  // Apply negative rules — penalize main categories
  const mainPenalties = {};
  for (const neg of NEGATIVE_RULES) {
    const val = (row[neg.field] || '').trim();
    if (!val) continue;
    const matched = neg.match instanceof RegExp ? neg.match.test(val) : val.toLowerCase().includes(neg.match.toLowerCase());
    if (matched) {
      mainPenalties[neg.penalizeMain] = (mainPenalties[neg.penalizeMain] || 0) + neg.penalty;
    }
  }

  // Apply penalties to sub scores
  const adjusted = {};
  for (const [sub, score] of Object.entries(subScores)) {
    const main = SUB_TO_MAIN[sub] || 'Uncategorized';
    adjusted[sub] = score + (mainPenalties[main] || 0);
  }

  // Pick best
  const best = Object.entries(adjusted).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 15) return null; // min confidence

  return {
    subCategory: best[0],
    mainCategory: SUB_TO_MAIN[best[0]] || 'Uncategorized',
    score: best[1],
  };
}

async function main() {
  const db = new Database(DB_PATH);

  const rows = db.prepare(`
    SELECT id, title, source, mainCategory, subCategory, objectType, classification, medium, department
    FROM artworks
    WHERE imageUrl IS NOT NULL AND imageUrl != ''
  `).all();

  console.log(`\n🔍 Reclassifying ${rows.length} artworks...\n`);

  const changes = [];
  const byChange = {};
  let unchanged = 0;
  let unclassifiable = 0;

  for (const row of rows) {
    const result = scoreItem(row);
    if (!result) { unclassifiable++; continue; }

    const mainChanged = result.mainCategory !== row.mainCategory;
    const subChanged  = result.subCategory  !== row.subCategory;

    if (!mainChanged && !subChanged) { unchanged++; continue; }

    const changeKey = `${row.mainCategory}/${row.subCategory} → ${result.mainCategory}/${result.subCategory}`;
    byChange[changeKey] = (byChange[changeKey] || 0) + 1;

    changes.push({ id: row.id, title: row.title, oldMain: row.mainCategory, oldSub: row.subCategory, newMain: result.mainCategory, newSub: result.subCategory, score: result.score });
  }

  // Report
  console.log(`📊 Summary:`);
  console.log(`   Total:          ${rows.length}`);
  console.log(`   Would change:   ${changes.length}`);
  console.log(`   Unchanged:      ${unchanged}`);
  console.log(`   Unclassifiable: ${unclassifiable} (no metadata to score)`);

  console.log(`\n🔄 Change patterns (top 30):`);
  Object.entries(byChange)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([change, count]) => {
      console.log(`   ${count.toString().padStart(5)}x  ${change}`);
    });

  console.log(`\n📋 Sample changes (first 20):`);
  changes.slice(0, 20).forEach(c => {
    console.log(`   [${c.id}] "${c.title?.slice(0, 50)}"`);
    console.log(`         ${c.oldMain}/${c.oldSub} → ${c.newMain}/${c.newSub}  (score: ${c.score})`);
  });

  if (!COMMIT) {
    console.log(`\n⚠️  DRY RUN — no changes made.`);
    console.log(`   Review the changes above, then run with --commit to apply:\n`);
    console.log(`   node src/scripts/reclassify.mjs --commit\n`);
    db.close();
    return;
  }

  // Apply changes
  console.log(`\n✏️  Applying ${changes.length} changes...`);
  const update = db.prepare(`UPDATE artworks SET mainCategory = ?, subCategory = ? WHERE id = ?`);
  const applyAll = db.transaction((items) => {
    for (const c of items) update.run(c.newMain, c.newSub, c.id);
  });
  applyAll(changes);
  db.close();

  console.log(`✅ Done — ${changes.length} artworks reclassified.\n`);
}

main().catch(console.error);
