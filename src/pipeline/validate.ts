// src/pipeline/validate.ts
// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE PHASE: Quality-gate processed ArchiveItems before load.
//
// Usage:
//   npm run validate            — report only, exit 1 if fatal errors found
//   npm run validate -- --fix   — move fatally-invalid items to data/processed/_rejected/
//
// Run between transform and load. Fatal rules (missing-field, html-injection,
// image-url-not-allowed) block load; warning rules (implausible-year,
// invalid-link) are reported but do not block.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const REJECTED_DIR  = path.join(PROCESSED_DIR, '_rejected');
const FIX_MODE      = process.argv.includes('--fix');

// Keep in sync with src/app/api/img/route.js ALLOWED_DOMAINS
const ALLOWED_DOMAINS = new Set([
  'images.metmuseum.org',
  'collectionapi.metmuseum.org',
  'www.artic.edu',
  'iiif.micr.io',
  'framemark.vam.ac.uk',
  'collections.vam.ac.uk',
  'fids.si.edu',
  'ids.lib.harvard.edu',
  'media.smithsonianmag.com',
  'media.si.edu',
  'americanart.si.edu',
  'npg.si.edu',
  'edan.si.edu',
  'ids.si.edu',
  'images.collection.cooperhewitt.org',
  'www.rijksmuseum.nl',
  'lh3.rijksmuseum.nl',
  'lh5.rijksmuseum.nl',
  'lh6.rijksmuseum.nl',
  'lh3.googleusercontent.com',
  'lh5.ggpht.com',
  'lh6.ggpht.com',
  'lh3.ggpht.com',
  'iiif.nypl.org',
  'images.nypl.org',
  'digitalcollections.nypl.org',
  'iiif.digitalcommonwealth.org',
  'gallica.bnf.fr',
  'iiif.gallicarama.bnf.fr',
  'europeana.eu',
  'api.europeana.eu',
  'iiif.europeana.eu',
  'thumbnail.europeana.eu',
  'images.europeana.eu',
  'oa.letterformarchive.org',
  'letterformarchive.org',
  'designreviewed.com',
  'designarchives.aiga.org',
  'api.are.na',
  'd2w9rnfcy7mm78.cloudfront.net',
  'payload.are.na',
  'arena-attachments.s3.amazonaws.com',
  'arena-attachments.s3.us-east-1.amazonaws.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
]);

type RuleName =
  | 'missing-field'
  | 'html-injection'
  | 'image-url-not-allowed'
  | 'implausible-year'
  | 'invalid-link';

interface ValidationError {
  rule: RuleName;
  detail: string;
}

interface ItemResult {
  file: string;
  id: string;
  source: string;
  errors: ValidationError[];
}

const HTML_RE   = /<[^>]+>/;
const MIN_YEAR  = 800;
const MAX_YEAR  = new Date().getFullYear() + 1;

const FATAL_RULES = new Set<RuleName>([
  'missing-field',
  'html-injection',
  'image-url-not-allowed',
]);

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_DOMAINS.has(host)) return true;
    for (const allowed of ALLOWED_DOMAINS) {
      if (host.endsWith(`.${allowed}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function extractYearNumber(year: string): number | null {
  // Match any 4-digit number — catches ranges like "1850-1880" (takes first)
  const match = year.match(/\b([0-9]{3,4})\b/);
  return match ? parseInt(match[1]) : null;
}

function validateItem(item: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  // H9: required fields must be present and non-empty strings
  const required: string[] = ['id', 'title', 'author', 'year', 'imageUrl', 'link', 'mainCategory', 'source'];
  for (const field of required) {
    const val = item[field];
    if (!val || typeof val !== 'string' || !val.trim()) {
      errors.push({ rule: 'missing-field', detail: `"${field}" is missing or empty` });
    }
  }

  // H9: no HTML tags in text fields (XSS / injection guard)
  const textFields: string[] = ['title', 'author', 'classification', 'medium', 'department'];
  for (const field of textFields) {
    const val = item[field];
    if (typeof val === 'string' && HTML_RE.test(val)) {
      errors.push({ rule: 'html-injection', detail: `"${field}" contains HTML: ${val.slice(0, 100)}` });
    }
  }

  // H9: year plausibility — outside 800–(current year + 1) is almost certainly a parse error
  const year = item['year'];
  if (typeof year === 'string' && year && year !== 'n.d.') {
    const yearNum = extractYearNumber(year);
    if (yearNum !== null && (yearNum < MIN_YEAR || yearNum > MAX_YEAR)) {
      errors.push({
        rule: 'implausible-year',
        detail: `year "${year}" parsed as ${yearNum}, outside ${MIN_YEAR}–${MAX_YEAR}`,
      });
    }
  }

  // H10: imageUrl must be in the SSRF allowlist (same list as /api/img)
  const imageUrl = item['imageUrl'];
  if (typeof imageUrl === 'string' && imageUrl) {
    if (!isAllowedImageUrl(imageUrl)) {
      errors.push({
        rule: 'image-url-not-allowed',
        detail: `imageUrl domain not in SSRF allowlist: ${imageUrl}`,
      });
    }
  }

  // H9: link must be a parseable URL
  const link = item['link'];
  if (typeof link === 'string' && link) {
    try { new URL(link); } catch {
      errors.push({ rule: 'invalid-link', detail: `link is not a valid URL: ${link}` });
    }
  }

  return errors;
}

function isFatal(errors: ValidationError[]): boolean {
  return errors.some(e => FATAL_RULES.has(e.rule));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  VALIDATE PHASE — Quality-gating Processed Items         ║');
  console.log(`║  Mode: ${FIX_MODE ? '--fix (move rejected items)        ' : 'report only                       '}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error('❌ data/processed/ not found. Run transform first.');
    process.exit(1);
  }

  const files = fs.readdirSync(PROCESSED_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('audit-'));

  if (files.length === 0) {
    console.error('❌ No processed item files found. Run transform first.');
    process.exit(1);
  }

  console.log(`📦 Validating ${files.length} processed items...\n`);

  const results: ItemResult[] = [];
  let parseErrors = 0;

  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    let item: Record<string, unknown>;
    try {
      item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      console.warn(`⚠️  Parse error: ${file}`);
      parseErrors++;
      continue;
    }

    const errors = validateItem(item);
    if (errors.length > 0) {
      results.push({
        file,
        id:     String(item['id']   ?? '(none)'),
        source: String(item['source'] ?? '(unknown)'),
        errors,
      });
    }
  }

  // ── Summary by rule ──────────────────────────────────────────────────────
  const byRule = new Map<RuleName, number>();
  let fatalCount = 0;

  for (const r of results) {
    if (isFatal(r.errors)) fatalCount++;
    for (const e of r.errors) {
      byRule.set(e.rule, (byRule.get(e.rule) ?? 0) + 1);
    }
  }

  const clean = files.length - results.length - parseErrors;

  console.log('📊 Validation Results:');
  console.log(`   Total files      : ${files.length}`);
  console.log(`   ✅ Clean         : ${clean}`);
  console.log(`   ⚠️  With issues  : ${results.length}`);
  console.log(`   🚫 Fatal (block) : ${fatalCount}`);
  if (parseErrors > 0) console.log(`   ❌ Parse errors  : ${parseErrors}`);

  if (byRule.size > 0) {
    console.log('\n🔍 Issues by rule:');
    for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
      const tag = FATAL_RULES.has(rule) ? '🚫' : '⚠️ ';
      console.log(`   ${tag} ${rule.padEnd(28)} ${count}`);
    }
  }

  // ── Detailed report for fatal items ──────────────────────────────────────
  const fatal = results.filter(r => isFatal(r.errors));
  if (fatal.length > 0) {
    console.log(`\n🚫 Fatal items (${fatal.length}):`);
    const shown = fatal.slice(0, 25);
    for (const r of shown) {
      console.log(`\n   ${r.source} / ${r.id}  (${r.file})`);
      for (const e of r.errors.filter(e => FATAL_RULES.has(e.rule))) {
        console.log(`      • [${e.rule}] ${e.detail}`);
      }
    }
    if (fatal.length > 25) {
      console.log(`\n   … and ${fatal.length - 25} more (run with --fix to quarantine all)`);
    }
  }

  // ── Warnings (non-fatal) ──────────────────────────────────────────────────
  const warnings = results.filter(r => !isFatal(r.errors));
  if (warnings.length > 0) {
    const sample = warnings.slice(0, 10);
    console.log(`\n⚠️  Warning-only items (${warnings.length}, sample of ${sample.length}):`);
    for (const r of sample) {
      console.log(`   ${r.source} / ${r.id}: ${r.errors.map(e => e.rule).join(', ')}`);
    }
  }

  // ── Fix mode: quarantine fatal items ─────────────────────────────────────
  if (FIX_MODE && fatal.length > 0) {
    if (!fs.existsSync(REJECTED_DIR)) fs.mkdirSync(REJECTED_DIR, { recursive: true });

    let moved = 0;
    for (const r of fatal) {
      const src  = path.join(PROCESSED_DIR, r.file);
      const dest = path.join(REJECTED_DIR, r.file);
      try {
        fs.renameSync(src, dest);
        moved++;
      } catch (e: any) {
        console.warn(`⚠️  Could not move ${r.file}: ${e.message}`);
      }
    }
    console.log(`\n✅ Moved ${moved} rejected items → data/processed/_rejected/`);
    console.log('   Re-run validate (without --fix) to confirm 0 fatal errors before loading.');
  }

  // ── Write audit report ────────────────────────────────────────────────────
  const reportPath = path.join(PROCESSED_DIR, 'audit-validate.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp:   new Date().toISOString(),
    totalFiles:  files.length,
    clean,
    withIssues:  results.length,
    fatal:       fatalCount,
    parseErrors,
    byRule:      Object.fromEntries(byRule),
    items:       results,
  }, null, 2));
  console.log(`\n📄 Full report saved → data/processed/audit-validate.json`);

  console.log('\n╚═══════════════════════════════════════════════════════════╝');

  if (fatalCount > 0 && !FIX_MODE) {
    console.log(`\n❌ ${fatalCount} fatal item(s) found. Fix with: npm run validate -- --fix`);
    process.exit(1);
  } else if (fatalCount === 0) {
    console.log('\n✅ All items passed validation. Safe to load.');
  }
}

main().catch(console.error);
