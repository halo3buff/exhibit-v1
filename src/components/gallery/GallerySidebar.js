'use client';
// src/components/gallery/GallerySidebar.js
// Sidebar content for the gallery page: back link, subcategory, source, year filters.

import { SidebarSection, SidebarDivider, useSidebar } from '@/components/Sidebar';
import { SOURCE_LABELS, SUB_MAP } from '@/lib/constants';
import YearSlider from '@/components/gallery/YearSlider';

export default function GallerySidebar({
  typeParam, subParam, onSubChange,
  availableSources, selectedSources, onSourceToggle,
  yearRange, yearValue, onYearChange,
  noDate, onNoDateChange,
  onBack, itemCount,
}) {
  const { open } = useSidebar();
  const subs = SUB_MAP[typeParam] || [];

  return (
    <>
      {/* ── Back link + count ── */}
      <div style={{ padding: open ? '0 20px 16px' : '0 0 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.52)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s', display: open ? 'block' : 'none' }}
          onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.6)'}
          onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.52)'}
        >
          ← Index
        </button>
        {open && itemCount > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.40)', marginTop: 6, textTransform: 'uppercase' }}>
            {itemCount.toLocaleString()} items
          </p>
        )}
      </div>

      {/* ── Subcategory ── */}
      {subs.length > 0 && (
        <>
          <SidebarSection label="Category">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['All', ...subs].map(sub => {
                const isActive = sub === 'All' ? !subParam : subParam === sub;
                return (
                  <button key={sub} onClick={() => onSubChange(sub === 'All' ? '' : sub)} title={sub}
                    style={{ padding: open ? '6px 20px' : '6px 0', textAlign: open ? 'left' : 'center', background: isActive ? 'rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)', fontWeight: isActive ? 500 : 400, transition: 'all 0.12s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {open ? sub : sub[0]}
                  </button>
                );
              })}
            </div>
          </SidebarSection>
          <SidebarDivider />
        </>
      )}

      {/* ── Source institution filter ── */}
      {open && availableSources.length > 0 && (
        <>
          <SidebarSection label="Source">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {availableSources.map(({ source, n }) => {
                const isActive = selectedSources.includes(source);
                const label    = SOURCE_LABELS[source] || source;
                return (
                  <button key={source} onClick={() => onSourceToggle(source)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 20px', background: isActive ? 'rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.12s', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: isActive ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)', fontWeight: isActive ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'rgba(0,0,0,0.36)', flexShrink: 0 }}>{n.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </SidebarSection>
          <SidebarDivider />
        </>
      )}

      {/* ── Year range ── */}
      {open && yearRange && (
        <SidebarSection label="Year">
          <YearSlider min={yearRange[0]} max={yearRange[1]} value={yearValue} onChange={onYearChange} />
          <button onClick={() => onNoDateChange(!noDate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 20px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
            <span style={{ width: 12, height: 12, flexShrink: 0, border: '1px solid rgba(0,0,0,0.3)', background: noDate ? 'rgba(0,0,0,0.65)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
              {noDate && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}>Include undated</span>
          </button>
        </SidebarSection>
      )}
    </>
  );
}
