'use client';
// src/components/Nav.js
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Nav() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [user,     setUser]     = useState(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible,  setVisible]  = useState(true);
  const lastScrollY = useRef(0);
  const ticking    = useRef(false);

  // Re-check session on every navigation
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  // Scroll fade — hide on scroll down, show on scroll up
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 40) {
          setVisible(true);
        } else if (y > lastScrollY.current + 8) {
          setVisible(false);
          setMenuOpen(false);
        } else if (y < lastScrollY.current - 8) {
          setVisible(true);
        }
        lastScrollY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  // Hide entirely on wander — it has its own full-screen layout
  if (pathname === '/wander') return null;

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 44,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 48px',
        justifyContent: 'space-between',
        // Scroll fade
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        pointerEvents: visible ? 'all' : 'none',
      }}>

        {/* Wordmark */}
        <Link href="/" style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--fg)', textDecoration: 'none' }}>
          EXHIBIT
        </Link>

        {/* Center links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <NavLink href="/wander"  active={pathname === '/wander'}>Index</NavLink>
          <NavLink href="/gallery" active={pathname.startsWith('/gallery')}>Gallery</NavLink>
          {user && <NavLink href="/exhibits" active={pathname.startsWith('/exhibits')}>Exhibits</NavLink>}
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {user === undefined ? (
            <span style={{ width: 60 }} />
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {user.displayName}
              </button>

              {menuOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, background: 'var(--bg)', border: '1px solid var(--border-md)', minWidth: 140, zIndex: 200 }}>
                  <Link href="/exhibits" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', textDecoration: 'none' }}>
                    My Exhibits
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink href="/login"    active={pathname === '/login'}>Sign In</NavLink>
              <Link href="/register" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--bg)', background: 'var(--fg)', padding: '5px 14px', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ height: 44 }} />
    </>
  );
}

function NavLink({ href, active, children }) {
  return (
    <Link href={href} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: active ? 'var(--fg)' : 'var(--fg-faint)', fontWeight: active ? 500 : 400, textDecoration: 'none', transition: 'color 0.12s' }}>
      {children}
    </Link>
  );
}