'use client';
// src/components/gallery/EditorialGrid.js
// Replaces ScatterGrid with an editorial CSS Grid layout system.
// Items are chunked into repeating "spread" patterns inspired by
// Taschen art books and Japanese design annuals (JAGDA, IDEA magazine).

import { imgUrl } from '@/lib/images';

const TEMPLATES = [
  { id: 'hero-grid',  count: 8 },
  { id: 'h-band',     count: 6 },
  { id: 'asym-vert',  count: 7 },
  { id: 'jp-offset',  count: 5 },
];

function chunkIntoSpreads(items) {
  const spreads = [];
  let i = 0;
  let tIdx = 0;
  while (i < items.length) {
    const tmpl  = TEMPLATES[tIdx % TEMPLATES.length];
    const chunk = items.slice(i, i + tmpl.count);
    if (chunk.length > 0) spreads.push({ template: tmpl, items: chunk });
    i += tmpl.count;
    tIdx++;
  }
  return spreads;
}

// Returns per-item grid placement styles for each template.
function getSlotStyle(templateId, idx, total) {
  switch (templateId) {
    case 'hero-grid': {
      // 4-col grid. Item 0 = 2×2 hero. Items 1-4 fill top-right. Items 5-7 across bottom.
      if (idx === 0) return { gridColumn: '1 / 3', gridRow: '1 / 3', aspectRatio: '4/3' };
      if (idx === 1) return { gridColumn: '3',     gridRow: '1',     aspectRatio: '3/4' };
      if (idx === 2) return { gridColumn: '4',     gridRow: '1',     aspectRatio: '3/4' };
      if (idx === 3) return { gridColumn: '3',     gridRow: '2',     aspectRatio: '3/4' };
      if (idx === 4) return { gridColumn: '4',     gridRow: '2',     aspectRatio: '3/4' };
      if (idx === 5) return { gridColumn: '1',     gridRow: '3',     aspectRatio: '1/1' };
      if (idx === 6) return { gridColumn: '2',     gridRow: '3',     aspectRatio: '1/1' };
      if (idx === 7) return { gridColumn: '3 / 5', gridRow: '3',     aspectRatio: '16/7' };
      return {};
    }
    case 'h-band': {
      // 3-col (1fr 2fr 1fr). Row 1: small | hero | small. Row 2: 3 even.
      if (idx === 0) return { gridColumn: '1', gridRow: '1', aspectRatio: '3/4' };
      if (idx === 1) return { gridColumn: '2', gridRow: '1', aspectRatio: '4/3' };
      if (idx === 2) return { gridColumn: '3', gridRow: '1', aspectRatio: '3/4' };
      if (idx === 3) return { gridColumn: '1', gridRow: '2', aspectRatio: '4/3' };
      if (idx === 4) return { gridColumn: '2', gridRow: '2', aspectRatio: '1/1' };
      if (idx === 5) return { gridColumn: '3', gridRow: '2', aspectRatio: '4/3' };
      return {};
    }
    case 'asym-vert': {
      // 3-col (1.2fr 1fr 0.8fr). Item 0 spans 2 rows on left.
      if (idx === 0) return { gridColumn: '1', gridRow: '1 / 3', aspectRatio: '3/5' };
      if (idx === 1) return { gridColumn: '2', gridRow: '1',     aspectRatio: '4/3' };
      if (idx === 2) return { gridColumn: '3', gridRow: '1',     aspectRatio: '3/4' };
      if (idx === 3) return { gridColumn: '2', gridRow: '2',     aspectRatio: '4/3' };
      if (idx === 4) return { gridColumn: '3', gridRow: '2',     aspectRatio: '3/4' };
      if (idx === 5) return { gridColumn: '1 / 3', gridRow: '3', aspectRatio: '16/7' };
      if (idx === 6) return { gridColumn: '3',     gridRow: '3', aspectRatio: '3/4' };
      return {};
    }
    case 'jp-offset': {
      // 3-col (1fr 1fr 1.4fr). Japanese offset asymmetry.
      if (idx === 0) return { gridColumn: '1', gridRow: '1', aspectRatio: '3/4' };
      if (idx === 1) return { gridColumn: '2', gridRow: '1', aspectRatio: '3/4' };
      if (idx === 2) return { gridColumn: '3', gridRow: '1 / 3', aspectRatio: '3/5' };
      if (idx === 3) return { gridColumn: '1 / 3', gridRow: '2', aspectRatio: '16/9' };
      return {};
    }
    default:
      return { aspectRatio: '3/4' };
  }
}

function EditorialCell({ item, idx, onOpen, showTooltip, hideTooltip, animDelay }) {
  return (
    <div
      className="editorial-cell"
      style={{
        ...getSlotStyle('', 0, 1), // placeholder, overridden by parent
        animation: `editorial-in 0.5s cubic-bezier(0.16,1,0.3,1) ${animDelay}s both`,
      }}
      onClick={() => { hideTooltip(); onOpen(item); }}
      onMouseEnter={() => showTooltip(item)}
      onMouseLeave={hideTooltip}
    >
      <img
        src={imgUrl(item.imageUrl, 800)}
        alt={item.title || ''}
        loading={idx < 16 ? 'eager' : 'lazy'}
        decoding="async"
        onError={e => { e.currentTarget.parentElement.style.opacity = '0.25'; }}
      />
      <div className="cell-caption">
        {item.title && <div className="cell-caption-title">{item.title}</div>}
        {(item.author || item.year) && (
          <div className="cell-caption-meta">
            {item.author && item.author !== 'Unknown' ? item.author : ''}
            {item.author && item.author !== 'Unknown' && item.year && item.year !== 'n.d.' ? ', ' : ''}
            {item.year && item.year !== 'n.d.' ? item.year : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function Spread({ spread, spreadIdx, globalOffset, onOpen, showTooltip, hideTooltip }) {
  const { template, items } = spread;

  return (
    <div
      className={`spread-${template.id}`}
      style={{ marginBottom: 0 }}
    >
      {items.map((item, idx) => {
        const slotStyle = getSlotStyle(template.id, idx, items.length);
        const globalIdx = globalOffset + idx;
        const animDelay = spreadIdx * 0.08 + idx * 0.018;

        return (
          <div
            key={item.id}
            className="editorial-cell"
            style={{
              gridColumn: slotStyle.gridColumn,
              gridRow:    slotStyle.gridRow,
              aspectRatio: slotStyle.aspectRatio || '3/4',
              animation: `editorial-in 0.5s cubic-bezier(0.16,1,0.3,1) ${animDelay}s both`,
            }}
            onClick={() => { hideTooltip(); onOpen(item); }}
            onMouseEnter={() => showTooltip(item)}
            onMouseLeave={hideTooltip}
          >
            <img
              src={imgUrl(item.imageUrl, 800)}
              alt={item.title || ''}
              loading={globalIdx < 16 ? 'eager' : 'lazy'}
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.15s ease' }}
              onError={e => { e.currentTarget.parentElement.style.opacity = '0.25'; }}
            />
            <div className="cell-caption">
              {item.title && <div className="cell-caption-title">{item.title}</div>}
              {(item.author || item.year) && (
                <div className="cell-caption-meta">
                  {item.author && item.author !== 'Unknown' ? item.author : ''}
                  {item.author && item.author !== 'Unknown' && item.year && item.year !== 'n.d.' ? ', ' : ''}
                  {item.year && item.year !== 'n.d.' ? item.year : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EditorialGrid({ items, onOpen, showTooltip, hideTooltip }) {
  const spreads = chunkIntoSpreads(items);
  let globalOffset = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {spreads.map((spread, spreadIdx) => {
        const offset = globalOffset;
        globalOffset += spread.items.length;

        return (
          <div key={spreadIdx}>
            <Spread
              spread={spread}
              spreadIdx={spreadIdx}
              globalOffset={offset}
              onOpen={onOpen}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
            />
            {/* Spread divider */}
            <div className="spread-divider">
              <span className="spread-folio">
                p.{' '}{String(spreadIdx + 1).padStart(2, '0')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
