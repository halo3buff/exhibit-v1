import https from 'https';

function test(label, url, headers) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        console.log(`${label}: ${res.statusCode} | ${res.headers['content-type']?.slice(0,20)} | ${buf.length} bytes | ${buf.slice(0,4).toString('hex')}`);
        resolve();
      });
    });
    req.on('error', e => { console.log(`${label}: ERROR ${e.message}`); resolve(); });
    req.setTimeout(10000, () => { req.destroy(); console.log(`${label}: TIMEOUT`); resolve(); });
  });
}

const DR  = 'https://designreviewed.com/wp-content/uploads/2026/02/Graphische-Nachrichten-Vol-19-December-1940-scaled.webp';
const LFA = 'https://oa.letterformarchive.org/full/lfa_type_1379/lfa_type_1379_001.jpg';

// Test 1: Minimal headers
await test('DR  minimal ', DR,  { 'User-Agent': 'Mozilla/5.0' });
await test('LFA minimal ', LFA, { 'User-Agent': 'Mozilla/5.0' });

// Test 2: Full Chrome headers
const chrome = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'same-origin',
};
await test('DR  chrome  ', DR,  { ...chrome, 'Referer': 'https://designreviewed.com/' });
await test('LFA chrome  ', LFA, { ...chrome, 'Referer': 'https://oa.letterformarchive.org/' });

// Test 3: Chrome + sec-ch-ua headers
const chromeFull = {
  ...chrome,
  'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};
await test('DR  ch-ua   ', DR,  { ...chromeFull, 'Referer': 'https://designreviewed.com/' });
await test('LFA ch-ua   ', LFA, { ...chromeFull, 'Referer': 'https://oa.letterformarchive.org/' });
