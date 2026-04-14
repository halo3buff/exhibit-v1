'use client';
// src/components/layout/TopNav.js
// Fixed 44px top nav — logo left, nav links right. No border, floats above content.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function PinwheelMark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <g transform="rotate(20, 8, 8)">
        <rect x="0.5" y="0.5" width="6.5" height="6.5" fill="#e8312a"/>
        <rect x="9"   y="0.5" width="6.5" height="6.5" fill="#e8312a"/>
        <rect x="9"   y="9"   width="6.5" height="6.5" fill="#e8312a"/>
        <rect x="0.5" y="9"   width="6.5" height="6.5" fill="#e8312a"/>
      </g>
    </svg>
  );
}

const SECTIONS = [
  { label: 'INDEX',    href: '/'         },
  { label: 'GALLERY',  href: '/gallery'  },
  { label: 'EXHIBITS', href: '/exhibits' },
];

function isActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function TopNav() {
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

  return (
    <header style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      height:         44,
      zIndex:         100,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 36px',
      background:     'var(--bg)',
    }}>

      {/* ── Logo — far left ── */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <PinwheelMark size={14} />
        <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      10,
          fontWeight:    400,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color:         'var(--fg)',
          lineHeight:    1,
        }}>
          EXHIBIT
        </span>
      </Link>

      {/* ── Nav links + auth — far right ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {SECTIONS
          .filter(s => s.href !== '/exhibits' || !!user)
          .map(sec => {
            const active = isActive(pathname, sec.href);
            return (
              <Link
                key={sec.label}
                href={sec.href}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      9,
                  fontWeight:    400,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  textDecoration:'none',
                  color:         active ? 'var(--fg)' : 'var(--fg-faint)',
                  transition:    'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
                onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--fg)' : 'var(--fg-faint)'}
              >
                {sec.label}
              </Link>
            );
          })
        }

        {user === undefined ? null : user ? (
          <button
            onClick={handleLogout}
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    400,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color:         'var(--fg-faint)',
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              padding:       0,
              transition:    'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    400,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color:         'var(--fg-faint)',
              textDecoration:'none',
              transition:    'color 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--fg)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
          >
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}
