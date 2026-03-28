'use client';
// src/components/Sidebar.js
// Permanent left sidebar with collapsible icon rail.
// Usage:
//   <Sidebar>
//     <SidebarSection label="Filters">...</SidebarSection>
//   </Sidebar>

import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarCtx = createContext({ open: true });

export function useSidebar() { return useContext(SidebarCtx); }

// ── Icons (inline SVG, no dep) ──────────────────────────────────────────────
function IconChevron({ dir = 'left' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: dir === 'right' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Section header inside sidebar ──────────────────────────────────────────
export function SidebarSection({ label, children }) {
  const { open } = useSidebar();
  return (
    <div style={{ marginBottom: 28 }}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      7.5,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color:         'rgba(0,0,0,0.28)',
              marginBottom:  10,
              paddingLeft:   20,
            }}
          >
            {label}
          </motion.p>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

// ── Divider ─────────────────────────────────────────────────────────────────
export function SidebarDivider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '16px 0' }} />;
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarCtx.Provider value={{ open }}>
      <motion.aside
        animate={{ width: open ? 220 : 48 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
        style={{
          flexShrink:    0,
          height:        'calc(100vh - 44px)', // below Nav
          position:      'sticky',
          top:           44,
          overflowX:     'hidden',
          overflowY:     open ? 'auto' : 'hidden',
          background:    'rgba(250,250,248,0.82)',
          backdropFilter:'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight:   '1px solid rgba(0,0,0,0.06)',
          display:       'flex',
          flexDirection: 'column',
          zIndex:        100,
        }}
      >
        {/* ── Toggle button ── */}
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            flexShrink:    0,
            height:        48,
            width:         '100%',
            display:       'flex',
            alignItems:    'center',
            justifyContent: open ? 'flex-end' : 'center',
            paddingRight:  open ? 16 : 0,
            background:    'none',
            border:        'none',
            borderBottom:  '1px solid rgba(0,0,0,0.06)',
            cursor:        'pointer',
            color:         'rgba(0,0,0,0.28)',
            transition:    'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.28)'}
        >
          <IconChevron dir={open ? 'left' : 'right'} />
        </button>

        {/* ── Content ── */}
        <div style={{
          flex:       1,
          padding:    open ? '20px 0 32px' : '20px 0',
          minWidth:   open ? 220 : 48,
          overflowX:  'hidden',
        }}>
          {children}
        </div>
      </motion.aside>
    </SidebarCtx.Provider>
  );
}