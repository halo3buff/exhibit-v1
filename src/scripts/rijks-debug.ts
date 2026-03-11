// npx tsx src/scripts/rijks-debug.ts

async function tryFetch(label: string, url: string, acceptHeader?: string) {
  console.log(`\n--- ${label} ---`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': acceptHeader || 'application/json',
        'User-Agent': 'ArtHarvester/2.0',
      },
      redirect: 'follow',
    });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Final URL:', res.url);
    const text = await res.text();
    console.log('Response (first 500 chars):', text.slice(0, 500));
  } catch (e: any) {
    console.log('ERROR:', e.message);
  }
}

async function main() {
  const id = '200101000'; // first poster from search results

  // Try 1: data.rijksmuseum.nl with _profile=la
  await tryFetch('data.rijksmuseum.nl + _profile=la', `https://data.rijksmuseum.nl/${id}?_profile=la`);

  // Try 2: data.rijksmuseum.nl plain JSON
  await tryFetch('data.rijksmuseum.nl plain', `https://data.rijksmuseum.nl/${id}`);

  // Try 3: id.rijksmuseum.nl with JSON accept
  await tryFetch('id.rijksmuseum.nl + Accept JSON', `https://id.rijksmuseum.nl/${id}`, 'application/json');

  // Try 4: id.rijksmuseum.nl with linked art accept
  await tryFetch('id.rijksmuseum.nl + Accept ld+json', `https://id.rijksmuseum.nl/${id}`, 'application/ld+json');
}

main().catch(console.error);
