'use client';
// src/app/register/page.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 360 }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)', marginBottom: 8 }}>
            Create account
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            Start building your archive
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Display Name" type="text" value={displayName} onChange={setDisplayName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          {error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#c0392b', letterSpacing: '0.06em' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
            background: 'var(--fg)', color: 'var(--bg)', border: 'none',
            padding: '13px 0', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1, width: '100%',
          }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 28, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--fg-faint)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--fg-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border-md)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, required = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300,
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-md)',
          padding: '8px 0', color: 'var(--fg)', outline: 'none', width: '100%',
        }}
      />
    </div>
  );
}