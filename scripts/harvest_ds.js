/**
 * DESIGN REVIEWED — AUTO DETECT HARVESTER
 * No assumptions about endpoint structure.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, 'design_reviewed_full.json');

async function harvest() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const harvested = [];

  console.log('Opening archive...');

  // Intercept ALL JSON responses
  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      const contentType = headers['content-type'] || '';

      if (!contentType.includes('application/json')) return;

      const url = response.url();
      const data = await response.json();

      // Look for anything that looks like a collection
      if (data && typeof data === 'object') {

        // Case 1: Standard Squarespace items
        if (Array.isArray(data.items)) {
          data.items.forEach(item => {
            const image =
              item.assetUrl ||
              item?.assets?.[0]?.url ||
              item?.asset?.url;

            if (!image) return;

            harvested.push({
              title: item.title || 'Untitled',
              imageUrl: image.split('?')[0] + '?format=original',
              link: item.fullUrl
                ? `https://designreviewed.com${item.fullUrl}`
                : 'https://designreviewed.com/design-archive'
            });
          });
        }

        // Case 2: Search-based response
        if (Array.isArray(data.results)) {
          data.results.forEach(item => {
            const image =
              item.assetUrl ||
              item?.assets?.[0]?.url ||
              item?.asset?.url;

            if (!image) return;

            harvested.push({
              title: item.title || 'Untitled',
              imageUrl: image.split('?')[0] + '?format=original',
              link: item.fullUrl
                ? `https://designreviewed.com${item.fullUrl}`
                : 'https://designreviewed.com/design-archive'
            });
          });
        }
      }

    } catch (err) {}
  });

  await page.goto('https://designreviewed.com/design-archive', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Aggressive scroll trigger
  console.log('Triggering dynamic load...');
  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));
  }

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();

  const unique = Array.from(
    new Map(harvested.map(i => [i.imageUrl, i])).values()
  );

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2));

  console.log(`\n✅ COMPLETE: ${unique.length} items harvested.`);
}

harvest();
