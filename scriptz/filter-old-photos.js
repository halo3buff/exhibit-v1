/**
 * FILTER OUT PRE-1930 PHOTOGRAPHS
 * PROPERLY HANDLES: ranges, circa dates, century descriptions
 */

const fs = require('fs');
const path = require('path');

const manifestDir = path.join(__dirname, '../public/manifests');
const manifests = ['moma.json', 'met.json', 'artic.json', 'va.json', 'cooperhewitt.json', 'zurich.json'];

function extractEarliestYear(yearString) {
  if (!yearString) return null;
  
  const yearStr = String(yearString).toLowerCase();
  
  // Handle century descriptions
  if (yearStr.includes('18th century') || yearStr.includes('eighteenth century')) return 1700;
  if (yearStr.includes('17th century') || yearStr.includes('seventeenth century')) return 1600;
  if (yearStr.includes('16th century') || yearStr.includes('sixteenth century')) return 1500;
  if (yearStr.includes('15th century') || yearStr.includes('fifteenth century')) return 1400;
  if (yearStr.includes('19th century') || yearStr.includes('nineteenth century')) {
    // Check for early/late qualifiers
    if (yearStr.includes('late 19th')) return 1870;
    if (yearStr.includes('mid 19th') || yearStr.includes('middle 19th')) return 1850;
    if (yearStr.includes('early 19th')) return 1800;
    return 1800; // Default to early if not specified
  }
  if (yearStr.includes('20th century') || yearStr.includes('twentieth century')) {
    if (yearStr.includes('late 20th')) return 1970;
    if (yearStr.includes('mid 20th') || yearStr.includes('middle 20th')) return 1950;
    if (yearStr.includes('early 20th')) return 1900;
    return 1900;
  }
  if (yearStr.includes('21st century')) return 2000;
  
  // Extract all 4-digit years from the string
  const yearMatches = yearStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
  
  if (yearMatches && yearMatches.length > 0) {
    // Return the EARLIEST year (in case of ranges like "1850-1855")
    const years = yearMatches.map(y => parseInt(y, 10));
    return Math.min(...years);
  }
  
  // Handle decade formats like "1970s"
  const decadeMatch = yearStr.match(/\b(19[0-9]0)s\b/);
  if (decadeMatch) {
    return parseInt(decadeMatch[1], 10);
  }
  
  return null;
}

function isPhotograph(item) {
  const classification = String(item.classification || '').toLowerCase();
  const objectType = String(item.objectType || '').toLowerCase();
  const medium = String(item.medium || item.Medium || '').toLowerCase();
  
  return classification.includes('photograph') ||
         objectType.includes('photograph') ||
         medium.includes('photograph') ||
         medium.includes('gelatin silver') ||
         medium.includes('daguerreotype') ||
         medium.includes('albumen') ||
         medium.includes('ambrotype') ||
         medium.includes('tintype') ||
         medium.includes('calotype') ||
         medium.includes('cyanotype') ||
         medium.includes('photogravure');
}

console.log('═══════════════════════════════════════════════════');
console.log('  FILTERING OUT PRE-1930 PHOTOGRAPHS');
console.log('═══════════════════════════════════════════════════\n');

let totalRemoved = 0;
let totalKept = 0;
const removalSamples = [];

for (const file of manifests) {
  const filePath = path.join(manifestDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipping ${file} (not found)`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const originalCount = data.length;
  
  const filtered = data.filter(item => {
    // If it's not a photograph, keep it
    if (!isPhotograph(item)) {
      return true;
    }
    
    // It's a photograph - check the year
    const year = extractEarliestYear(item.year);
    
    // If we can't extract a year, keep it (assume modern)
    if (year === null) {
      return true;
    }
    
    // Remove if before 1930
    if (year < 1930) {
      // Log some examples for verification
      if (removalSamples.length < 10) {
        removalSamples.push({
          title: item.title,
          year: item.year,
          parsed: year,
          source: file
        });
      }
      return false;
    }
    
    return true;
  });
  
  const removed = originalCount - filtered.length;
  totalRemoved += removed;
  totalKept += filtered.length;
  
  // Write filtered data back
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
  
  console.log(`  ${file.padEnd(20)} ${originalCount} → ${filtered.length} (removed: ${removed})`);
}

console.log('\n═══════════════════════════════════════════════════');
console.log(`  ✅ COMPLETE`);
console.log(`  Removed: ${totalRemoved} pre-1930 photographs`);
console.log(`  Kept:    ${totalKept} items`);
console.log('═══════════════════════════════════════════════════');

if (removalSamples.length > 0) {
  console.log('\n  Sample removals (for verification):');
  removalSamples.forEach(s => {
    console.log(`    "${s.title.substring(0, 40)}..." | Year: "${s.year}" → ${s.parsed} | ${s.source}`);
  });
}

console.log('\n  Next: Run node scripts/build-database.js to rebuild\n');