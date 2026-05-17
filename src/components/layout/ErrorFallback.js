'use client';

export default function ErrorFallback({ error, reset }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 44px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      padding: 'clamp(48px, 8vw, 96px) var(--gutter)',
    }}>
      <h1 style={{
        fontFamily:    'var(--font-condensed)',
        fontSize:      'clamp(1.8rem, 3.5vw, 5rem)',
        fontWeight:    700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color:         'var(--fg)',
        marginBottom:  16,
      }}>
        Something went wrong
      </h1>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize:   11,
        letterSpacing: '0.06em',
        color:      'var(--fg-muted)',
        marginBottom: 32,
        maxWidth:   480,
        lineHeight: 1.6,
      }}>
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         'var(--fg)',
          background:    'none',
          border:        '1px solid var(--border-md)',
          padding:       '8px 18px',
          cursor:        'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
