import 'dotenv/config';
import { runHarvest } from './engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// Usage:
//   npm run harvest GRAPHIC_DESIGN
//   npm run harvest PHOTOGRAPHY
//   npm run harvest PAINTING
//   npm run harvest PRINTS_AND_DRAWINGS
//   npm run harvest DECORATIVE_ARTS
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'GRAPHIC_DESIGN',
  'PHOTOGRAPHY',
  'PAINTING',
  'PRINTS_AND_DRAWINGS',
  'DECORATIVE_ARTS',
] as const;

const category = process.argv[2];

if (!category || !VALID_CATEGORIES.includes(category as any)) {
  console.error('\n❌ Invalid or missing category.');
  console.error(`\nUsage: npm run harvest <CATEGORY>\n`);
  console.error('Available categories:');
  for (const c of VALID_CATEGORIES) {
    console.error(`  npm run harvest ${c}`);
  }
  console.error('');
  process.exit(1);
}

// Warn on missing optional API keys
const OPTIONAL_KEYS: [string, string][] = [
  ['HARVARD_API_KEY',   'Harvard Art Museums'],
  ['EUROPEANA_API_KEY', 'Europeana'],
  ['RIJKS_API_KEY',     'Rijksmuseum (demo key used if missing)'],
  ['SMITHSONIAN_API_KEY', 'Smithsonian (anonymous access if missing)'],
];
for (const [key, name] of OPTIONAL_KEYS) {
  if (!process.env[key]) {
    console.warn(`⚠️  Warning: ${key} not set — ${name} may be rate-limited`);
  }
}

console.log('──────────────────────────────────────────────────────────────');
console.log(`🚀 STARTING HARVESTER: ${category}`);
console.log('──────────────────────────────────────────────────────────────');

runHarvest(category)
  .then(() => { console.log('\n✨ Harvest Complete!'); process.exit(0); })
  .catch((err) => { console.error('\n💀 Fatal Engine Error:', err); process.exit(1); });
