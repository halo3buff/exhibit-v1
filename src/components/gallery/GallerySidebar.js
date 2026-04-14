'use client';
// src/components/gallery/GallerySidebar.js
// Sidebar content for the gallery page: back link, subcategory, source, year filters.
// Renders inside the global AppShell sidebar via useSidebarContent.

import { SOURCE_LABELS, SUB_MAP } from '@/lib/constants';
import YearSlider from '@/components/gallery/YearSlider';

function FilterLabel({ children }) {
  return (
    <div style={{
      fontFamily:    'var(--font-mono)',
      fontSize:      7.5,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color:         'var(--fg-faint)',
      padding:       '0 24px',
      marginBottom:  8,
      marginTop:     20,
    }}>
      {children}
    </div>
  );
}

export default function GallerySidebar({
  typeParam, subParam, onSubChange,
  availableSources, selectedSources, onSourceToggle,
  yearRange, yearValue, onYearChange,
  noDate, onNoDateChange,
  onBack, itemCount,
}) {
  const subs = SUB_MAP[typeParam] || [];

  return (
    <div style={{ padding: '16px 0 24px' }}>

      {/* ── Back + count ── */}
      <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <button
          onClick={onBack}
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         'var(--fg-faint)',
            background:    'none',
            border:        'none',
            cursor:        'pointer',
            padding:       0,
            transition:    'color 0.15s',
            display:       'block',
          }}
          onMouseEnter={e => e.target.style.color = 'var(--fg)'}
          onMouseLeave={e => e.target.style.color = 'var(--fg-faint)'}
        >
          ← Index
        </button>
        {itemCount > 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--fg-faint)', marginTop: 6, textTransform: 'uppercase' }}>
            {itemCount.toLocaleString()} items
          </div>
        )}
      </div>

      {/* ── Subcategory ── */}
      {subs.length > 0 && (
        <>
          <FilterLabel>Category</FilterLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['All', ...subs].map(sub => {
              const active = sub === 'All' ? !subParam : subParam === sub;
              return (
                <button
                  key={sub}
                  onClick={() => onSubChange(sub === 'All' ? '' : sub)}
                  style={{
                    padding:       '6px 24px',
                    textAlign:     'left',
                    background:    active ? 'var(--bg-hover)' : 'none',
                    border:        'none',
                    cursor:        'pointer',
                    fontFamily:    'var(--font-mono)',
                    fontSize:      8.5,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         active ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight:    active ? 500 : 400,
                    transition:    'all 0.12s',
                    width:         '100%',
                  }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        </>
      )}

      {/* ── Source institution filter ── */}
      {availableSources.length > 0 && (
        <>
          <FilterLabel>Source</FilterLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {availableSources.map(({ source, n }) => {
              const active = selectedSources.includes(source);
              const label  = SOURCE_LABELS[source] || source;
              return (
                <button
                  key={source}
                  onClick={() => onSourceToggle(source)}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '5px 24px',
                    background:     active ? 'var(--bg-hover)' : 'none',
                    border:         'none',
                    cursor:         'pointer',
                    transition:     'all 0.12s',
                    gap:            8,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: active ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: active ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--fg-faint)', flexShrink: 0 }}>
                    {n.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        </>
      )}

      {/* ── Year range ── */}
      {yearRange && (
        <>
          <FilterLabel>Year</FilterLabel>
          <div style={{ padding: '0 24px' }}>
            <YearSlider min={yearRange[0]} max={yearRange[1]} value={yearValue} onChange={onYearChange} />
          </div>
          <button
            onClick={() => onNoDateChange(!noDate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <span style={{
              width:      12,
              height:     12,
              flexShrink: 0,
              border:     '1px solid var(--border-md)',
              background: noDate ? 'var(--fg)' : 'transparent',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.12s',
            }}>
              {noDate && <span style={{ color: 'var(--bg)', fontSize: 8, lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
              Include undated
            </span>
          </button>
        </>
      )}
    </div>
  );
}
