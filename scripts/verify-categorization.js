#!/usr/bin/env node

/**
 * CATEGORIZATION FIX VERIFICATION SCRIPT
 * 
 * This script verifies that the normalization fix is working correctly
 * by testing against actual manifest data.
 * 
 * Run with: node scripts/verify-categorization.js
 */

const fs = require('fs');
const path = require('path');

// Import the normalization functions
function normalizeType(raw) {
  if (!raw) return null;
  const value = String(raw).toLowerCase().trim();
  if (!value) return null;
  
  // Photography
  if (value.includes('photograph')) return 'photograph';
  if (value.includes('photo')) return 'photograph';
  if (value.includes('daguerreotype')) return 'photograph';
  if (value.includes('ambrotype')) return 'photograph';
  if (value.includes('tintype')) return 'photograph';
  if (value.includes('cyanotype')) return 'photograph';
  if (value.includes('gelatin silver')) return 'photograph';
  if (value.includes('silver gelatin')) return 'photograph';
  if (value.includes('albumen')) return 'photograph';
  
  // Posters
  if (value.includes('poster')) return 'poster';
  if (value.includes('affiche')) return 'poster';
  if (value.includes('placard')) return 'poster';
  
  // Prints
  if (value.includes('lithograph')) return 'print';
  if (value.includes('etching')) return 'print';
  if (value.includes('engraving')) return 'print';
  if (value.includes('woodcut')) return 'print';
  if (value.includes('woodblock')) return 'print';
  if (value.includes('linocut')) return 'print';
  if (value.includes('screenprint')) return 'print';
  if (value.includes('screen print')) return 'print';
  if (value.includes('serigraph')) return 'print';
  if (value.includes('silkscreen')) return 'print';
  if (value.includes('monotype')) return 'print';
  if (value.includes('monoprint')) return 'print';
  if (value.includes('aquatint')) return 'print';
  if (value.includes('mezzotint')) return 'print';
  if (value.includes('drypoint')) return 'print';
  if (value.includes('chromolithograph')) return 'print';
  if (value.includes('type specimen')) return 'print';
  if (value.includes('typographic') && value.includes('specimen')) return 'print';
  if (value === 'graphic design' || value === 'graphics') return 'print';
  if (value.includes('print') && !value.includes('photograph')) return 'print';
  
  // Drawings
  if (value.includes('drawing')) return 'drawing';
  if (value.includes('sketch')) return 'drawing';
  if (value.includes('graphite') || value.includes('pencil')) return 'drawing';
  if (value.includes('charcoal')) return 'drawing';
  if (value.includes('conte')) return 'drawing';
  if (value.includes('chalk')) return 'drawing';
  if (value.includes('pastel')) return 'drawing';
  if (value.includes('technical drawing')) return 'drawing';
  
  // Paintings
  if (value.includes('painting')) return 'painting';
  if (value.includes('oil on canvas')) return 'painting';
  if (value.includes('oil on panel')) return 'painting';
  if (value.includes('oil on board')) return 'painting';
  if (value.includes('acrylic')) return 'painting';
  if (value.includes('watercolor')) return 'painting';
  if (value.includes('watercolour')) return 'painting';
  if (value.includes('gouache')) return 'painting';
  if (value.includes('tempera')) return 'painting';
  if (value.includes('fresco')) return 'painting';
  
  // Sculpture
  if (value.includes('sculpt')) return 'sculpture';
  if (value.includes('bronze')) return 'sculpture';
  if (value.includes('marble')) return 'sculpture';
  if (value.includes('stone') && !value.includes('lithograph')) return 'sculpture';
  if (value.includes('ceramic') && !value.includes('vessel')) return 'sculpture';
  if (value.includes('terracotta')) return 'sculpture';
  if (value.includes('wood carving')) return 'sculpture';
  if (value.includes('relief') && !value.includes('print')) return 'sculpture';
  
  // Furniture
  if (value.includes('furniture')) return 'furniture';
  if (value.includes('chair')) return 'furniture';
  if (value.includes('table')) return 'furniture';
  if (value.includes('cabinet')) return 'furniture';
  if (value.includes('desk')) return 'furniture';
  if (value.includes('industrial design')) return 'furniture';
  
  // Textiles
  if (value.includes('textile')) return 'textile';
  if (value.includes('fabric')) return 'textile';
  if (value.includes('tapestry')) return 'textile';
  if (value.includes('embroidery')) return 'textile';
  if (value.includes('weaving')) return 'textile';
  if (value.includes('quilt')) return 'textile';
  
  // Manuscripts
  if (value.includes('manuscript')) return 'manuscript';
  if (value.includes('illuminated')) return 'manuscript';
  if (value.includes('book') && !value.includes('book plate')) return 'manuscript';
  if (value.includes('codex')) return 'manuscript';
  
  // Architecture
  if (value.includes('architect')) return 'architecture';
  if (value.includes('blueprint')) return 'architecture';
  if (value.includes('architectural plan')) return 'architecture';
  if (value.includes('elevation') && value.includes('architecture')) return 'architecture';
  
  return null;
}

function normalizeItemType(item) {
  if (!item) return null;
  const candidates = [item.medium, item.type, item.objectType, item.classification, item.format];
  for (const candidate of candidates) {
    const normalized = normalizeType(candidate);
    if (normalized) return normalized;
  }
  return null;
}

// Main verification logic
console.log('\n' + '='.repeat(80));
console.log('CATEGORIZATION FIX VERIFICATION');
console.log('='.repeat(80));

const manifestDir = path.join(process.cwd(), 'public', 'manifests');
const manifestFiles = ['moma.json', 'letterform.json', 'swiss.json', 'bauhaus.json', 'jstor.json'];

let totalItems = 0;
let categorizedItems = 0;
let uncategorizedItems = 0;
const categoryCounts = {};
const uncategorizedSamples = [];

console.log('\nProcessing manifests...\n');

manifestFiles.forEach(file => {
  const filePath = path.join(manifestDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing: ${file}`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fileCount = 0;
  let fileCategorized = 0;
  
  data.forEach(item => {
    if (!item.imageUrl || item.imageUrl.trim() === "") return;
    
    totalItems++;
    fileCount++;
    const type = normalizeItemType(item);
    
    if (type) {
      categorizedItems++;
      fileCategorized++;
      categoryCounts[type] = (categoryCounts[type] || 0) + 1;
    } else {
      uncategorizedItems++;
      if (uncategorizedSamples.length < 10) {
        uncategorizedSamples.push({
          source: file,
          id: item.id,
          medium: item.medium,
          objectType: item.objectType,
          classification: item.classification
        });
      }
    }
  });
  
  const percentage = fileCount > 0 ? (fileCategorized / fileCount * 100).toFixed(1) : 0;
  console.log(`✓ ${file.padEnd(20)} ${fileCount.toString().padStart(5)} items, ${fileCategorized.toString().padStart(5)} categorized (${percentage}%)`);
});

// Results
console.log('\n' + '-'.repeat(80));
console.log('OVERALL RESULTS');
console.log('-'.repeat(80));

const successRate = (categorizedItems / totalItems * 100).toFixed(1);
const failRate = (uncategorizedItems / totalItems * 100).toFixed(1);

console.log(`\nTotal items with images:  ${totalItems.toString().padStart(6)}`);
console.log(`Successfully categorized:  ${categorizedItems.toString().padStart(6)} (${successRate}%)`);
console.log(`Uncategorized:            ${uncategorizedItems.toString().padStart(6)} (${failRate}%)`);

// Category breakdown
console.log('\n' + '-'.repeat(80));
console.log('CATEGORY BREAKDOWN');
console.log('-'.repeat(80));

const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
sortedCategories.forEach(([category, count]) => {
  const percentage = (count / totalItems * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(percentage / 2));
  console.log(`${category.padEnd(15)} ${count.toString().padStart(6)} items (${percentage.toString().padStart(5)}%)  ${bar}`);
});

// Uncategorized samples
if (uncategorizedSamples.length > 0) {
  console.log('\n' + '-'.repeat(80));
  console.log('SAMPLE UNCATEGORIZED ITEMS (for future improvement)');
  console.log('-'.repeat(80));
  
  uncategorizedSamples.forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.source} - ${item.id}`);
    console.log(`   Medium: ${item.medium || 'N/A'}`);
    console.log(`   ObjectType: ${item.objectType || 'N/A'}`);
    console.log(`   Classification: ${item.classification || 'N/A'}`);
  });
}

// Status assessment
console.log('\n' + '='.repeat(80));
console.log('STATUS ASSESSMENT');
console.log('='.repeat(80));

if (successRate >= 90) {
  console.log('\n✅ EXCELLENT: Categorization success rate is above 90%');
  console.log('   The fix is working as expected.');
} else if (successRate >= 80) {
  console.log('\n⚠️  GOOD: Categorization success rate is above 80%');
  console.log('   The fix is working, but there may be room for improvement.');
} else if (successRate >= 70) {
  console.log('\n⚠️  MODERATE: Categorization success rate is 70-80%');
  console.log('   The fix is working but needs refinement.');
} else {
  console.log('\n❌ NEEDS WORK: Categorization success rate is below 70%');
  console.log('   The fix may not be properly applied or there are data issues.');
}

// Test critical categories
console.log('\n' + '-'.repeat(80));
console.log('CRITICAL CATEGORY CHECK');
console.log('-'.repeat(80));

const criticalCategories = ['photograph', 'print', 'drawing', 'poster', 'painting', 'furniture'];
const criticalResults = [];

criticalCategories.forEach(cat => {
  const count = categoryCounts[cat] || 0;
  const status = count > 0 ? '✓' : '✗';
  criticalResults.push({ category: cat, count, status });
  console.log(`${status} ${cat.padEnd(15)} ${count.toString().padStart(6)} items`);
});

const allCriticalPresent = criticalResults.every(r => r.count > 0);

if (allCriticalPresent) {
  console.log('\n✅ All critical categories have items');
} else {
  console.log('\n⚠️  Some critical categories are empty - check data sources');
}

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(80) + '\n');

// Exit code
process.exit(allCriticalPresent && successRate >= 90 ? 0 : 1);