// src/harvester/utils/http.ts

export async function fetchWithRetry(
  url: string,
  retries = 3,
  delayMs = 1000
): Promise<unknown | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ArtHarvester/2.0 (Educational Project)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delayMs * 2;
        console.log(`\n⏸ Rate limited — waiting ${waitTime / 1000}s`);
        await sleep(waitTime);
        continue;
      }

      // 403 = image rights restriction, 404 = not found.
      // Both permanent — return null silently, caller logs ⊘ Failed.
      if (res.status === 403 || res.status === 404) {
        return null;
      }

      if (res.status === 502 || res.status === 503 || res.status === 504) {
        const backoff = delayMs * (i + 1) * 2;
        console.warn(`[HTTP] ${res.status} (transient) — retry ${i + 1}/${retries} in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        console.warn(`[HTTP] ${res.status} from ${url.slice(0, 80)}`);
        return null;
      }

      const data = await res.json();
      if (!data) return null;
      
      return data;
      
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn(`[TIMEOUT] Request timed out: ${url.slice(0, 80)}`);
      } else if (e.code === 'ECONNRESET' || e.code === 'ENOTFOUND') {
        console.warn(`[NETWORK] Connection error: ${e.message}`);
      } else {
        console.warn(`[ERROR] Attempt ${i + 1}/${retries}: ${e.message}`);
      }
      if (i < retries - 1) await sleep(delayMs * (i + 1));
    }
  }
  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}