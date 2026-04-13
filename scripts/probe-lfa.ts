import https from 'https';

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://oa.letterformarchive.org/' },
    }, (res) => {
      console.log(`STATUS ${res.statusCode} — ${url}`);
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ _raw: body.slice(0, 300) }); }
      });
    });
    req.on('error', (e: any) => { console.error(`ERROR: ${e.message} — ${url}`); resolve(null); });
    req.setTimeout(30000, () => { req.destroy(); resolve(null); });
  });
}

async function main() {
  // 1. Items endpoint — small limit first to see structure
  console.log('\n── /api/items?limit=2&offset=0 ──');
  const items2 = await fetchJson('https://oa.letterformarchive.org/api/items?limit=2&offset=0');
  console.log(JSON.stringify(items2, null, 2).slice(0, 1000));

  // 2. Items endpoint — what does rowCount say vs a big limit?
  console.log('\n── /api/items?limit=9999&offset=0 (just count fields) ──');
  const itemsBig = await fetchJson('https://oa.letterformarchive.org/api/items?limit=9999&offset=0');
  if (itemsBig?.rows) {
    console.log('rows.length:', itemsBig.rows.length);
    console.log('rowCount field:', itemsBig.rowCount);
    console.log('total field:', itemsBig.total);
    console.log('First item keys:', Object.keys(itemsBig.rows[0] ?? {}));
  } else {
    console.log(JSON.stringify(itemsBig).slice(0, 500));
  }

  // 3. Images endpoint — how many?
  console.log('\n── /api/images (count only) ──');
  const images = await fetchJson('https://oa.letterformarchive.org/api/images');
  if (images?.rows) {
    console.log('images rows.length:', images.rows.length);
    console.log('First image keys:', Object.keys(images.rows[0] ?? {}));
    console.log('Sample:', JSON.stringify(images.rows[0]).slice(0, 200));
  } else {
    console.log(JSON.stringify(images).slice(0, 500));
  }

  // 4. Try other potential endpoints
  for (const ep of ['/api/works', '/api/collection', '/api/search?q=&limit=2']) {
    const r = await fetchJson(`https://oa.letterformarchive.org${ep}`);
    console.log(`\n── ${ep} ──`);
    console.log(JSON.stringify(r).slice(0, 300));
  }
}

main().catch(console.error);