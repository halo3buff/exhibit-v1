import fs from 'fs';
import path from 'path';

const CH_DIR = path.join('data', 'raw', 'cooperhewitt');
const files  = fs.readdirSync(CH_DIR).filter(f => f.endsWith('.json')).slice(0, 5);

for (const f of files) {
  const raw = JSON.parse(fs.readFileSync(path.join(CH_DIR, f), 'utf8'));
  const ch  = raw.raw || {};
  console.log(`\n--- ${f} ---`);
  console.log('type value:', JSON.stringify(ch.type));
  console.log('type typeof:', typeof ch.type);
  console.log('medium:', raw.medium);
}
