// src/lib/formations.js
//
// EDITORIAL FORMATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic layout system for the exhibit preview scatter panel.
// Inspired by Japanese design annuals (JAGDA, IDEA magazine) and Taschen spreads:
// images hold their natural proportions, placed in pre-designed CSS Grid templates
// that always read as intentional, asymmetric, and editorial.
//
// ARCHITECTURE:
//   Each "formation" is a CSS Grid template designed by hand for a specific
//   signature — an ordered tuple of aspect ratio buckets (e.g. "tall,poster,square").
//   At runtime, images are classified into buckets, the closest matching formation
//   is selected, and CSS custom properties drive each slot's grid placement.
//
// ASPECT RATIO BUCKETS:
//   T = tall      (ratio < 0.72)   e.g. 2:3 posters, slim book spines
//   P = poster    (ratio 0.72–0.85) e.g. classic vertical poster ~3:4
//   S = square    (ratio 0.85–1.18) near-square prints, vinyl covers
//   W = wide      (ratio 1.18–1.6)  landscape photos, magazine spreads
//   X = panorama  (ratio > 1.6)     very wide banners
// ─────────────────────────────────────────────────────────────────────────────

export const BUCKETS = {
    TALL:     'T',
    POSTER:   'P',
    SQUARE:   'S',
    WIDE:     'W',
    PANORAMA: 'X',
  };
  
  /**
   * Classify a single image's aspect ratio into a bucket code.
   * @param {number} w - natural width (or rendered/estimated)
   * @param {number} h - natural height
   * @returns {'T'|'P'|'S'|'W'|'X'}
   */
  export function classifyRatio(w, h) {
    if (!w || !h) return BUCKETS.POSTER; // safe default
    const r = w / h;
    if (r < 0.72) return BUCKETS.TALL;
    if (r < 0.85) return BUCKETS.POSTER;
    if (r < 1.18) return BUCKETS.SQUARE;
    if (r < 1.60) return BUCKETS.WIDE;
    return BUCKETS.PANORAMA;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FORMATION DEFINITIONS
  //
  // Each formation has:
  //   id          — unique slug
  //   slots       — ordered array, length matches how many images this handles
  //   gridTemplate— the CSS `grid-template-areas` string (or null for free-flow)
  //   gridCols    — CSS `grid-template-columns`
  //   gridRows    — CSS `grid-template-rows`
  //   gap         — CSS gap value
  //   containerStyle — additional CSS on the grid container
  //   slotStyles  — per-slot CSS: { gridArea, alignSelf, justifySelf, maxHeight, etc. }
  //
  // Design principles per formation:
  //   - Dominant image (tallest/widest) anchors the composition
  //   - Whitespace is structural, not accidental
  //   - No image is cropped — all are `object-fit: contain` in natural ratio containers
  //   - The overall bounding box leaves deliberate asymmetric breathing room
  // ─────────────────────────────────────────────────────────────────────────────
  
  const FORMATIONS = [
  
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE IMAGE — full panel centering, generous margin
    // ═══════════════════════════════════════════════════════════════════════════
    {
      id: 'single-tall',
      signature: ['T'],
      grid: {
        cols: '1fr',
        rows: '1fr',
        areas: `"A"`,
        gap: '0',
      },
      container: { maxWidth: '38%', margin: '0 auto' },
      slots: [{ area: 'A', alignSelf: 'center', justifySelf: 'center', width: '100%' }],
    },
    {
      id: 'single-poster',
      signature: ['P'],
      grid: { cols: '1fr', rows: '1fr', areas: `"A"`, gap: '0' },
      container: { maxWidth: '42%', margin: '0 auto' },
      slots: [{ area: 'A', alignSelf: 'center', justifySelf: 'center', width: '100%' }],
    },
    {
      id: 'single-square',
      signature: ['S'],
      grid: { cols: '1fr', rows: '1fr', areas: `"A"`, gap: '0' },
      container: { maxWidth: '52%', margin: '0 auto' },
      slots: [{ area: 'A', alignSelf: 'center', justifySelf: 'center', width: '100%' }],
    },
    {
      id: 'single-wide',
      signature: ['W'],
      grid: { cols: '1fr', rows: '1fr', areas: `"A"`, gap: '0' },
      container: { maxWidth: '72%', margin: '0 auto' },
      slots: [{ area: 'A', alignSelf: 'center', justifySelf: 'center', width: '100%' }],
    },
    {
      id: 'single-panorama',
      signature: ['X'],
      grid: { cols: '1fr', rows: '1fr', areas: `"A"`, gap: '0' },
      container: { maxWidth: '88%', margin: '0 auto' },
      slots: [{ area: 'A', alignSelf: 'center', justifySelf: 'center', width: '100%' }],
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // TWO IMAGES
    // ═══════════════════════════════════════════════════════════════════════════
  
    // Two talls — asymmetric column widths, bottom-aligned
    {
      id: 'two-TT',
      signature: ['T', 'T'],
      grid: {
        cols: '2fr 1.4fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '32px',
      },
      container: { maxWidth: '72%', margin: '0 auto', alignItems: 'flex-end' },
      slots: [
        { area: 'A', alignSelf: 'end', justifySelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'end', justifySelf: 'start', width: '100%', marginBottom: '8%' },
      ],
    },
  
    // Tall + poster — tall dominates left, poster floats upper-right
    {
      id: 'two-TP',
      signature: ['T', 'P'],
      grid: {
        cols: '1.6fr 1fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '28px',
      },
      container: { maxWidth: '76%', margin: '0 auto', alignItems: 'center' },
      slots: [
        { area: 'A', alignSelf: 'center', justifySelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'start', justifySelf: 'start', width: '100%', marginTop: '6%' },
      ],
    },
  
    // Two posters — equal columns, slight vertical offset
    {
      id: 'two-PP',
      signature: ['P', 'P'],
      grid: {
        cols: '1fr 1fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '24px',
      },
      container: { maxWidth: '68%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%', marginBottom: '10%' },
      ],
    },
  
    // Poster + square — vertical left, square floats right-center
    {
      id: 'two-PS',
      signature: ['P', 'S'],
      grid: {
        cols: '1fr 1.2fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '24px',
      },
      container: { maxWidth: '74%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%', marginBottom: '4%' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '12%' },
      ],
    },
  
    // Square + wide — square stacked left, panoramic right below
    {
      id: 'two-SW',
      signature: ['S', 'W'],
      grid: {
        cols: '1fr 1.4fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '28px',
      },
      container: { maxWidth: '80%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%', marginBottom: '6%' },
      ],
    },
  
    // Wide + tall — landscape top-left, tall bottom-right (JAGDA-style)
    {
      id: 'two-WT',
      signature: ['W', 'T'],
      grid: {
        cols: '1.8fr 1fr',
        rows: '1fr',
        areas: `"A B"`,
        gap: '20px',
      },
      container: { maxWidth: '84%', margin: '0 auto', alignItems: 'flex-start' },
      slots: [
        { area: 'A', alignSelf: 'start', width: '100%', marginTop: '8%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
      ],
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // THREE IMAGES — the real editorial magic
    // ═══════════════════════════════════════════════════════════════════════════
  
    // Tall dominates center-left, two smalls stack right column
    {
      id: 'three-T-PP',
      signature: ['T', 'P', 'P'],
      grid: {
        cols: '1.8fr 1fr',
        rows: 'auto auto',
        areas: `"A B" "A C"`,
        gap: '20px 24px',
      },
      container: { maxWidth: '80%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'start', width: '100%' },
      ],
    },
  
    // Three posters in asymmetric 3-col — offset vertically (JAGDA spread)
    {
      id: 'three-PPP',
      signature: ['P', 'P', 'P'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: '1fr',
        areas: `"A B C"`,
        gap: '20px',
      },
      container: { maxWidth: '90%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'start', width: '100%', marginTop: '0%' },
        { area: 'B', alignSelf: 'end', width: '100%', marginBottom: '12%' },
        { area: 'C', alignSelf: 'start', width: '100%', marginTop: '6%' },
      ],
    },
  
    // Tall left, wide top-right, square bottom-right — classic editorial
    {
      id: 'three-T-WS',
      signature: ['T', 'W', 'S'],
      grid: {
        cols: '1.2fr 1.6fr',
        rows: 'auto auto',
        areas: `"A B" "A C"`,
        gap: '18px 22px',
      },
      container: { maxWidth: '86%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'start', width: '100%' },
      ],
    },
  
    // Three squares — staggered diagonal
    {
      id: 'three-SSS',
      signature: ['S', 'S', 'S'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: '1fr',
        areas: `"A B C"`,
        gap: '22px',
      },
      container: { maxWidth: '88%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '90%', marginBottom: '0%' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '14%' },
        { area: 'C', alignSelf: 'end', width: '85%', marginBottom: '6%', justifySelf: 'end' },
      ],
    },
  
    // Wide top spanning full, two smaller below
    {
      id: 'three-X-PP',
      signature: ['X', 'P', 'P'],
      grid: {
        cols: '1fr 1fr',
        rows: 'auto auto',
        areas: `"A A" "B C"`,
        gap: '20px 24px',
      },
      container: { maxWidth: '88%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '80%', justifySelf: 'center' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '8px' },
        { area: 'C', alignSelf: 'start', width: '100%', marginTop: '24px' },
      ],
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // FOUR IMAGES
    // ═══════════════════════════════════════════════════════════════════════════
  
    // 4-poster — two rows, asymmetric vertical alignment
    {
      id: 'four-PPPP',
      signature: ['P', 'P', 'P', 'P'],
      grid: {
        cols: '1fr 1fr',
        rows: '1fr 1fr',
        areas: `"A B" "C D"`,
        gap: '20px 28px',
      },
      container: { maxWidth: '76%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'start', width: '88%', marginTop: '10%' },
        { area: 'C', alignSelf: 'end', width: '88%', marginBottom: '10%', justifySelf: 'end' },
        { area: 'D', alignSelf: 'start', width: '100%' },
      ],
    },
  
    // Tall anchor left, 3 smalls in right column (JAGDA artist portfolio page)
    {
      id: 'four-T-PSS',
      signature: ['T', 'P', 'S', 'S'],
      grid: {
        cols: '1.4fr 1fr',
        rows: 'auto auto auto',
        areas: `"A B" "A C" "A D"`,
        gap: '14px 20px',
      },
      container: { maxWidth: '82%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'center', width: '100%' },
        { area: 'D', alignSelf: 'start', width: '100%' },
      ],
    },
  
    // Wide top-left, tall top-right, two squares bottom
    {
      id: 'four-WT-SS',
      signature: ['W', 'T', 'S', 'S'],
      grid: {
        cols: '1.6fr 1fr',
        rows: 'auto auto',
        areas: `"A B" "C D"`,
        gap: '18px 22px',
      },
      container: { maxWidth: '86%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'start', width: '85%', marginTop: '4%' },
        { area: 'D', alignSelf: 'start', width: '100%', marginTop: '14%', justifySelf: 'end' },
      ],
    },
  
    // Four squares in 3+1 — three top, one wide bottom-right (magazine grid)
    {
      id: 'four-SSSS',
      signature: ['S', 'S', 'S', 'S'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: 'auto auto',
        areas: `"A B C" ". D D"`,
        gap: '16px 20px',
      },
      container: { maxWidth: '88%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '12%' },
        { area: 'C', alignSelf: 'end', width: '100%' },
        { area: 'D', alignSelf: 'start', width: '60%', justifySelf: 'center', marginTop: '4%' },
      ],
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // FIVE IMAGES
    // ═══════════════════════════════════════════════════════════════════════════
  
    // 5-mixed: tall anchor + 4 in 2x2 right — Masahiko FUJII spread reference
    {
      id: 'five-T-PPSS',
      signature: ['T', 'P', 'P', 'S', 'S'],
      grid: {
        cols: '1.2fr 1fr 1fr',
        rows: 'auto auto',
        areas: `"A B C" "A D E"`,
        gap: '14px 18px',
      },
      container: { maxWidth: '90%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'end', width: '88%', justifySelf: 'end' },
        { area: 'D', alignSelf: 'start', width: '88%', justifySelf: 'end', marginTop: '4%' },
        { area: 'E', alignSelf: 'start', width: '100%', marginTop: '10%' },
      ],
    },
  
    // 5-posters: staggered 3-2 row
    {
      id: 'five-PPPPP',
      signature: ['P', 'P', 'P', 'P', 'P'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: 'auto auto',
        areas: `"A B C" ". D E"`,
        gap: '16px 20px',
      },
      container: { maxWidth: '90%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '8%' },
        { area: 'C', alignSelf: 'end', width: '100%' },
        { area: 'D', alignSelf: 'end', width: '100%', marginBottom: '4%' },
        { area: 'E', alignSelf: 'start', width: '100%', marginTop: '6%' },
      ],
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // SIX+ IMAGES — reduced size, denser editorial
    // ═══════════════════════════════════════════════════════════════════════════
  
    {
      id: 'six-2x3',
      signature: ['P', 'P', 'P', 'P', 'P', 'P'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: 'auto auto',
        areas: `"A B C" "D E F"`,
        gap: '14px 18px',
      },
      container: { maxWidth: '94%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'end', width: '100%' },
        { area: 'B', alignSelf: 'start', width: '100%', marginTop: '10%' },
        { area: 'C', alignSelf: 'end', width: '92%', justifySelf: 'end' },
        { area: 'D', alignSelf: 'start', width: '92%', justifySelf: 'end', marginTop: '4%' },
        { area: 'E', alignSelf: 'end', width: '100%' },
        { area: 'F', alignSelf: 'start', width: '100%', marginTop: '8%' },
      ],
    },
  
    {
      id: 'six-mixed',
      signature: ['T', 'P', 'S', 'P', 'S', 'W'],
      grid: {
        cols: '1fr 1fr 1fr',
        rows: 'auto auto',
        areas: `"A B C" "D E F"`,
        gap: '14px 18px',
      },
      container: { maxWidth: '94%', margin: '0 auto' },
      slots: [
        { area: 'A', alignSelf: 'center', width: '100%' },
        { area: 'B', alignSelf: 'end', width: '100%' },
        { area: 'C', alignSelf: 'start', width: '100%', marginTop: '8%' },
        { area: 'D', alignSelf: 'end', width: '100%' },
        { area: 'E', alignSelf: 'start', width: '90%', marginTop: '6%' },
        { area: 'F', alignSelf: 'end', width: '100%' },
      ],
    },
  ];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SELECTION ALGORITHM
  //
  // Given a list of images with their aspect ratios, finds the best matching
  // formation. The matching considers:
  //   1. Count match (exact count first, then nearest ≤)
  //   2. Bucket signature similarity score (most matching buckets win)
  //   3. Fallback: generic formation for that count
  // ─────────────────────────────────────────────────────────────────────────────
  
  const SLOT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  /**
   * Score how well an image list matches a formation signature.
   * Images are sorted: dominant first (tallest), then by descending height ratio.
   */
  function scoreMatch(imageBuckets, formation) {
    const sig = formation.signature;
    if (imageBuckets.length < sig.length) return -Infinity;
  
    // Sort images: T first, then P, S, W, X
    const ORDER = { T: 0, P: 1, S: 2, W: 3, X: 4 };
    const sorted = [...imageBuckets].sort((a, b) => (ORDER[a] ?? 5) - (ORDER[b] ?? 5));
  
    let score = 0;
    for (let i = 0; i < sig.length; i++) {
      if (sorted[i] === sig[i]) score += 2;
      else if (
        (sorted[i] === 'T' && sig[i] === 'P') ||
        (sorted[i] === 'P' && sig[i] === 'T') ||
        (sorted[i] === 'S' && sig[i] === 'P') ||
        (sorted[i] === 'P' && sig[i] === 'S') ||
        (sorted[i] === 'S' && sig[i] === 'W') ||
        (sorted[i] === 'W' && sig[i] === 'X')
      ) score += 1; // adjacent bucket partial credit
    }
    return score;
  }
  
  /**
   * Select the best formation for a given set of images.
   * @param {Array<{ratio?: number, width?: number, height?: number}>} images
   * @returns {{ formation: object, sortedImages: Array, slotMap: object }}
   */
  export function selectFormation(images) {
    if (!images || images.length === 0) return null;
  
    const count = Math.min(images.length, 6); // cap at 6 for display
  
    // Classify each image
    const classified = images.slice(0, count).map((img, i) => ({
      ...img,
      bucket: classifyRatio(img.width || 1, img.height || 1.33),
      originalIndex: i,
    }));
  
    // Sort by dominance: T > P > S > W > X
    const DOMINANCE = { T: 0, P: 1, S: 2, W: 3, X: 4 };
    const sorted = [...classified].sort((a, b) =>
      (DOMINANCE[a.bucket] ?? 5) - (DOMINANCE[b.bucket] ?? 5)
    );
  
    const buckets = sorted.map(img => img.bucket);
  
    // Find candidate formations with same or compatible count
    const candidates = FORMATIONS.filter(f => f.signature.length === count);
    const fallbacks  = FORMATIONS.filter(f => f.signature.length <= count && f.signature.length >= Math.max(2, count - 1));
  
    const pool = candidates.length > 0 ? candidates : fallbacks;
  
    // Score each
    let best = null;
    let bestScore = -Infinity;
    for (const f of pool) {
      const s = scoreMatch(buckets, f);
      if (s > bestScore) { bestScore = s; best = f; }
    }
  
    // Absolute fallback
    if (!best) {
      best = FORMATIONS.find(f => f.signature.length === 1) || FORMATIONS[0];
    }
  
    // Build slot → image mapping
    const slotCount = best.signature.length;
    const assignedImages = sorted.slice(0, slotCount);
    const slotMap = {};
    assignedImages.forEach((img, i) => {
      slotMap[SLOT_LABELS[i]] = img;
    });
  
    return { formation: best, sortedImages: assignedImages, slotMap };
  }
  
  export default FORMATIONS;