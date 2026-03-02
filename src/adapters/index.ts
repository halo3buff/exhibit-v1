// src/adapters/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER REGISTRY — Central export for all museum adapters

import { metAdapter, metFetch } from './met.js';
import { articAdapter, articFetch } from './artic.js';
import { vaAdapter, vaFetch } from './va.js';
import { rijksAdapter, rijksFetch } from './rijks.js';
import { smithsonianAdapter, smithsonianFetch } from './smithsonian.js';

export {
  metAdapter,
  metFetch,
  articAdapter,
  articFetch,
  vaAdapter,
  vaFetch,
  rijksAdapter,
  rijksFetch,
  smithsonianAdapter,
  smithsonianFetch,
};

export const ADAPTERS = {
  met: { adapter: metAdapter, fetch: metFetch },
  artic: { adapter: articAdapter, fetch: articFetch },
  va: { adapter: vaAdapter, fetch: vaFetch },
  rijks: { adapter: rijksAdapter, fetch: rijksFetch },
  smithsonian: { adapter: smithsonianAdapter, fetch: smithsonianFetch },
} as const;

export type AdapterRegistry = typeof ADAPTERS;
export type AdapterKey = keyof AdapterRegistry;