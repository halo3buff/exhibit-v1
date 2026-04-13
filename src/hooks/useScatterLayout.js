'use client';
// src/hooks/useScatterLayout.js
// Gravity-packer scatter layout: N loose columns, each item placed in the
// shortest column with slight x-jitter. Size varies by seeded random.

import { useState, useRef, useEffect, useCallback } from 'react';
import { seededRand } from '@/lib/random';

export default function useScatterLayout(items, containerWidth) {
  const [positions, setPositions] = useState([]);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const aspectsRef = useRef({});  // itemId → measured aspect ratio

  const recompute = useCallback(() => {
    if (!containerWidth || items.length === 0) return;

    const GAP        = 28;
    const MIN_W      = 200;
    const JITTER     = 18;   // max horizontal scatter pixels
    const SIZE_RANGE = 0.28; // ±28% size variation

    const cols     = Math.max(2, Math.floor((containerWidth + GAP) / (MIN_W + GAP)));
    const baseW    = (containerWidth - GAP * (cols - 1)) / cols;
    const colTops  = new Array(cols).fill(0);
    const colX     = Array.from({ length: cols }, (_, c) => c * (baseW + GAP));

    const newPositions = items.map((item, idx) => {
      const rand      = seededRand(idx);
      const sizeScale = 1 - SIZE_RANGE / 2 + rand * SIZE_RANGE; // 0.86 – 1.14
      const w         = Math.round(baseW * sizeScale);
      const aspect    = aspectsRef.current[item.id] || 1.3;
      const h         = Math.round(w / aspect) + 36; // 36px for caption

      let shortestCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colTops[c] < colTops[shortestCol]) shortestCol = c;
      }

      const jitter  = seededRand(idx + 999) * JITTER * 2 - JITTER;
      const x       = Math.max(0, Math.min(colX[shortestCol] + jitter, containerWidth - w));
      const y       = colTops[shortestCol];
      const colZone = shortestCol;

      colTops[shortestCol] += h + GAP;

      return { id: item.id, x, y, w, colZone };
    });

    setPositions(newPositions);
    setCanvasHeight(Math.max(...colTops));
  }, [items, containerWidth]);

  useEffect(() => { recompute(); }, [recompute]);

  const onImageLoad = useCallback((itemId, naturalW, naturalH) => {
    if (naturalW && naturalH) {
      const prev = aspectsRef.current[itemId];
      const next = naturalW / naturalH;
      if (!prev || Math.abs(prev - next) > 0.05) {
        aspectsRef.current[itemId] = next;
        recompute();
      }
    }
  }, [recompute]);

  return { positions, canvasHeight, onImageLoad };
}
