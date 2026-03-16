'use client';
// src/app/exhibits/page.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function imgUrl(url) {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}&size=400`;
}

export default function ExhibitsPage() {
  const router = useRouter();
  const [exhibits,  setExhibits]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');

  useEffect(() => {
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function createExhibit(e) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/exhibits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      router.push(`/exhibits/${data.exhibit.id}`);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '52px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 52, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)', lineHeight: 1, marginBottom: 8 }}>
            Exhibits
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            {exhibits.length} {exhibits.length === 1 ? 'exhibit' : 'exhibits'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
            background: showForm ? 'var(--fg)' : 'transparent',
            color: showForm ? 'var(--bg)' : 'var(--fg-muted)',
            border: '1px solid var(--border-md)', padding: '9px 20px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {showForm ? 'Cancel' : '+ New Exhibit'}
        </button>
      </div>

      {/* New exhibit form */}
      {showForm && (
        <form onSubmit={createExhibit} style={{
          marginBottom: 48, padding: '28px 32px',
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Exhibit"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-md)', padding: '8px 0', color: 'var(--fg)', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Description <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <input
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What is this exhibit about?"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-md)', padding: '8px 0', color: 'var(--fg)', outline: 'none' }}
            />
          </div>
          <button type="submit" disabled={creating} style={{
            alignSelf: 'flex-start', marginTop: 4,
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
            background: 'var(--fg)', color: 'var(--bg)', border: 'none', padding: '10px 24px', cursor: 'pointer',
            opacity: creating ? 0.6 : 1,
          }}>
            {creating ? 'Creating…' : 'Create Exhibit'}
          </button>
        </form>
      )}

      {/* Empty state */}
      {exhibits.length === 0 && !showForm && (
        <div style={{ paddingTop: 80, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--fg-muted)', marginBottom: 8 }}>No exhibits yet</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--fg-faint)' }}>
            Create one, then add pieces from the{' '}
            <Link href="/gallery?type=Graphic+Design" style={{ color: 'var(--fg-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border-md)' }}>gallery</Link>
          </p>
        </div>
      )}

      {/* Exhibits grid */}
      {exhibits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {exhibits.map(ex => (
            <Link key={ex.id} href={`/exhibits/${ex.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ cursor: 'pointer' }}>
                {/* Cover image or placeholder */}
                <div style={{ aspectRatio: '4/3', background: 'var(--bg-card)', overflow: 'hidden', marginBottom: 12 }}>
                  {ex.coverImageUrl ? (
                    <img
                      src={imgUrl(ex.coverImageUrl)}
                      alt={ex.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Empty</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--fg)', marginBottom: 4, letterSpacing: '0.01em' }}>
                  {ex.title}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', letterSpacing: '0.04em' }}>
                    {ex.itemCount} {ex.itemCount === 1 ? 'piece' : 'pieces'}
                  </span>
                  {ex.isPublic ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', letterSpacing: '0.04em' }}>Public</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}