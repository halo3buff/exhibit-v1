'use client';
// src/components/exhibits/CreateModal.js
// Full-screen modal overlay for creating a new exhibit.

import { useState } from 'react';

export default function CreateModal({ onSubmit, onCancel, creating }) {
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');

  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: 'none', padding: '52px 56px', width: 440, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#888', margin: 0, marginBottom: 24 }}>New Exhibit</p>
        <input className="create-modal-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: '#0d0d0d', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '4px 0' }} />
        <input className="create-modal-desc-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: '#555', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <button onClick={() => title.trim() && onSubmit(title, desc)} disabled={creating || !title.trim()}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: creating || !title.trim() ? '#aaa' : '#ffffff',
              background: creating || !title.trim() ? '#e5e5e5' : '#0d0d0d',
              border: 'none',
              padding: '11px 28px',
              cursor: creating || !title.trim() ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onCancel} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
