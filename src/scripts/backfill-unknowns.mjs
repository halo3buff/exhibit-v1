// src/scripts/backfill-unknowns.mjs
// ─────────────────────────────────────────────────────────────────────────────
// BACKFILL: Fill in missing year, title, author by re-reading raw source files
// and looking at alternative fields the original transform didn't use.
//
// Strategy:
//   - Only touches rows where year = 'n.d.' OR title = 'Untitled' OR author = 'Unknown'
//   - Reads the raw JSON for each such item from data/raw/{source}/
//   - Applies source-specific extended field extraction
//   - Updates the DB row in-place — does NOT reclassify or change categories
//   - Logs every change made so you can audit/revert
//
// Run: node src/scripts/backfill-unknowns.mjs
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const RAW_DIR   = path.join(ROOT, 'data', 'raw');
const LOG_PATH  = path.join(ROOT, 'data', 'backfill-log.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function isEmpty(val) {
  if (!val) return true;
  const v = str(val).toLowerCase();
  return v === '' || v === 'unknown' || v === 'untitled' || v === 'n.d.' || v === 'n/a' || v === 'none';
}

/** Extract the best 4-digit year, or a "c. YYYY–YYYY" range string, from raw date info */
function bestYear(display, begin, end) {
  // Try display string first (e.g. "ca. 1920", "1900-1910", "19th century")
  if (display && str(display) !== 'n.d.') {
    const single = str(display).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    if (single) return single[0];

    // Range like "1900-1910" or "1900–1910"
    const range = str(display).match(/\b(1[0-9]{3}|20[0-9]{2})\b.*?\b(1[0-9]{3}|20[0-9]{2})\b/);
    if (range) return `c. ${range[1]}–${range[2]}`;
  }

  // Fall back to structured begin/end
  const b = parseInt(str(begin).match(/(\d{4})/)?.[1] || '');
  const e = parseInt(str(end).match(/(\d{4})/)?.[1] || '');

  if (!isNaN(b) && !isNaN(e)) {
    if (b === e) return String(b);
    if (Math.abs(e - b) <= 5) return String(b);  // close enough — use begin
    return `c. ${b}–${e}`;
  }
  if (!isNaN(b)) return String(b);
  if (!isNaN(e)) return String(e);

  return null;
}

// ── Per-source extractors ─────────────────────────────────────────────────────

function extractMet(raw) {
  const d = raw.data || raw;
  const updates = {};

  // Year — objectDate display string ONLY.
  // IMPORTANT: objectBeginDate/objectEndDate are the ARTIST'S lifespan dates,
  // NOT the artwork's creation date. Never use them for year.
  const dateDisplay = str(d.objectDate);
  if (dateDisplay && dateDisplay !== 'n.d.') {
    const single = dateDisplay.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    if (single) updates.year = single[0];
    // No range fallback for Met — objectDate display is the only reliable source
  }

  // Author — artistDisplayName is primary; fall back to artistPrefix + artistSuffix
  if (str(d.artistDisplayName)) {
    updates.author = str(d.artistDisplayName);
  } else {
    const prefix = str(d.artistPrefix);
    const suffix = str(d.artistSuffix);
    const nation = str(d.artistNationality);
    const dates  = str(d.artistBeginDate) && str(d.artistEndDate)
      ? `${d.artistBeginDate}–${d.artistEndDate}` : '';
    // "Circle of ...", "Workshop of ..." etc live in artistRole
    const role = str(d.artistRole);
    if (role && prefix) updates.author = `${role}, ${prefix}`.trim();
    else if (nation && dates) updates.author = `${nation}, ${dates}`;
  }

  // Title — objectName is a reasonable fallback
  if (!str(d.title) || str(d.title).toLowerCase() === 'untitled') {
    if (str(d.objectName)) updates.title = str(d.objectName);
  } else {
    updates.title = str(d.title);
  }

  // Culture as author fallback
  if (isEmpty(updates.author) && str(d.culture)) {
    updates.author = str(d.culture);
  }

  return updates;
}

function extractArtic(raw) {
  const d = raw.data || raw;
  const updates = {};

  const year = bestYear(d.date_display, d.date_start, d.date_end);
  if (year) updates.year = year;

  // artist_display includes nationality+dates, e.g. "Rembrandt van Rijn\nDutch, 1606-1669"
  // Clean it to just the name
  if (str(d.artist_display)) {
    updates.author = str(d.artist_display).split('\n')[0].trim();
  } else if (str(d.artist_title)) {
    updates.author = str(d.artist_title);
  }

  if (str(d.title)) updates.title = str(d.title);

  // Place of origin as author fallback
  if (isEmpty(updates.author) && str(d.place_of_origin)) {
    updates.author = str(d.place_of_origin);
  }

  return updates;
}

function extractVa(raw) {
  const d = raw.data || raw;
  const updates = {};

  // _primaryDate is display string; productionDates has structured begin/end
  const prodDates = d.productionDates || [];
  const pd = prodDates[0]?.date || {};
  const year = bestYear(d._primaryDate, pd.earliest, pd.latest);
  if (year) updates.year = year;

  // Maker
  const maker = d._primaryMaker?.name;
  if (str(maker)) {
    updates.author = str(maker);
  }

  // Title
  const title = d._primaryTitle || (d.titles?.[0]?.title);
  if (str(title)) updates.title = str(title);

  // If still no author, try place
  if (isEmpty(updates.author) && str(d._primaryPlace)) {
    updates.author = str(d._primaryPlace);
  }

  return updates;
}

function extractRijks(raw) {
  const d = raw.data || raw;
  const updates = {};

  // Year from timespan
  const ts = d.produced_by?.timespan;
  if (ts) {
    const begin = str(ts.begin_of_the_begin).match(/^(\d{4})/)?.[1];
    const end   = str(ts.end_of_the_end).match(/^(\d{4})/)?.[1];
    const year  = bestYear(null, begin, end);
    if (year) updates.year = year;
  }

  // Title from identified_by
  const names = d.identified_by || [];
  const primary = names.find(n =>
    n.type === 'Name' &&
    n.classified_as?.some(c => c.id?.includes('300404670') || c.id?.includes('300417200'))
  ) || names.find(n => n.type === 'Name');
  if (primary?.content) updates.title = str(primary.content);

  // Artist from produced_by.referred_to_by (EN label)
  for (const ref of d.produced_by?.referred_to_by || []) {
    const isEN = ref.language?.some(l => l.id?.includes('300388277'));
    if (isEN && ref.content) {
      updates.author = str(ref.content).replace(/\s*\(.*?\)\s*$/, '').trim();
      break;
    }
  }
  // Fallback — parts
  if (isEmpty(updates.author)) {
    for (const part of d.produced_by?.part || []) {
      const name = part.referred_to_by?.find(r =>
        r.language?.some(l => l.id?.includes('300388277'))
      )?.content;
      if (name) { updates.author = str(name).replace(/\s*\(.*?\)\s*$/, '').trim(); break; }
    }
  }

  return updates;
}

function extractSmithsonian(raw) {
  const d = raw.data || raw;
  const ft = d.content?.freetext || {};
  const updates = {};

  // Date — freetext.date[0] ONLY.
  // indexedStructured.date is NOT reliably ordered begin→end in SI data
  // and produces inverted ranges like "c. 1930–1850". Avoid it.
  const dateDisplay = str(ft.date?.[0]?.content);
  if (dateDisplay) {
    const single = dateDisplay.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    if (single) updates.year = single[0];
  }

  // Creator
  const creator = str(ft.name?.[0]?.content);
  if (creator) updates.author = creator;

  // Title
  const title = str(d.title);
  if (title) updates.title = title;

  // Culture / place fallback
  if (isEmpty(updates.author)) {
    const place = str(ft.place?.[0]?.content || d.content?.indexedStructured?.place?.[0]);
    if (place) updates.author = place;
  }

  return updates;
}

function extractCooperHewitt(flat) {
  // CH files are flat (no .data wrapper)
  const updates = {};
  const ch = flat.raw || {};

  // Date can be "1890-1900" or "1890" or "ca. 1920"
  const date = str(flat.date || ch.date);
  const year = bestYear(date, null, null);
  if (year) updates.year = year;

  // Designer from participants
  const participants = ch.participants || [];
  const designer = participants.find(p => p?.person?.name)?.person?.name;
  if (str(designer)) updates.author = str(designer);

  // Title
  if (str(flat.title)) updates.title = str(flat.title);

  return updates;
}

// ── Raw file loader ───────────────────────────────────────────────────────────

// CooperHewitt files are saved with sequential counter names like
// "cooperhewitt-000000.json" rather than by the actual CH object ID.
// We build a one-time index: { "cooperhewitt-18065659": "cooperhewitt-000042.json" }
let chIndex = null;

function buildChIndex() {
  if (chIndex) return chIndex;
  console.log('  Building CooperHewitt filename index (one-time scan)...');
  chIndex = {};
  const dir = path.join(RAW_DIR, 'cooperhewitt');
  if (!fs.existsSync(dir)) return chIndex;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('.'));
  let scanned = 0;
  for (const filename of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'));
      // CH files are flat — the `id` field is the full "cooperhewitt-XXXXXXXX" DB id
      if (raw.id) chIndex[raw.id] = filename;
    } catch {
      // skip malformed
    }
    scanned++;
    if (scanned % 5000 === 0) console.log(`    ...scanned ${scanned} CH files`);
  }
  console.log(`  CH index built: ${Object.keys(chIndex).length} entries from ${scanned} files\n`);
  return chIndex;
}

function loadRaw(source, dbId) {
  if (source === 'cooperhewitt') {
    const index = buildChIndex();
    const filename = index[dbId];
    if (!filename) return null;
    try {
      return JSON.parse(fs.readFileSync(path.join(RAW_DIR, 'cooperhewitt', filename), 'utf8'));
    } catch { return null; }
  }

  // All other sources: file is named by the numeric part of the DB id
  const numericId = dbId.slice(source.length + 1); // strip "source-" prefix
  const filePath  = path.join(RAW_DIR, source, `${numericId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  BACKFILL — Recovering missing year / title / author      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌  Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  // Find every row that has at least one "unknown" field
  const targets = db.prepare(`
    SELECT id, source, title, author, year
    FROM artworks
    WHERE
      year   IN ('n.d.', '', 'Unknown') OR year IS NULL OR
      title  IN ('Untitled', '', 'Unknown') OR title IS NULL OR
      author IN ('Unknown', '', 'Untitled') OR author IS NULL
  `).all();

  console.log(`🔍  Found ${targets.length} rows with missing fields\n`);

  const update = db.prepare(`
    UPDATE artworks
    SET title = ?, author = ?, year = ?, year_sort = ?
    WHERE id = ?
  `);

  function yearToSort(y) {
    if (!y) return null;
    const m = y.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return m ? parseInt(m[0]) : null;
  }

  const EXTRACTORS = {
    met:          extractMet,
    artic:        extractArtic,
    va:           extractVa,
    rijks:        extractRijks,
    smithsonian:  extractSmithsonian,
    cooperhewitt: extractCooperHewitt,
  };

  const log = [];
  const stats = { scanned: 0, updated: 0, noRaw: 0, noImprovement: 0 };

  for (const row of targets) {
    stats.scanned++;

    const raw = loadRaw(row.source, row.id);
    if (!raw) {
      stats.noRaw++;
      if (stats.noRaw <= 5) console.log(`  ⚠  No raw file: ${row.id}`);
      continue;
    }

    const extractor = EXTRACTORS[row.source];
    if (!extractor) continue;

    const extracted = extractor(raw);

    // Only apply if actually better than what we have
    const newTitle  = (!isEmpty(extracted.title)  && isEmpty(row.title))  ? extracted.title  : row.title;
    const newAuthor = (!isEmpty(extracted.author) && isEmpty(row.author)) ? extracted.author : row.author;
    const newYear   = (!isEmpty(extracted.year)   && isEmpty(row.year))   ? extracted.year   : row.year;

    const changed =
      newTitle  !== row.title  ||
      newAuthor !== row.author ||
      newYear   !== row.year;

    if (!changed) {
      stats.noImprovement++;
      continue;
    }

    update.run(newTitle, newAuthor, newYear, yearToSort(newYear), row.id);
    stats.updated++;

    const entry = { id: row.id, source: row.source };
    if (newTitle  !== row.title)  entry.title  = { was: row.title,  now: newTitle  };
    if (newAuthor !== row.author) entry.author = { was: row.author, now: newAuthor };
    if (newYear   !== row.year)   entry.year   = { was: row.year,   now: newYear   };
    log.push(entry);

    if (stats.updated <= 20 || stats.updated % 100 === 0) {
      console.log(`  ✓ ${row.id}`);
      if (entry.title)  console.log(`      title:  "${entry.title.was}"  →  "${entry.title.now}"`);
      if (entry.author) console.log(`      author: "${entry.author.was}"  →  "${entry.author.now}"`);
      if (entry.year)   console.log(`      year:   "${entry.year.was}"  →  "${entry.year.now}"`);
    }
  }

  // Write log
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  BACKFILL COMPLETE                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`  Scanned:         ${stats.scanned}`);
  console.log(`  Updated:         ${stats.updated}`);
  console.log(`  No raw file:     ${stats.noRaw}`);
  console.log(`  No improvement:  ${stats.noImprovement}`);
  console.log(`\n  Log written to:  data/backfill-log.json`);
  console.log(`  (review log before next harvest to see what was changed)\n`);

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
