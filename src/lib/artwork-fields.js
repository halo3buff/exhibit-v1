// src/lib/artwork-fields.js
// Builds the metadata field rows for artwork tooltips and detail modals.
// Used by gallery (hover tooltip) and canvas editor (item detail modal).

import { SOURCE_LABELS, TOOLTIP_SCHEMA } from '@/lib/constants';

const EMPTY_VALUES = new Set(['Unknown', 'n.d.', 'Uncategorized', '']);

/**
 * Returns an array of [label, value] pairs for the given artwork,
 * filtered to only include non-empty, non-placeholder values.
 *
 * @param {object} item - Artwork object with source, title, author, etc.
 * @returns {Array<[string, string]>}
 */
export function getArtworkFields(item) {
  const source = (item.source || '').toLowerCase();
  const schema = TOOLTIP_SCHEMA[source] || TOOLTIP_SCHEMA.default;
  const sourceLabel = SOURCE_LABELS[source] || item.source || '';
  return schema
    .map(([label, field]) => [label, field === 'collection' ? sourceLabel : item[field]])
    .filter(([, v]) => v?.toString().trim() && !EMPTY_VALUES.has(v?.toString().trim()));
}
