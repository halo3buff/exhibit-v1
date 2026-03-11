/**
 * ANALYZE UNMAPPED ITEMS
 * Shows what's in the 3,765 unmapped items
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./artworks.db', { readonly: true });

console.log('═══════════════════════════════════════════════════');
console.log('  UNMAPPED ITEMS ANALYSIS');
console.log('═══════════════════════════════════════════════════\n');

// Count unmapped by source
console.log('=== UNMAPPED BY SOURCE ===');
const unmappedBySource = db.prepare(`
  SELECT source, COUNT(*) as count
  FROM artworks
  WHERE type IS NULL
  GROUP BY source
  ORDER BY count DESC
`).all();

unmappedBySource.forEach(({ source, count }) => {
  console.log(`${source.padEnd(35)} ${count}`);
});

// Get sample of unmapped items with their fields
console.log('\n=== SAMPLE UNMAPPED ITEMS (10 random) ===');
const samples = db.prepare(`
  SELECT title, source, classification, objectType, medium
  FROM artworks
  WHERE type IS NULL
  ORDER BY RANDOM()
  LIMIT 10
`).all();

samples.forEach((item, i) => {
  console.log(`\n${i+1}. ${item.title.substring(0, 60)}`);
  console.log(`   Source: ${item.source}`);
  console.log(`   Classification: "${item.classification || '(empty)'}"`);
  console.log(`   ObjectType: "${item.objectType || '(empty)'}"`);
  console.log(`   Medium: "${item.medium ? item.medium.substring(0, 50) : '(empty)'}"`);
});

// Get distinct values from unmapped items
console.log('\n\n=== DISTINCT CLASSIFICATIONS (unmapped items) ===');
const distinctClass = db.prepare(`
  SELECT DISTINCT classification, COUNT(*) as count
  FROM artworks
  WHERE type IS NULL AND classification != ''
  GROUP BY classification
  ORDER BY count DESC
  LIMIT 20
`).all();

distinctClass.forEach(({ classification, count }) => {
  console.log(`${classification.padEnd(40)} ${count}`);
});

console.log('\n=== DISTINCT OBJECT TYPES (unmapped items) ===');
const distinctObj = db.prepare(`
  SELECT DISTINCT objectType, COUNT(*) as count
  FROM artworks
  WHERE type IS NULL AND objectType != ''
  GROUP BY objectType
  ORDER BY count DESC
  LIMIT 20
`).all();

distinctObj.forEach(({ objectType, count }) => {
  console.log(`${objectType.padEnd(40)} ${count}`);
});

db.close();

console.log('\n═══════════════════════════════════════════════════\n');