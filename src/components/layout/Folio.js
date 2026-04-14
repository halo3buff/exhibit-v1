'use client';
// src/components/layout/Folio.js
// Typographic folio — section number, title, date.

export default function Folio({ section, number, date }) {
  const d = date ?? new Date();
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][d.getMonth()];
  const label = `${number ? `${number} · ` : ''}${section}  —  ${roman} · ${d.getFullYear()}`;

  return (
    <div style={{
      fontFamily:    'var(--font-mono)',
      fontSize:      8,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color:         'var(--fg-faint)',
      userSelect:    'none',
    }}>
      {label}
    </div>
  );
}
