'use client';
// src/components/Nav.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Nav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user,    setUser]    = useState(undefined); // undefined = loading
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch current session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]); // re-check on navigation

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  }

  // Hide nav on the wander page — it has its own full-screen layout
  // (but keep it on all other pages)
  const isWander = pathname === '/wander';

  if (isWander) return null;

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 44,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 48px',
        justifyContent: 'space-between',
      }}>

        {/* Left — wordmark */}
        <Link href="/" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: 'var(--fg)',
          textDecoration: 'none',
        }}>
          EXHIBIT
        </Link>

        {/* Center — main links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <NavLink href="/wander" active={pathname === '/wander'}>Index</NavLink>
          <NavLink href="/gallery" active={pathname.startsWith('/gallery')}>Gallery</NavLink>
          {user && (
            <NavLink href="/exhibits" active={pathname.startsWith('/exhibits')}>Exhibits</NavLink>
          )}
        </div>

        {/* Right — auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {user === undefined ? (
            // Loading state — blank to avoid flash
            <span style={{ width: 60 }} />
          ) : user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {user.displayName}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  background: 'var(--bg)',
                  border: '1px solid var(--border-md)',
                  minWidth: 140,
                  zIndex: 200,
                }}>
                  <Link
                    href="/exhibits"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '10px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-muted)',
                      textDecoration: 'none',
                    }}
                  >
                    My Exhibits
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-faint)',
                      background: 'none',
                      border: 'none',
                      borderTop: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink href="/login" active={pathname === '/login'}>Sign In</NavLink>
              <Link
                href="/register"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--bg)',
                  background: 'var(--fg)',
                  padding: '5px 14px',
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Spacer so content doesn't hide under fixed nav */}
      <div style={{ height: 44 }} />
    </>
  );
}

function NavLink({ href, active, children }) {
  return (
    <Link href={href} style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: active ? 'var(--fg)' : 'var(--fg-faint)',
      fontWeight: active ? 500 : 400,
      textDecoration: 'none',
      transition: 'color 0.12s',
    }}>
      {children}
    </Link>
  );
}