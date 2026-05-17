'use client';

import { useState, useEffect } from 'react';

export default function SaveToExhibit({ artworkId }) {
  const [user,     setUser]     = useState(undefined);
  const [exhibits, setExhibits] = useState([]);
  const [open,     setOpen]     = useState(false);
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(null);
  const [saved,    setSaved]    = useState(null);
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits); })
      .catch(() => {});
  }, [open, user]);

  async function saveToExhibit(exhibitId) {
    setSaving(exhibitId);
    const res = await fetch(`/api/exhibits/${exhibitId}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ artworkId, note }),
    });
    setSaving(null);
    if (res.ok) {
      setSaved(exhibitId);
      setNote('');
      setShowNote(false);
      setTimeout(() => { setSaved(null); setOpen(false); }, 1800);
    }
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <a href="/login" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)', textDecoration: 'none' }}>
        Sign in to save →
      </a>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         open ? 'var(--fg)' : 'var(--fg-faint)',
          background:    'none',
          border:        'none',
          cursor:        'pointer',
          padding:       0,
          transition:    'color 0.12s',
        }}
      >
        + Save to Exhibit
      </button>

      {open && (
        <div style={{
          position:  'absolute',
          bottom:    'calc(100% + 8px)',
          right:     0,
          background: 'var(--bg-card)',
          border:    '1px solid var(--border-md)',
          minWidth:  200,
          zIndex:    10,
        }}>
          {exhibits.length === 0 ? (
            <div style={{ padding: '12px 16px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', letterSpacing: '0.12em' }}>No exhibits yet</p>
              <a href="/exhibits" style={{ display: 'block', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-faint)', textDecoration: 'none' }}>
                Create one →
              </a>
            </div>
          ) : (
            <>
              {exhibits.map(ex => (
                <div key={ex.id}>
                  <button
                    onClick={() => saveToExhibit(ex.id)}
                    disabled={saving === ex.id}
                    style={{
                      display:    'block',
                      width:      '100%',
                      textAlign:  'left',
                      padding:    '10px 16px',
                      fontFamily: 'var(--font-sans)',
                      fontSize:   11,
                      fontWeight: 300,
                      color:      saved === ex.id ? 'var(--fg)' : 'var(--fg-muted)',
                      background: 'none',
                      border:     'none',
                      borderBottom: '1px solid var(--border)',
                      cursor:     'pointer',
                    }}
                  >
                    {saved === ex.id ? '✓ Saved' : saving === ex.id ? 'Saving…' : ex.title}
                  </button>
                </div>
              ))}

              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setShowNote(v => !v)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showNote ? '− Hide note' : '+ Add note'}
                </button>
                {showNote && (
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Why does this piece matter to you?"
                    rows={3}
                    style={{
                      display:    'block',
                      width:      '100%',
                      marginTop:  8,
                      fontFamily: 'var(--font-sans)',
                      fontSize:   10,
                      fontWeight: 300,
                      color:      'var(--fg)',
                      background: 'var(--bg)',
                      border:     '1px solid var(--border-md)',
                      padding:    '6px 8px',
                      outline:    'none',
                      resize:     'none',
                      lineHeight: 1.5,
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
