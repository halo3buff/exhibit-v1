'use client';
// src/components/canvas/MoveToExhibitPicker.js
// Dropdown list for moving an item from the current exhibit to another one.

import { useState, useEffect } from 'react';

export default function MoveToExhibitPicker({ currentExhibitId, itemId, onDone }) {
  const [exhibits, setExhibits] = useState([]);
  const [moving, setMoving]     = useState(null);

  useEffect(() => {
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits.filter(e => e.id !== currentExhibitId)); })
      .catch(() => {});
  }, [currentExhibitId]);

  async function moveTo(targetId) {
    setMoving(targetId);
    try {
      await fetch(`/api/exhibits/${targetId}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: itemId }),
      });
      await fetch(`/api/exhibits/${currentExhibitId}/items/${itemId}`, { method: 'DELETE' });
      onDone();
    } catch (_) { setMoving(null); }
  }

  if (exhibits.length === 0) return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dark-faint)', letterSpacing: '0.1em' }}>No other exhibits</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {exhibits.map(ex => (
        <button key={ex.id} onClick={() => moveTo(ex.id)} disabled={!!moving}
          style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: moving === ex.id ? 'rgba(247,246,241,0.9)' : 'rgba(247,246,241,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', borderBottom: '1px solid rgba(247,246,241,0.06)', transition: 'color 0.12s' }}
          onMouseEnter={e => { if (!moving) e.currentTarget.style.color = 'rgba(247,246,241,0.9)'; }}
          onMouseLeave={e => { if (!moving) e.currentTarget.style.color = 'rgba(247,246,241,0.55)'; }}
        >
          {moving === ex.id ? 'Moving…' : ex.title}
        </button>
      ))}
    </div>
  );
}
