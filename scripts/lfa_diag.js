/**
 * DIAGNOSTIC: dump real LFA Mastodon post titles + tags
 * Run: node scripts/lfa_diag.js
 * Paste the output and we'll know exactly what tags/titles are used for posters.
 */

const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 20000);
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/122', 'Accept': 'application/json' }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function strip(html) {
  return (html || '').replace(/</g, ' <').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const acct = await get('https://typo.social/api/v1/accounts/lookup?acct=Lfaimagebot');
  console.log(`Account: ${acct.id}  Posts: ${acct.statuses_count}\n`);
  console.log('='.repeat(80));

  const tagFreq = {};
  let maxId = null;
  let count = 0;
  const TARGET = 80;

  while (count < TARGET) {
    let url = `https://typo.social/api/v1/accounts/${acct.id}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`;
    if (maxId) url += `&max_id=${maxId}`;

    const statuses = await get(url);
    if (!Array.isArray(statuses) || !statuses.length) break;

    for (const s of statuses) {
      if (count >= TARGET) break;
      const text  = strip(s.content);
      const workID = text.match(/workID=(lfa_[a-zA-Z0-9_]+)/)?.[1] || '—';
      const tags  = [...text.matchAll(/#([A-Za-z][A-Za-z0-9]*)/g)].map(m => m[1]);
      tags.forEach(t => tagFreq[t] = (tagFreq[t] || 0) + 1);

      // Grab the first real line as the title
      const title = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('http') && !l.includes('workID') && !/^[Cc]ourtesy/.test(l))[0] || '';

      const hasImg = s.media_attachments?.length > 0;

      count++;
      console.log(`[${String(count).padStart(3)}] ${hasImg ? '🖼 ' : '   '}${workID}`);
      console.log(`      TITLE: ${title.slice(0, 100)}`);
      console.log(`      TAGS:  ${tags.join(', ') || '(none)'}`);
      console.log(`      RAW:   ${text.slice(0, 200).replace(/\n/g, ' | ')}`);
      console.log('');
    }

    maxId = statuses[statuses.length - 1].id;
    await sleep(800);
  }

  console.log('='.repeat(80));
  console.log('\nTAG FREQUENCY across all posts sampled:');
  Object.entries(tagFreq).sort((a,b) => b[1]-a[1])
    .forEach(([t, n]) => console.log(`  ${String(n).padStart(3)}x  #${t}`));
}

main().catch(e => console.error(e.message));