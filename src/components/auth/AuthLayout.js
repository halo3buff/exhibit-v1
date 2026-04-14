'use client';
// src/components/auth/AuthLayout.js
// Shared shell for login + register: background images, placard container, keyframes.

import { useState, useEffect } from 'react';
import { imgUrl } from '@/lib/images';

// Fixed background image positions — feel like pieces hung behind the placard
const BG_SLOTS = [
  { top: '4%',  left: '2%',   width: '22%', opacity: 0.7 },
  { top: '2%',  left: '72%',  width: '26%', opacity: 0.7 },
  { top: '55%', left: '5%',   width: '18%', opacity: 0.6 },
  { top: '50%', left: '75%',  width: '22%', opacity: 0.65 },
  { top: '28%', left: '1%',   width: '14%', opacity: 0.5 },
  { top: '22%', left: '82%',  width: '16%', opacity: 0.5 },
];

export default function AuthLayout({ children }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetch('/api/search?limit=12')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.length) return;
        setImages(d.results.filter(r => r.imageUrl).sort(() => Math.random() - 0.5).slice(0, 6));
      })
      .catch(() => {});
  }, []);

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
      {images.map((img, i) => {
        const slot = BG_SLOTS[i];
        if (!slot) return null;
        return (
          <div key={img.id} style={{ position: 'absolute', top: slot.top, left: slot.left, width: slot.width, opacity: slot.opacity, animation: `fade-in 1s ease ${i * 0.15}s both`, pointerEvents: 'none' }}>
            <img src={imgUrl(img.imageUrl, 800)} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} onError={e => { e.target.style.opacity = '0'; }} />
          </div>
        );
      })}

      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-md)',
        padding: '44px 48px 40px',
        width: 400,
        animation: 'fade-up 0.6s ease both',
      }}>
        {children}
      </div>

      <style>{`
        @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-up  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export function Field({ label, type, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 8,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--fg-faint)',
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
          borderBottom: '1px solid var(--border-md)',
          padding: '7px 0',
          color: 'var(--fg)',
          outline: 'none',
          width: '100%',
        }}
      />
    </div>
  );
}
