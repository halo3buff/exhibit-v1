// src/app/exhibits/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function coverImgUrl(url) {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}&size=400`;
}

function ExhibitCard({ exhibit, onClick }) {
  const year = new Date(exhibit.createdAt).getFullYear();
  return (
    <div className="exhibit-card" onClick={() => onClick(exhibit)}>
      {/* Image — three stacked layers like loose prints */}
      <div className="card-image-stack">
        {exhibit.itemCount > 2 && <div className="stack-back" />}
        {exhibit.itemCount > 1 && <div className="stack-mid" />}
        <div className="stack-front">
          {exhibit.coverImageUrl ? (
            <img
              src={coverImgUrl(exhibit.coverImageUrl)}
              alt={exhibit.title}
              className="cover-img"
            />
          ) : (
            <div className="cover-empty">
              <span>Empty</span>
            </div>
          )}
        </div>
      </div>

      {/* Caption block — Taschen style */}
      <div className="card-caption">
        <div className="caption-top">
          <h3 className="caption-title">{exhibit.title}</h3>
          {exhibit.description && (
            <p className="caption-desc">{exhibit.description}</p>
          )}
        </div>
        <div className="caption-meta">
          <span className="caption-count">{exhibit.itemCount} {exhibit.itemCount === 1 ? 'piece' : 'pieces'}</span>
          <span className="caption-year">{year}</span>
        </div>
      </div>
    </div>
  );
}

function CreateModal({ onSubmit, onCancel, creating }) {
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');

  return (
    <div className="create-overlay" onClick={onCancel}>
      <div className="create-modal" onClick={e => e.stopPropagation()}>
        <p className="create-eyebrow">New Exhibit</p>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          className="create-title-input"
        />
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          className="create-desc-input"
        />
        <div className="create-actions">
          <button
            onClick={() => title.trim() && onSubmit(title, desc)}
            disabled={creating || !title.trim()}
            className="create-submit"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onCancel} className="create-cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ExhibitsPage() {
  const router = useRouter();
  const [exhibits, setExhibits] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(title, desc) {
    setCreating(true);
    const res  = await fetch('/api/exhibits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Untitled Exhibit', description: desc }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/exhibits/${data.exhibit.id}`);
  }

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.22)' }}>Loading</p>
    </div>
  );

  return (
    <main className="exhibits-root">

      {/* ── Header ── */}
      <div className="exhibits-header">
        <div>
          <p className="header-eyebrow">Personal Archive</p>
          <h1 className="header-title">Exhibits</h1>
          <p className="header-count">{exhibits.length} {exhibits.length === 1 ? 'exhibit' : 'exhibits'}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="new-btn">
          + New Exhibit
        </button>
      </div>

      <div className="header-rule" />

      {/* ── Empty ── */}
      {exhibits.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No exhibits yet</p>
          <p className="empty-sub">
            Create one, then save pieces from the{' '}
            <Link href="/gallery?type=Graphic+Design" className="empty-link">gallery</Link>
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {exhibits.length > 0 && (
        <div className="exhibits-grid">
          {exhibits.map((ex, i) => (
            <div
              key={ex.id}
              style={{ animation: `rise 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both` }}
            >
              <ExhibitCard exhibit={ex} onClick={() => router.push(`/exhibits/${ex.id}`)} />
            </div>
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showForm && (
        <CreateModal
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          creating={creating}
        />
      )}

      <style>{`
        .exhibits-root {
          min-height: calc(100vh - 44px);
          background: #fafaf8;
          padding: 52px 56px 80px;
        }
        .exhibits-header {
          display: flex; align-items: flex-end;
          justify-content: space-between; margin-bottom: 24px;
        }
        .header-eyebrow {
          font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.3em;
          text-transform: uppercase; color: rgba(0,0,0,0.25); margin: 0 0 10px;
        }
        .header-title {
          font-family: var(--font-sans); font-size: clamp(2rem, 3vw, 2.75rem);
          font-weight: 300; letter-spacing: -0.03em; color: rgba(0,0,0,0.82);
          line-height: 1; margin: 0 0 8px;
        }
        .header-count {
          font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
          text-transform: uppercase; color: rgba(0,0,0,0.25); margin: 0;
        }
        .new-btn {
          font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.22em;
          text-transform: uppercase; background: transparent;
          color: rgba(0,0,0,0.55); border: 1px solid rgba(0,0,0,0.18);
          padding: 10px 22px; cursor: pointer; transition: all 0.15s;
        }
        .new-btn:hover {
          background: rgba(0,0,0,0.82); color: #fafaf8;
          border-color: rgba(0,0,0,0.82);
        }
        .header-rule {
          height: 1px; background: rgba(0,0,0,0.07); margin-bottom: 52px;
        }
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 100px 0; gap: 10px;
        }
        .empty-title {
          font-family: var(--font-sans); font-size: 15px; font-weight: 300;
          color: rgba(0,0,0,0.4); margin: 0;
        }
        .empty-sub {
          font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em;
          color: rgba(0,0,0,0.25); margin: 0;
        }
        .empty-link {
          color: rgba(0,0,0,0.4); text-decoration: none;
          border-bottom: 1px solid rgba(0,0,0,0.15); padding-bottom: 1px;
        }
        .exhibits-grid {
          display: flex; flex-wrap: wrap; gap: 52px 36px; align-items: flex-start;
        }

        /* ── Exhibit card ── */
        .exhibit-card {
          cursor: pointer; display: flex; flex-direction: column;
          transition: opacity 0.2s;
        }
        .exhibit-card:hover { opacity: 0.9; }

        .card-image-stack {
          position: relative; width: 280px; padding-bottom: 10px;
        }
        .stack-back, .stack-mid {
          position: absolute; bottom: 0; left: 0; right: 0; aspect-ratio: 4/3;
        }
        .stack-back {
          background: rgba(0,0,0,0.06);
          transform: rotate(3deg) translate(5px, 0);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .stack-mid {
          background: rgba(0,0,0,0.04);
          transform: rotate(1.2deg) translate(2px, 0);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stack-front {
          position: relative; aspect-ratio: 4/3;
          background: rgba(0,0,0,0.03); overflow: hidden;
          box-shadow: 0 3px 16px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .cover-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .exhibit-card:hover .cover-img { transform: scale(1.02); }
        .cover-empty {
          width: 100%; height: 100%; display: flex;
          align-items: center; justify-content: center;
        }
        .cover-empty span {
          font-family: var(--font-mono); font-size: 8px;
          letter-spacing: 0.2em; text-transform: uppercase; color: rgba(0,0,0,0.2);
        }

        /* Caption */
        .card-caption {
          width: 280px; padding-top: 14px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .caption-top {}
        .caption-title {
          font-family: var(--font-sans); font-size: 14px; font-weight: 400;
          color: rgba(0,0,0,0.72); margin: 0 0 4px; line-height: 1.3;
        }
        .caption-desc {
          font-family: var(--font-sans); font-size: 11px; font-style: italic;
          font-weight: 300; color: rgba(0,0,0,0.4); margin: 0; line-height: 1.4;
        }
        .caption-meta {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.07);
        }
        .caption-count {
          font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.12em;
          color: rgba(0,0,0,0.28);
        }
        .caption-year {
          font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.1em;
          color: rgba(0,0,0,0.22);
        }

        /* ── Create modal ── */
        .create-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(250,250,248,0.85);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
        }
        .create-modal {
          background: #fafaf8; border: 1px solid rgba(0,0,0,0.1);
          padding: 36px 40px; width: 380px;
          box-shadow: 0 8px 48px rgba(0,0,0,0.1);
          display: flex; flex-direction: column; gap: 16px;
        }
        .create-eyebrow {
          font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.3em;
          text-transform: uppercase; color: rgba(0,0,0,0.3); margin: 0 0 4px;
        }
        .create-title-input {
          font-family: var(--font-sans); font-size: 22px; font-weight: 300;
          letter-spacing: -0.02em; color: rgba(0,0,0,0.8);
          background: transparent; border: none;
          border-bottom: 1px solid rgba(0,0,0,0.15);
          outline: none; width: 100%; padding: 4px 0;
        }
        .create-title-input::placeholder { color: rgba(0,0,0,0.18); }
        .create-desc-input {
          font-family: var(--font-sans); font-size: 13px; font-style: italic;
          font-weight: 300; color: rgba(0,0,0,0.55);
          background: transparent; border: none;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          outline: none; width: 100%; padding: 4px 0;
        }
        .create-desc-input::placeholder { color: rgba(0,0,0,0.18); }
        .create-actions {
          display: flex; justify-content: space-between;
          align-items: center; padding-top: 8px;
        }
        .create-submit {
          font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.22em;
          text-transform: uppercase; color: rgba(0,0,0,0.78);
          background: none; border: 1px solid rgba(0,0,0,0.25);
          padding: 9px 22px; cursor: pointer; transition: all 0.15s;
        }
        .create-submit:hover:not(:disabled) {
          background: rgba(0,0,0,0.82); color: #fafaf8;
        }
        .create-submit:disabled { opacity: 0.3; cursor: default; }
        .create-cancel {
          font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(0,0,0,0.28);
          background: none; border: none; cursor: pointer;
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}