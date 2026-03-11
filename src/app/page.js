import Link from 'next/link';

export default function Home() {
  return (
    <main className="h-screen w-full flex flex-col items-center justify-between p-12 bg-[#fdfdfc]">
      <div aria-hidden="true" className="h-10" />

      <div className="text-center max-w-3xl animate-entrance flex flex-col items-center">

        {/* Cormorant Garamond for both display lines — matches gallery modal title */}
        <h1
          className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Refine your eye.<br />
          <span
            className="opacity-25 italic"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Build your canon.
          </span>
        </h1>

        <Link href="/wander" className="mt-[64px] block group">
          <button type="button" className="px-16 py-4 text-center border-0 bg-transparent outline-none appearance-none">
            {/* DM Mono for the all-caps label — matches gallery filter pills + counts */}
            <span
              className="inline-block font-light text-xs uppercase tracking-[0.4em] text-zinc-400 group-hover:text-black group-hover:scale-125 transition-all duration-700 ease-in-out"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Enter
            </span>
          </button>
        </Link>
      </div>

      {/* DM Mono for the footer label — matches gallery source labels + item counts */}
      <footer
        className="text-[9px] uppercase tracking-[0.4em] opacity-40 font-light"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Private Archive — Exhibit v0.1
      </footer>
    </main>
  );
}