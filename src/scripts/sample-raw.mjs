// src/scripts/sample-raw.mjs
// Dumps 15 complete raw JSON entries from each source.
// Run: node src/scripts/sample-raw.mjs
// Output: raw-samples.json in project root

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const OUT     = path.join(ROOT, 'raw-samples.json');

const SAMPLE = 15;
const sources = ['met', 'artic', 'va', 'smithsonian', 'rijks'];
const output  = {};

for (const source of sources) {
  const dir = path.join(RAW_DIR, source);
  if (!fs.existsSync(dir)) { console.log(`skip ${source}`); continue; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  // Spread picks across the whole folder, not just the first 15
  const step    = Math.floor(files.length / SAMPLE);
  const sampled = Array.from({ length: SAMPLE }, (_, i) => files[i * step]);

  output[source] = sampled.map(file => {
    try {
      const raw  = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      return raw.data || raw;
    } catch { return null; }
  }).filter(Boolean);

  console.log(`${source}: sampled ${output[source].length} files`);
}

fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`\n✅ raw-samples.json written (${kb} KB)`);
