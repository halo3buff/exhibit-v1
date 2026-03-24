'use client';
// src/app/login/page.js
// The archive waits behind a museum placard. You sign in through the placard.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function hqUrl(url) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=800`;
}

// Fixed background image positions — feel like pieces hung behind the placard
const BG_SLOTS = [
  { top: '4%',  left: '2%',   width: '22%', opacity: 0.7 },
  { top: '2%',  left: '72%',  width: '26%', opacity: 0.7 },
  { top: '55%', left: '5%',   width: '18%', opacity: 0.6 },
  { top: '50%', left: '75%',  width: '22%', opacity: 0.65 },
  { top: '28%', left: '1%',   width: '14%', opacity: 0.5 },
  { top: '22%', left: '82%',  width: '16%', opacity: 0.5 },
];

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [images,   setImages]   = useState([]);

  useEffect(() => {
    fetch('/api/search?limit=12')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.length) return;
        setImages(d.results.filter(r => r.imageUrl).sort(() => Math.random() - 0.5).slice(0, 6));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push('/exhibits');
    router.refresh();
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Scattered background images */}
      {images.map((img, i) => {
        const slot = BG_SLOTS[i];
        if (!slot) return null;
        return (
          <div
            key={img.id}
            style={{
              position: 'absolute',
              top: slot.top,
              left: slot.left,
              width: slot.width,
              opacity: slot.opacity,
              animation: `fade-in 1s ease ${i * 0.15}s both`,
              pointerEvents: 'none',
            }}
          >
            <img
              src={hqUrl(img.imageUrl)}
              alt=""
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onError={e => { e.target.style.opacity = '0'; }}
            />
          </div>
        );
      })}

      {/* The placard — centered, contains the form */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: '#f9f9f8',
        padding: '44px 48px 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
        width: 400,
        animation: 'fade-up 0.6s ease both',
      }}>

        {/* Placard header — institution + exhibit name */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.35)',
            marginBottom: 10,
          }}>
            EXHIBIT — Personal Archive
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            fontWeight: 700,
            color: '#1a1a1a',
            lineHeight: 1.2,
            marginBottom: 2,
          }}>
            Sign in
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 400,
            fontStyle: 'italic',
            color: '#1a1a1a',
          }}>
            Welcome back to your archive
          </div>
        </div>

        {/* Thin rule — like the line on a museum placard */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', marginBottom: 28 }} />

        {/* Form fields */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Email"    type="email"    value={email}    onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          {error && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#c0392b', marginTop: -8 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              background: '#1a1a1a',
              color: '#f9f9f8',
              border: 'none',
              padding: '13px 0',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              width: '100%',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Enter Archive'}
          </button>
        </form>

        {/* Accession-number style footer */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginTop: 28, marginBottom: 16 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>
            New visitor?
          </span>
          <Link href="/register" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.55)',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(0,0,0,0.2)',
            paddingBottom: 1,
          }}>
            Create Account
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-up  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function Field({ label, type, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.4)',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 400,
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.15)',
          padding: '7px 0',
          color: '#1a1a1a',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}