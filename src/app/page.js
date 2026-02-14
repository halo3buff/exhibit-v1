import Link from 'next/link';

export default function Home() {
  return (
    <main className="h-screen w-full flex flex-col items-center justify-between p-12 bg-[#fdfdfc]">
      <div aria-hidden="true" className="h-10" />

      <div className="text-center max-w-3xl animate-entrance flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] text-[#1a1a1a]">
          Refine your eye.<br />
          <span className="opacity-25 italic font-serif">Build your canon.</span>
        </h1>

        <Link href="/wander" className="mt-[64px] block group">
          <button type="button" className="px-16 py-4 text-center border-0 bg-transparent outline-none appearance-none">
            <span className="inline-block font-sans font-light text-xs uppercase tracking-[0.4em] text-zinc-400 group-hover:text-black group-hover:scale-125 transition-all duration-700 ease-in-out">
              Enter
            </span>
          </button>
        </Link>
      </div>

      <footer className="text-[9px] uppercase tracking-[0.4em] opacity-40 font-light">
        Private Archive — Exhibit v0.1
      </footer>
    </main>
  );
}