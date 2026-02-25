import 'dotenv/config'; 
import { runHarvest } from './engine.js';

const category = process.argv[2] || 'GRAPHIC_DESIGN';

console.log('--------------------------------------------------');
console.log(`🚀 STARTING HARVESTER: ${category}`);
console.log('--------------------------------------------------');

// Validate that critical environment variables are present
if (!process.env.HARVARD_API_KEY) {
  console.warn('⚠️  Warning: HARVARD_API_KEY is not set in .env');
}

runHarvest(category)
  .then(() => {
    console.log('\n✨ Global Harvest Complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💀 Fatal Engine Error:', err);
    process.exit(1);
  });