'use client';
// src/app/register/page.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout, { Field } from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push('/exhibits');
    router.refresh();
  }

  return (
    <AuthLayout>
      {/* Placard header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 10 }}>
          EXHIBIT — Personal Archive
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 400, color: '#1a1a1a', lineHeight: 1.2, marginBottom: 2 }}>
          Create account
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, fontStyle: 'italic', color: '#1a1a1a' }}>
          Begin building your archive
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', marginBottom: 28 }} />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Display Name" type="text"     value={displayName} onChange={setDisplayName} />
        <Field label="Email"        type="email"    value={email}       onChange={setEmail} />
        <Field label="Password"     type="password" value={password}    onChange={setPassword} />

        {error && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#c0392b', marginTop: -8 }}>{error}</p>
        )}

        <button type="submit" disabled={loading} style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', background: '#1a1a1a', color: '#f9f9f8', border: 'none', padding: '13px 0', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, width: '100%', transition: 'opacity 0.15s' }}>
          {loading ? 'Creating…' : 'Open Account'}
        </button>
      </form>

      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginTop: 28, marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>Already a member?</span>
        <Link href="/login" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)', textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', paddingBottom: 1 }}>
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
