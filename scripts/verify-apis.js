#!/usr/bin/env node
// ─── API VERIFICATION SCRIPT ─────────────────────────────────────────────────
// Run: node verify_apis.js
// Tests uncertain API params from the mapping to confirm they work.
// Each test prints: source | param | status | item_count | sample_title

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const HARVARD_KEY = process.env.HARVARD_API_KEY;
const EUROPEANA_KEY = process.env.EUROPEANA_API_KEY;

function get(url, timeout=10000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => { try{req.destroy()}catch{} resolve(null); }, timeout);
    const req = https.get(url, {headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}}, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if(res.statusCode !== 200) { resolve({_status: res.statusCode}); return; }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

async function test(label, url, countFn, sampleFn) {
  const data = await get(url);
  if (!data) { console.log(`❌ ${label}: NULL response`); return; }
  if (data._status) { console.log(`❌ ${label}: HTTP ${data._status}`); return; }
  const count = countFn(data);
  const sample = sampleFn(data);
  const icon = count > 0 ? '✅' : '⚠️ ';
  console.log(`${icon} ${label}: ${count} items | "${(sample||'').slice(0,60)}"`);
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  API PARAMETER VERIFICATION');
  console.log('═══════════════════════════════════════════════════\n');

  // ── V&A THES IDs ──────────────────────────────────────────────────────────
  console.log('── V&A THESAURUS IDs ──');
  const VA_IDS = {
    'THES48943 (Posters)':        'THES48943',
    'THES48876 (Graphic Art)':    'THES48876',
    'THES49308 (Photographs)':    'THES49308',
    'THES48960 (Paintings)':      'THES48960',
    'THES48927 (Prints)':         'THES48927',
    'THES49144 (Drawings)':       'THES49144',
    'THES48852 (Ceramics)':       'THES48852',
    'THES49006 (Furniture)':      'THES49006',
    'THES48881 (Textiles)':       'THES48881',
    'THES48991 (Fashion)':        'THES48991',
    'THES48858 (Metalwork)':      'THES48858',
    'THES49232 (Jewellery)':      'THES49232',
  };
  for (const [label, id] of Object.entries(VA_IDS)) {
    await test(
      `V&A ${label}`,
      `https://api.vam.ac.uk/v2/objects/search?id_category=${id}&images_exist=true&page_size=5`,
      d => d.info?.record_count || 0,
      d => d.records?.[0]?._primaryTitle || ''
    );
    await new Promise(r => setTimeout(r, 300));
  }

  // ── LOC collection slugs ──────────────────────────────────────────────────
  console.log('\n── LOC COLLECTION SLUGS ──');
  const LOC_SLUGS = [
    'posters',
    'fsa-owi-color-photographs',
    'fsa-owi-black-and-white-negatives',
    'ansel-adams-manzanar',
    'gottlieb-collection',
    'william-p-gottlieb',
    'look-magazine',
    'fine-prints-american-before-1940',
    'prints-photographs',
    'historic-american-buildings-survey',
    'civil-war-glass-negatives',
  ];
  for (const slug of LOC_SLUGS) {
    await test(
      `LOC /${slug}/`,
      `https://www.loc.gov/collections/${slug}/?fo=json&c=5&sp=1`,
      d => d.pagination?.total || 0,
      d => d.results?.[0]?.title || ''
    );
    await new Promise(r => setTimeout(r, 1500));
  }

  // ── Harvard classification / worktype / technique ─────────────────────────
  if (!HARVARD_KEY) {
    console.log('\n── HARVARD: skipped (no HARVARD_API_KEY in .env.local) ──');
  } else {
    console.log('\n── HARVARD PARAMS ──');
    const HARVARD_TESTS = [
      ['classification=Photographs',        `classification=Photographs`],
      ['classification=Paintings',          `classification=Paintings`],
      ['classification=Prints',             `classification=Prints`],
      ['classification=Drawings',           `classification=Drawings`],
      ['classification=Posters',            `classification=Posters`],
      ['classification=Ceramics and Glass', `classification=Ceramics%20and%20Glass`],
      ['classification=Textiles and Fashion Arts', `classification=Textiles%20and%20Fashion%20Arts`],
      ['classification=Metalwork and Jewelry',     `classification=Metalwork%20and%20Jewelry`],
      ['classification=Furniture',          `classification=Furniture`],
      ['worktype=Poster',                   `worktype=Poster`],
      ['worktype=Photograph',               `worktype=Photograph`],
      ['worktype=Painting',                 `worktype=Painting`],
      ['worktype=Print',                    `worktype=Print`],
      ['technique=Etching',                 `technique=Etching`],
      ['technique=Lithography',             `technique=Lithography`],
      ['technique=Woodcut',                 `technique=Woodcut`],
      ['technique=Photography',             `technique=Photography`],
      ['technique=Photograph',              `technique=Photograph`],
    ];
    for (const [label, param] of HARVARD_TESTS) {
      await test(
        `Harvard ${label}`,
        `https://api.harvardartmuseums.org/object?${param}&size=5&apikey=${HARVARD_KEY}&hasimage=1`,
        d => d.info?.totalrecords || 0,
        d => d.records?.[0]?.title || ''
      );
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // ── ARTIC artwork_type_title exact values ─────────────────────────────────
  console.log('\n── ARTIC artwork_type_title VALUES ──');
  const ARTIC_TYPES = [
    'Poster', 'Painting', 'Photograph', 'Print',
    'Drawing and Watercolor on Paper', 'Textile', 'Ceramic', 'Glass', 'Metalwork',
  ];
  for (const type of ARTIC_TYPES) {
    await test(
      `ARTIC artwork_type_title=${type}`,
      `https://api.artic.edu/api/v1/artworks?query[term][is_public_domain]=true&query[term][artwork_type_title.keyword]=${encodeURIComponent(type)}&fields=id,title,artwork_type_title&limit=5&page=1`,
      d => d.pagination?.total || 0,
      d => d.data?.[0]?.title || ''
    );
    await new Promise(r => setTimeout(r, 600));
  }

  // ── NGA classification values ─────────────────────────────────────────────
  console.log('\n── NGA CLASSIFICATION VALUES ──');
  const NGA_TYPES = ['Painting', 'Print', 'Drawing', 'Photograph', 'Ceramic', 'Glass', 'Decorative Arts', 'Jewelry'];
  for (const cls of NGA_TYPES) {
    await test(
      `NGA classification=${cls}`,
      `https://api.nga.gov/art/tms/objects?classification=${encodeURIComponent(cls)}&offset=0&limit=5`,
      d => d.totalrecords || d.items?.length || 0,
      d => d.items?.[0]?.title || ''
    );
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Rijks type= values ────────────────────────────────────────────────────
  console.log('\n── RIJKS type= VALUES ──');
  const RIJKS_TYPES = ['affiche','schilderij','prent','tekening','foto','aquarel','aardewerk','glas','meubilair','textiel','zilverwerk','goud'];
  for (const type of RIJKS_TYPES) {
    await test(
      `Rijks type=${type}`,
      `https://www.rijksmuseum.nl/api/en/collection?key=0fiuZFh4&q=*&type=${type}&imgonly=true&ps=5&p=1`,
      d => d.count || 0,
      d => d.artObjects?.[0]?.title || ''
    );
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  DONE');
  console.log('═══════════════════════════════════════════════════\n');
}

run().catch(console.error);