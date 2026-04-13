// src/lib/images.js
// Single source of truth for routing external images through the proxy.
// All pages must use these helpers — never construct /api/img URLs inline.

/**
 * Build a proxied image URL.
 * @param {string|null} url  - The original external image URL
 * @param {number} size      - Target size (400 | 800 | 1200)
 */
export function imgUrl(url, size = 1200) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

/** Convenience alias — full quality (1200px). */
export const hqUrl = (url) => imgUrl(url, 1200);
