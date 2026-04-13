// src/lib/canvas.js
// Pure utility functions for the canvas editor.
// No React dependencies — safe to use in any context.

/**
 * Default grid placement for a new item at index i out of total.
 * Produces a loose diagonal grid with slight variation per position.
 */
export function defaultTransform(i, total) {
  const cols = Math.ceil(Math.sqrt(total * 1.3));
  return {
    x:      90 + (i % cols) * 260 + (i % 3) * 18,
    y:      80 + Math.floor(i / cols) * 260 + (i % 2) * 22,
    scale:  0.78 + (i % 4) * 0.07,
    rotate: (((i * 137.5) % 5) - 2.5),
    zIndex: i + 1,
  };
}

/**
 * Convert an array of {x, y} world-space points to an SVG path string.
 */
export function pointsToPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
}

/**
 * Test whether a point (px, py) in world space hits a stroke path
 * within a given pixel threshold.
 */
export function pathHitTest(pathData, px, py, threshold = 10) {
  const segments = pathData.split(/[ML]/).filter(Boolean).map(s => {
    const [x, y] = s.trim().split(' ').map(Number);
    return { x, y };
  });
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i], b = segments[i + 1];
    if (isNaN(a.x) || isNaN(b.x)) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const cx = a.x + t * dx, cy = a.y + t * dy;
    if ((px - cx) ** 2 + (py - cy) ** 2 < threshold * threshold) return true;
  }
  return false;
}

/**
 * Convert screen coordinates to world coordinates given current pan and zoom.
 */
export function screenToWorld(sx, sy, pan, zoom) {
  return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
}
