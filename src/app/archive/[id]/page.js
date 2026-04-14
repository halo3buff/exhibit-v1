'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SOURCE_LABELS } from '@/lib/constants';
import { imgUrl } from '@/lib/images';

/* Render a year with mixed-weight type — "202" light, final digit bold */
function MixedWeightYear({ year }) {
  if (!year || typeof year !== 'string') return null;
  const clean = year.trim();
  // Apply mixed weight only to clean 4-digit years
  if (/^\d{4}$/.test(clean)) {
    const prefix = clean.slice(0, -1);
    const last   = clean.slice(-1);
    return (
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 'clamp(3rem, 6vw, 6rem)', lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
        <span style={{ fontWeight: 600 }}>{prefix}</span>
        <span style={{ fontWeight: 800 }}>{last}</span>
      </span>
    );
  }
  return (
    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 'clamp(2rem, 4vw, 4rem)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)', lineHeight: 1 }}>
      {clean}
    </span>
  );
}

export default function ArtifactPage({ params }) {
  const resolvedParams = use(params);
  const artifactId     = decodeURIComponent(resolvedParams.id);
  const [artifact,  setArtifact]  = useState(null);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    fetch(`/api/search/artwork/${encodeURIComponent(artifactId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.item) setArtifact(data.item);
        else            setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [artifactId]);

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '64px 80px' }}>
      <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)', textDecoration: 'none' }}>
        ← Index
      </Link>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginTop: 64 }}>
        Artifact Not Found
      </p>
    </div>
  );

  if (!artifact) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '64px 80px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
        Retrieving…
      </p>
    </div>
  );

  const sourceLabel = SOURCE_LABELS[artifact.source?.toLowerCase()] || artifact.source;

  const meta = [
    ['Artist',     artifact.author],
    ['Medium',     artifact.medium],
    ['Department', artifact.department],
    ['Collection', sourceLabel],
    ['Identifier', artifact.id],
  ].filter(([, v]) => v?.toString().trim() && v !== 'Unknown' && v !== 'Uncategorized');

  return (
    <div style={{ minHeight: 'calc(100vh - 44px)', background: 'var(--bg)', color: 'var(--fg)' }}>

      {/* ── Back link ── */}
      <div style={{ padding: '20px 80px' }}>
        <Link href="/" style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      8,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color:         'var(--fg-faint)',
          textDecoration:'none',
          transition:    'color 0.12s',
        }}
        onMouseEnter={e => e.target.style.color = 'var(--fg)'}
        onMouseLeave={e => e.target.style.color = 'var(--fg-faint)'}
        >
          ← Index
        </Link>
      </div>

      {/* ── Main content: 55% image left, 45% meta right ── */}
      <div style={{
        display:  'grid',
        gridTemplateColumns: '55fr 45fr',
        minHeight: 'calc(100vh - 44px - 56px)',
        alignItems: 'stretch',
      }}>

        {/* ── Left: Artwork image ── */}
        <div className="anim-scale-in" style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '80px 64px',
          background:      'var(--bg)',
          minHeight:       '70vh',
        }}>
          <img
            src={imgUrl(artifact.imageUrl, 1200)}
            alt={artifact.title}
            style={{
              maxHeight:   '80vh',
              maxWidth:    '100%',
              objectFit:   'contain',
              display:     'block',
            }}
            onError={e => { e.target.style.opacity = '0.15'; }}
          />
        </div>

        {/* ── Right: Metadata ── */}
        <div className="anim-fade-up d-1" style={{
          padding:         '80px 64px',
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'flex-start',
        }}>

          {/* Source label — tracked uppercase mono */}
          <p style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color:         'var(--fg-faint)',
            margin:        '0 0 24px',
          }}>
            {sourceLabel}
          </p>

          {/* Title — bold condensed, all caps */}
          <h1 style={{
            fontFamily:    'var(--font-condensed)',
            fontSize:      'clamp(2.5rem, 5vw, 6rem)',
            fontWeight:    700,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight:    0.9,
            color:         'var(--fg)',
            margin:        '0 0 40px',
          }}>
            {artifact.title}
          </h1>

          {/* Year — mixed-weight type treatment */}
          {artifact.year && artifact.year !== 'n.d.' && (
            <div style={{ marginBottom: 52 }}>
              <MixedWeightYear year={artifact.year} />
            </div>
          )}

          {/* Meta fields — stacked DM Mono labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 40 }}>
            {meta.map(([label, value]) => (
              <div key={label}>
                <p style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      7.5,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color:         'var(--fg-faint)',
                  margin:        '0 0 5px',
                }}>
                  {label}
                </p>
                <p style={{
                  fontFamily:    label === 'Identifier' ? 'var(--font-mono)' : 'var(--font-sans)',
                  fontSize:      label === 'Identifier' ? 10 : 13,
                  fontWeight:    300,
                  color:         'var(--fg)',
                  lineHeight:    1.5,
                  margin:        0,
                  wordBreak:     'break-word',
                }}>
                  {value}
                </p>
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
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
                textDecoration:'none',
                transition:    'color 0.12s',
                display:       'inline-block',
                marginTop:     'auto',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--fg)'}
              onMouseLeave={e => e.target.style.color = 'var(--fg-faint)'}
            >
              View at source →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
