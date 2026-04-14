'use client';
// src/components/layout/Sidebar.js
// Universal 240px left sidebar — wordmark, numbered section nav, contextual slot, account.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SECTIONS = [
  { n: '01', label: 'INDEX',    href: '/'         },
  { n: '02', label: 'GALLERY',  href: '/gallery'  },
  { n: '03', label: 'EXHIBITS', href: '/exhibits' },
];

function isActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function Sidebar({ collapsed = false, contextContent = null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const w = collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)';

  return (
    <motion.aside
      animate={{ width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
      initial={false}
      transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
      style={{
        flexShrink:    0,
        height:        '100vh',
        position:      'sticky',
        top:           0,
        overflow:      'hidden',
        background:    'var(--bg)',
        borderRight:   '1px solid var(--border)',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        90,
      }}
    >
      {/* ── Wordmark ── */}
      <div style={{
        padding:       collapsed ? '28px 0' : '28px 24px 20px',
        borderBottom:  '1px solid var(--border)',
        flexShrink:    0,
        display:       'flex',
        alignItems:    collapsed ? 'center' : 'flex-start',
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow:      'hidden',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          {collapsed ? (
            <span style={{
              fontFamily:    'var(--font-display)',
              fontSize:      16,
              fontWeight:    300,
              letterSpacing: '0.06em',
              color:         'var(--fg)',
              fontStyle:     'italic',
            }}>
              E
            </span>
          ) : (
            <div>
              <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      13,
                fontWeight:    300,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color:         'var(--fg)',
                lineHeight:    1,
                marginBottom:  5,
              }}>
                EXHIBIT
              </div>
              <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
              }}>
                Private Archive
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* ── Section nav ── */}
      <nav style={{ padding: collapsed ? '20px 0' : '20px 0', flexShrink: 0 }}>
        {SECTIONS.filter(s => s.href !== '/exhibits' || !!user).map(sec => {
          const active = isActive(pathname, sec.href);
          return (
            <Link
              key={sec.n}
              href={sec.href}
              style={{
                display:        'flex',
                alignItems:     'baseline',
                gap:            14,
                padding:        collapsed ? '9px 0' : '9px 24px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                color:          active ? 'var(--fg)' : 'var(--fg-faint)',
                transition:     'color 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
              onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--fg)' : 'var(--fg-faint)'}
            >
              {!collapsed && (
                <span style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      8,
                  letterSpacing: '0.14em',
                  color:         'var(--fg-faint)',
                  userSelect:    'none',
                  transition:    'inherit',
                }}>
                  {sec.n}
                </span>
              )}
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      collapsed ? 7 : 9,
                letterSpacing: '0.22em',
                fontWeight:    active ? 500 : 400,
              }}>
                {collapsed ? sec.n : sec.label}
              </span>
              {active && !collapsed && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   8,
                  color:      'var(--fg-faint)',
                  marginLeft: 'auto',
                }}>
                  ·
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Contextual content slot ── */}
      <AnimatePresence mode="wait">
        {!collapsed && contextContent && (
          <motion.div
            key="ctx"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              flex:       1,
              overflowY:  'auto',
              overflowX:  'hidden',
              borderTop:  '1px solid var(--border)',
              padding:    '0 0 16px',
              minHeight:  0,
            }}
          >
            {contextContent}
          </motion.div>
        )}
        {!collapsed && !contextContent && (
          <div style={{ flex: 1 }} />
        )}
      </AnimatePresence>
      {collapsed && <div style={{ flex: 1 }} />}

      {/* ── Account block ── */}
      <div style={{
        borderTop:  '1px solid var(--border)',
        padding:    collapsed ? '16px 0' : '16px 24px',
        flexShrink: 0,
        display:    'flex',
        flexDirection: 'column',
        gap:        8,
        alignItems: collapsed ? 'center' : 'flex-start',
      }}>
        {user === undefined ? (
          <div style={{ height: 14 }} />
        ) : user ? (
          <>
            {!collapsed && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                · {user.displayName}
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
                background:    'none',
                border:        'none',
                cursor:        'pointer',
                padding:       0,
                textAlign:     'left',
                transition:    'color 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
            >
              {collapsed ? '↩' : 'Sign Out'}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      8,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color:         'var(--fg-faint)',
              textDecoration:'none',
              transition:    'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
            >
              {collapsed ? '→' : 'Sign In'}
            </Link>
            {!collapsed && (
              <Link href="/register" style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
                textDecoration:'none',
                transition:    'color 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
              >
                Register
              </Link>
            )}
          </>
        )}
      </div>

      {/* ── Bottom folio ── */}
      {!collapsed && (
        <div style={{
          padding:    '10px 24px',
          borderTop:  '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      7,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         'var(--fg-faint)',
          }}>
            {(() => {
              const d = new Date();
              const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][d.getMonth()];
              return `EXHIBIT · ${roman} · ${d.getFullYear()}`;
            })()}
          </div>
        </div>
      )}
    </motion.aside>
  );
}
