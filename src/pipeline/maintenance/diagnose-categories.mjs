// src/scripts/diagnose-categories.mjs
// Shows the raw classification fields for a sample of items in each category.
// Run this so we can see exactly what museums are sending and fix the classifier.
//
// Usage:
//   node src/scripts/diagnose-categories.mjs
//   node src/scripts/diagnose-categories.mjs --category "Graphic Design"
//   node src/scripts/diagnose-categories.mjs --source rijks

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB_PATH = path.join(ROOT, 'artworks.db');
const RAW_DIR = path.join(ROOT, 'data', 'raw');

const CAT_FILTER = (() => { const i = process.argv.indexOf('--category'); return i !== -1 ? process.argv[i+1] : null; })();
const SRC_FILTER = (() => { const i = process.argv.indexOf('--source');   return i !== -1 ? process.argv[i+1] : null; })();

const db = new Database(DB_PATH, { readonly: true });

function getDbId(source, raw) {
  const data = raw.data || raw;
  switch (source) {
    case 'met':         return `met-${raw.id || data.objectID}`;
    case 'artic':       return `artic-${raw.id || data.id}`;
    case 'va':          return `va-${raw.id || data.systemNumber}`;
    case 'smithsonian': return `smithsonian-${raw.id || data.id}`;
    case 'rijks':       return `rijks-${raw.id}`;
  }
}

function extractFields(source, data) {
  switch (source) {
    case 'met': return {
      objectName:     data.objectName,
      department:     data.department,
      medium:         data.medium,
      classification: data.classification,
      title:          data.title,
    };
    case 'artic': return {
      artwork_type_title:   data.artwork_type_title,
      classification_title: data.classification_title,
      department_title:     data.department_title,
      medium_display:       data.medium_display?.slice(0, 80),
      title:                data.title,
    };
    case 'va': return {
      objectType:      data.objectType,
      _primaryCategory: data._primaryCategory,
      materialsAndTechniques: data.materialsAndTechniques?.slice(0, 80),
      title:           data._primaryTitle,
    };
    case 'smithsonian': {
      const idx = data.content?.indexedStructured;
      const ft  = data.content?.freetext;
      return {
        unitCode:     data.unitCode,
        object_type_indexed: idx?.object_type,
        object_type_freetext: ft?.objectType?.[0]?.content,
        physicalDescription: ft?.physicalDescription?.[0]?.content?.slice(0, 80),
        title:        data.title,
      };
    }
    case 'rijks': return {
      _harvestType:  data._harvestType,
      technique:     (data.produced_by?.technique || [])
        .map(t => (t.identified_by || []).map(i => i?.content).join(', ')).join(' | ').slice(0, 80),
      title:         (data.identified_by || []).find(x => x?.type === 'Name')?.content,
    };
  }
}

const sources = SRC_FILTER ? [SRC_FILTER] : ['met', 'artic', 'va', 'smithsonian', 'rijks'];
const SAMPLE_SIZE = 15;

for (const source of sources) {
  const dir = path.join(RAW_DIR, source);
  if (!fs.existsSync(dir)) continue;

  // Get items from DB that are in the target category for this source
  const query = CAT_FILTER
    ? `SELECT id, title, mainCategory, subCategory FROM artworks WHERE source=? AND mainCategory=? LIMIT 200`
    : `SELECT id, title, mainCategory, subCategory FROM artworks WHERE source=? LIMIT 200`;
  const params = CAT_FILTER ? [source, CAT_FILTER] : [source];
  const dbItems = db.prepare(query).all(...params);

  if (dbItems.length === 0) continue;

  // Sample evenly across subcategories
  const bySub = {};
  for (const item of dbItems) {
    if (!bySub[item.subCategory]) bySub[item.subCategory] = [];
    bySub[item.subCategory].push(item);
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`SOURCE: ${source.toUpperCase()}${CAT_FILTER ? ` | CATEGORY: ${CAT_FILTER}` : ''}`);
  console.log(`${'═'.repeat(70)}`);

  for (const [sub, items] of Object.entries(bySub)) {
    // Take up to 5 samples per subcategory
    const samples = items.slice(0, 5);
    console.log(`\n  ── ${sub} (${items.length} total) ──`);

    for (const item of samples) {
      // Find raw file
      const rawId = item.id.replace(`${source}-`, '');
      const rawPath = path.join(dir, `${rawId}.json`);
      if (!fs.existsSync(rawPath)) {
        console.log(`    [${item.id}] NO RAW FILE`);
        continue;
      }
      const raw  = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
      const data = raw.data || raw;
      const fields = extractFields(source, data);

      console.log(`\n    [${item.id}] "${String(item.title || '').slice(0, 50)}"`);
      for (const [k, v] of Object.entries(fields)) {
        if (v && String(v).trim() && v !== 'null' && v !== 'undefined') {
          const val = Array.isArray(v) ? v.join(', ') : String(v);
          console.log(`      ${k.padEnd(28)} = ${val.slice(0, 80)}`);
        }
      }
    }
  }
}

db.close();
