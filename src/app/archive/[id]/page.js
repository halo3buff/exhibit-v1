'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SOURCE_LABELS } from '@/lib/constants';

export default function ArtifactPage({ params }) {
  const resolvedParams = use(params);
  const artifactId     = decodeURIComponent(resolvedParams.id);
  const [artifact,  setArtifact]  = useState(null);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    fetch(`/api/artwork/${encodeURIComponent(artifactId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.item) setArtifact(data.item);
        else            setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [artifactId]);

  if (notFound) return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.45rem',
        letterSpacing: '0.35em', textTransform: 'uppercase',
        color: 'var(--dark-faint)',
      }}>Artifact Not Found</p>
      <Link href="/wander" style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.45rem',
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: 'var(--dark-faint)', textDecoration: 'none',
        borderBottom: '1px solid var(--dark-border)',
        paddingBottom: '2px',
      }}>
        Return to Index
      </Link>
    </div>
  );

  if (!artifact) return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1rem',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.45rem',
        letterSpacing: '0.35em', textTransform: 'uppercase',
        color: 'var(--dark-faint)',
        animation: 'fade-in 0.8s ease infinite alternate',
      }}>Retrieving…</p>
    </div>
  );

  const sourceLabel = SOURCE_LABELS[artifact.source?.toLowerCase()] || artifact.source;

  const meta = [
    ['Artist',     artifact.author],
    ['Year',       artifact.year],
    ['Medium',     artifact.medium],
    ['Department', artifact.department],
    ['Collection', sourceLabel],
    ['Identifier', artifact.id],
  ].filter(([, v]) => v?.toString().trim());

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark-bg)', color: 'var(--dark-fg)' }}>
      {/* Top navigation */}
      <div style={{
        padding: '1.75rem 2.5rem',
        borderBottom: '1px solid var(--dark-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/wander" style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.44rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--dark-faint)',
          textDecoration: 'none',
          transition: 'color 0.15s',
        }}>
          ← Index
        </Link>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.42rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--dark-faint)',
        }}>Exhibit</span>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '4rem 2.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '5rem',
        alignItems: 'start',
      }}>
        {/* ── Left: Image ── */}
        <div className="anim-scale-in" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(247,246,241,0.03)',
          border: '1px solid var(--dark-border)',
          padding: '2rem',
          minHeight: '500px',
        }}>
          <img
            src={artifact.imageUrl}
            alt={artifact.title}
            style={{
              maxHeight: '75vh',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
            onError={e => { e.target.style.opacity = '0.15'; }}
          />
        </div>

        {/* ── Right: Text ── */}
        <div className="anim-fade-up d-1" style={{
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '1rem',
        }}>
          {/* Source */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.44rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--dark-faint)',
            marginBottom: '1.25rem',
          }}>{sourceLabel}</p>

          {/* Title */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 300,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--dark-fg)',
            marginBottom: '0.75rem',
          }}>{artifact.title}</h1>

          {/* Author */}
          {artifact.author && (
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--dark-muted)',
              marginBottom: '3rem',
            }}>{artifact.author}</p>
          )}

          {/* Meta grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.75rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--dark-border)',
          }}>
            {meta.map(([label, value]) => (
              <div key={label}>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.38rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--dark-faint)',
                  marginBottom: '0.4rem',
                }}>{label}</p>
                <p style={{
                  fontFamily: label === 'Identifier' ? 'var(--font-mono)' : 'var(--font-sans)',
                  fontSize: label === 'Identifier' ? '0.55rem' : '0.7rem',
                  color: 'var(--dark-muted)',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Source link */}
          {artifact.link && (
            <a
              href={artifact.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '3rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                border: '1px solid var(--dark-border)',
                padding: '0.9rem 2.25rem',
                color: 'var(--dark-muted)',
                textDecoration: 'none',
                transition: 'all 0.22s ease',
              }}
              onMouseEnter={e => {
                e.target.style.background = 'var(--dark-fg)';
                e.target.style.color      = 'var(--dark-bg)';
                e.target.style.border     = '1px solid var(--dark-fg)';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'transparent';
                e.target.style.color      = 'var(--dark-muted)';
                e.target.style.border     = '1px solid var(--dark-border)';
              }}
            >
              Access Original Registry
            </a>
          )}
        </div>
      </div>
    </div>
  );
}