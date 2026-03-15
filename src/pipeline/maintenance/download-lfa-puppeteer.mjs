// src/pipeline/maintenance/download-lfa-puppeteer.mjs
//
// Downloads LFA images using Puppeteer (real Chromium browser).
// LFA blocks all HTTP clients but serves images fine to real browsers.
//
// Install once:
//   npm install puppeteer
//
// Run from project root:
//   node src/pipeline/maintenance/download-lfa-puppeteer.mjs
//
// Safe to re-run — skips already-downloaded files and already-updated DB rows.
// Images saved to public/lfa-images/, DB imageUrl updated to local path.

import fs       from 'fs';
import path     from 'path';
import sharp    from 'sharp';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const IMG_DIR   = path.join(ROOT, 'public', 'lfa-images');

fs.mkdirSync(IMG_DIR, { recursive: true });

const BATCH_SIZE  = 10;  // pages open simultaneously
const DELAY_MS    = 300; // between requests within a batch

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function downloadWithPuppeteer(browser, url) {
  const page = await browser.newPage();
  try {
    // Intercept the image response directly
    let imageBuffer = null;

    await page.setRequestInterception(true);
    page.on('request', req => {
      // Only allow the image request through, block everything else
      if (req.url() === url) {
        req.continue();
      } else if (req.resourceType() === 'image' && req.url().includes('letterformarchive.org')) {
        req.continue();
      } else {
        req.abort();
      }
    });

    page.on('response', async res => {
      if (res.url() === url) {
        try {
          const buf = await res.buffer();
          if (buf && buf.length > 500) imageBuffer = buf;
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // If direct navigation didn't work, try evaluating fetch from within the browser
    if (!imageBuffer) {
      imageBuffer = await page.evaluate(async (imgUrl) => {
        try {
          const res = await fetch(imgUrl, { credentials: 'include' });
          if (!res.ok) return null;
          const buf = await res.arrayBuffer();
          return Array.from(new Uint8Array(buf));
        } catch { return null; }
      }, url);
      if (imageBuffer) imageBuffer = Buffer.from(imageBuffer);
    }

    return imageBuffer;
  } catch (e) {
    return null;
  } finally {
    await page.close();
  }
}

async function resizeAndSave(buf, localPath400, localPath1200) {
  try {
    // Save full size (1200)
    const buf1200 = await sharp(buf)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    fs.writeFileSync(localPath1200, buf1200);

    // Save thumbnail (400)
    const buf400 = await sharp(buf)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    fs.writeFileSync(localPath400, buf400);

    return true;
  } catch { return false; }
}

async function main() {
  console.log('\n🌐 LFA Image Downloader — Puppeteer');
  console.log('   Downloads images using real Chromium browser\n');

  // Dynamic import so missing puppeteer gives a clear error
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch {
    console.error('❌ Puppeteer not installed. Run: npm install puppeteer');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  const rows = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE source = 'letterformarchive'
    AND imageUrl LIKE 'https://oa.letterformarchive.org/%'
  `).all();

  console.log(`   ${rows.length.toLocaleString()} LFA images to download`);
  if (rows.length === 0) {
    console.log('   ✓ All LFA images already local');
    db.close();
    return;
  }

  const updateStmt = db.prepare(`UPDATE artworks SET imageUrl = ? WHERE id = ?`);

  // Launch browser once, reuse for all downloads
  console.log('   Launching Chromium...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  // First visit LFA homepage to establish session
  console.log('   Establishing LFA session...');
  const setupPage = await browser.newPage();
  await setupPage.goto('https://oa.letterformarchive.org/', { waitUntil: 'networkidle0', timeout: 30000 });
  await setupPage.close();
  console.log('   Session established ✓\n');

  let done = 0, saved = 0, skipped = 0, failed = 0;
  const total = rows.length;

  function progress() {
    if (done % 10 === 0 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      process.stdout.write(`\r   ${pct}% (${done}/${total}) saved:${saved} skip:${skipped} fail:${failed}  `);
    }
  }

  // Process in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const batchTasks = batch.map(row => async () => {
      const remoteUrl = row.imageUrl;
      const filename  = path.basename(remoteUrl.split('?')[0]);
      const baseName  = filename.replace(/\.[^.]+$/, ''); // strip extension
      const localPath = path.join(IMG_DIR, `${baseName}.jpg`);
      const localUrl  = `/lfa-images/${baseName}.jpg`;

      // Already downloaded — just update DB if needed
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 500) {
        updateStmt.run(localUrl, row.id);
        skipped++; done++; progress(); return;
      }

      await sleep(DELAY_MS);
      const buf = await downloadWithPuppeteer(browser, remoteUrl);

      if (!buf || buf.length < 500) {
        failed++; done++; progress(); return;
      }

      // Verify it's an image
      const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
      const isPng  = buf[0] === 0x89 && buf[1] === 0x50;
      if (!isJpeg && !isPng) {
        failed++; done++; progress(); return;
      }

      fs.writeFileSync(localPath, buf);
      updateStmt.run(localUrl, row.id);
      saved++; done++; progress();
    });

    // Run batch concurrently
    await Promise.all(batchTasks.map(t => t()));
  }

  await browser.close();
  db.close();

  console.log(`\n\n✅ Done — saved:${saved} already-on-disk:${skipped} failed:${failed}`);
  if (failed > 0) {
    console.log(`\n   ${failed} failed — re-run to retry (already-downloaded files are skipped)`);
  }
  console.log('\n   Next: node src/pipeline/maintenance/prewarm-cache.mjs\n');
}

main().catch(console.error);
