// src/app/page.js
import Link from 'next/link';

export default function Home() {
  return (
    // calc(100vh - 44px) accounts for the fixed nav + its 44px spacer
    // overflow-hidden ensures no scrollbar ever appears on this page
    <main
      className="w-full flex flex-col items-center justify-between p-12 bg-[#fdfdfc] overflow-hidden"
      style={{ height: 'calc(100vh - 44px)' }}
    >
      <div aria-hidden="true" className="h-10" />

      <div className="text-center max-w-3xl animate-entrance flex flex-col items-center">
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
            <span
              className="inline-block font-light text-xs uppercase tracking-[0.4em] text-zinc-400 group-hover:text-black group-hover:scale-125 transition-all duration-700 ease-in-out"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Enter
            </span>
          </button>
        </Link>
      </div>

      <footer
        className="text-[9px] uppercase tracking-[0.4em] opacity-40 font-light"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Private Archive — Exhibit v0.1
      </footer>
    </main>
  );
}