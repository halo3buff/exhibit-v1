// src/pipeline/01-harvest/harvest-gallica.ts
//
// GALLICA (BnF) HARVEST — No API key required, completely open
//
// Gallica is the digital library of the Bibliothèque nationale de France.
// 6M+ digitised documents, strong on posters, illustrated books, magazines,
// type specimens, ephemera — especially pre-1940 French graphic design.
//
// Uses SRU (Search/Retrieve via URL) protocol — standard library search API.
// Endpoint: https://gallica.bnf.fr/SRU
// Max records per request: 50 (SRU standard)
// Returns XML — parsed with regex (no xml2js dependency needed)
//
// Run: npx tsx src/pipeline/01-harvest/harvest-gallica.ts

import fs from 'fs';
import path from 'path';

const OUT_DIR  = path.join('data', 'raw', 'gallica');
const BASE_URL = 'https://gallica.bnf.fr/SRU';
const MAX_RECORDS = 50; // SRU max per request

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchSru(query: string, startRecord: number, retries = 3): Promise<string | null> {
  const params = new URLSearchParams({
    operation:    'searchRetrieve',
    version:      '1.2',
    query,
    maximumRecords: String(MAX_RECORDS),
    startRecord:  String(startRecord),
    recordSchema: 'dc',
  });

  const url = `${BASE_URL}?${params}`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArtHarvester/2.0)', 'Accept': 'application/xml, text/xml' },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) { await sleep(10000); continue; }
      if (!res.ok) return null;
      return await res.text();
    } catch(e) {
      if (i < retries - 1) { await sleep(2000 * (i + 1)); continue; }
      return null;
    }
  }
  return null;
}

// Simple XML field extractor
function extractXmlField(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:dc:|oai_dc:)?${tag}[^>]*>([^<]+)<`, 'i'));
  return m ? m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&quot;/g, '"') : '';
}
function extractAllXmlFields(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:dc:|oai_dc:)?${tag}[^>]*>([^<]+)<`, 'gi');
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

// Extract Gallica image URL from identifier
// Gallica identifiers look like: https://gallica.bnf.fr/ark:/12148/btv1b10500001g
// High-res image: {ark}/f1.highres or {ark}/f1.jpg
function getImageUrl(identifier: string): string {
  if (!identifier.includes('gallica.bnf.fr')) return '';
  // Remove trailing slash
  const ark = identifier.replace(/\/$/, '');
  return `${ark}/f1.highres`;
}

// Parse total results from SRU response
function parseTotalResults(xml: string): number {
  const m = xml.match(/<(?:srw:)?numberOfRecords>(\d+)<\/(?:srw:)?numberOfRecords>/);
  return m ? parseInt(m[1]) : 0;
}

// Parse individual records from SRU DC response
function parseRecords(xml: string): Array<{title: string; author: string; year: string; imageUrl: string; url: string; type: string; subject: string[]}> {
  const records: any[] = [];
  // Split on record boundaries
  const recordMatches = xml.matchAll(/<(?:srw:)?record>[\s\S]*?<\/(?:srw:)?record>/g);

  for (const match of recordMatches) {
    const rec = match[0];
    const identifier = extractXmlField(rec, 'identifier');
    if (!identifier.includes('gallica.bnf.fr')) continue;

    const imageUrl = getImageUrl(identifier);
    if (!imageUrl) continue;

    const title   = extractXmlField(rec, 'title') || 'Untitled';
    const author  = extractXmlField(rec, 'creator') || extractXmlField(rec, 'contributor') || '';
    const dateStr = extractXmlField(rec, 'date') || '';
    const type    = extractXmlField(rec, 'type') || '';
    const subjects = extractAllXmlFields(rec, 'subject');

    const yearMatch = dateStr.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    const year = yearMatch ? yearMatch[0] : '';

    records.push({ title, author, year, imageUrl, url: identifier, type, subject: subjects });
  }

  return records;
}

const seen = new Set<string>();
let fileIndex = 0;
const seenPath = path.join(OUT_DIR, '.seen-ids.json');
if (fs.existsSync(seenPath)) {
  const ids = JSON.parse(fs.readFileSync(seenPath, 'utf8')) as string[];
  ids.forEach(id => seen.add(id));
  fileIndex = seen.size;
}

async function runQuery(desc: string, query: string, limit: number): Promise<{ saved: number }> {
  console.log(`\n📌 ${desc}`);
  let startRecord = 1;
  let saved       = 0;
  let totalResults = 99999;

  while (saved < limit && startRecord <= totalResults) {
    const xml = await fetchSru(query, startRecord);
    if (!xml) { console.log('   → No response'); break; }

    if (startRecord === 1) {
      totalResults = parseTotalResults(xml);
      console.log(`   Total available: ${totalResults.toLocaleString()}`);
    }

    const records = parseRecords(xml);
    if (!records.length) break;

    for (const rec of records) {
      // Derive ID from URL
      const arkId = rec.url.split('/').pop() || rec.url;
      const id = `gallica-${arkId}`;
      if (seen.has(id)) continue;

      const record = {
        id,
        source:   'gallica',
        title:    rec.title,
        author:   rec.author,
        year:     rec.year,
        imageUrl: rec.imageUrl,
        url:      rec.url,
        type:     rec.type,
        subject:  rec.subject,
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `gallica-${String(fileIndex++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      saved++;
    }

    startRecord += MAX_RECORDS;
    process.stdout.write(`\r   record:${startRecord} saved:${saved}/${Math.min(limit, totalResults)}  `);
    await sleep(300);
  }

  console.log(`\n   ✓ saved:${saved}`);
  fs.writeFileSync(seenPath, JSON.stringify([...seen]));
  return { saved };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  GALLICA (BnF) HARVEST — No API Key Required             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // SRU CQL queries — dc.type, dc.subject, bib.title all work
  const tasks = [
    { desc: 'Affiches (Posters)',
      query: 'dc.type all "estampe" and dc.subject all "affiche"',          limit: 4000 },
    { desc: 'Illustrated books & magazines',
      query: 'dc.type all "fascicule" and dc.subject any "graphisme illustration"', limit: 3000 },
    { desc: 'Art Nouveau & Art Deco posters',
      query: 'dc.subject any "art nouveau art déco" and dc.type all "estampe"', limit: 2000 },
    { desc: 'Type specimens & typography',
      query: 'dc.subject any "typographie caractères" and dc.type all "monographie"', limit: 1500 },
    { desc: 'Lithographs',
      query: 'dc.type all "estampe" and dc.subject all "lithographie"',     limit: 2000 },
    { desc: 'Advertisements & ephemera',
      query: 'dc.subject any "publicité réclame" and dc.type all "image fixe"', limit: 2000 },
    { desc: 'Drawings & illustrations',
      query: 'dc.subject any "dessin illustration" and dc.type all "image fixe"', limit: 2000 },
    { desc: 'Photography',
      query: 'dc.type all "image fixe" and dc.subject all "photographie"',  limit: 2000 },
    { desc: 'Graphic design general',
      query: 'dc.subject any "graphisme communication visuelle"',            limit: 1500 },
  ];

  let totalSaved = 0;
  for (const t of tasks) {
    const { saved } = await runQuery(t.desc, t.query, t.limit);
    totalSaved += saved;
    if (totalSaved >= 20000) { console.log('\n   20,000 target reached ✓'); break; }
    await sleep(1000);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total saved: ${totalSaved.toLocaleString()}`);
  console.log('   Next steps:');
  console.log("   1. Add 'gallica' to SourceName in src/harvester/types.ts");
  console.log('   2. npx tsx src/pipeline/02-transform/02-transform-gallica.ts');
  console.log('   3. npx tsx src/pipeline/03-load/03-load-gallica.ts');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
