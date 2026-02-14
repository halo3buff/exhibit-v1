'use client';
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { lineages } from "@/lib/lineages"; // Connects to your placard definitions

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTopic = searchParams.get("topic") || "Design";

  // CLEAN TITLE LOGIC: 
  // If the URL topic matches an expert query (like "Letterform Type Specimen"), 
  // we show the pretty title (like "Typography"). Otherwise, we show what was typed.
  const displayTitle = lineages.find(l => l.query === rawTopic)?.title || rawTopic;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cacheStatus, setCacheStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    // Fetch using the raw expert query to get the best results from the Cellar + APIs
    fetch(`/api/search?topic=${encodeURIComponent(rawTopic)}`)
      .then(res => {
        // Checking if our new hybrid search route served a cached version
        setCacheStatus(res.headers.get('X-Cache') || '');
        return res.json();
      })
      .then(data => {
        console.log(`[GALLERY] Ingested ${data.length} items for: ${rawTopic}`);
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[GALLERY] Fetch Error:", err);
        setItems([]);
        setLoading(false);
      });
  }, [rawTopic]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-4 animate-pulse">
            Accessing Archives
          </p>
          <h2 className="text-3xl font-light tracking-tight text-white/80 italic">
            {displayTitle}
          </h2>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8">
        <p className="text-white/60 text-lg mb-6">No results found in the Cellar for "{displayTitle}"</p>
        <button
          onClick={() => router.push("/wander")}
          className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white/80 transition"
        >
          ← Return to Wander
        </button>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0a] p-8 md:p-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => router.push("/wander")}
            className="text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white/70 transition mb-4 block"
          >
            ← Return
          </button>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white/90 capitalize">
            {displayTitle}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/20">
              {items.length} artifacts discovered
            </p>
            {cacheStatus === 'HIT' && (
              <span className="text-[9px] px-2 py-1 bg-green-500/10 border border-green-500/30 text-green-400 uppercase tracking-wider">
                System Cache Hit
              </span>
            )}
          </div>
        </div>

        {/* TASCHEN BRUTALIST GRID */}
        <div 
          className="grid gap-6 md:gap-8"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
          }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="group cursor-pointer"
              onClick={() => setSelected(item)}
              style={{
                animation: `fadeIn 0.5s ease-out ${Math.min(idx * 0.02, 1)}s both`
              }}
            >
              {/* Perfect Square Image Container */}
              <div className="relative w-full aspect-square overflow-hidden bg-black/20 border border-white/5 group-hover:border-white/30 transition-all duration-300">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Handle broken external links gracefully
                    e.target.style.opacity = '0.1';
                    e.target.style.filter = 'grayscale(1)';
                  }}
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/80 transition-all duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
                  <div className="text-white">
                    <p className="text-xs font-medium line-clamp-2 mb-1">{item.title}</p>
                    <p className="text-[9px] opacity-60 italic">{item.author}</p>
                  </div>
                </div>
              </div>

              {/* Metadata Display Below Image */}
              <div className="mt-3">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/70 transition truncate">
                  {item.title}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[8px] text-white/20">{item.source}</p>
                  <p className="text-[8px] text-white/20">{item.year}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* DETAILED INSPECTION MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/98 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center bg-white/5 p-4 rounded-sm">
              <img
                src={selected.imageUrl}
                alt={selected.title}
                className="max-w-full max-h-[85vh] object-contain shadow-2xl"
              />
            </div>

            <div className="text-white space-y-8 px-4">
              <div className="border-l border-white/20 pl-6">
                <p className="text-[10px] uppercase tracking-[0.5em] opacity-30 mb-2">Artifact Title</p>
                <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-2">{selected.title}</h2>
                <p className="text-xl opacity-60 italic">{selected.author}</p>
                <p className="text-sm opacity-40 mt-1">Period: {selected.year}</p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-[9px] uppercase tracking-[0.3em] opacity-40 mb-2">Archive Source</p>
                <p className="text-sm opacity-80 tracking-wide">{selected.source}</p>
              </div>

              <div className="flex flex-wrap gap-4 pt-6">
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-[0.3em] px-8 py-4 border border-white/20 hover:border-white/80 hover:bg-white/5 transition duration-500"
                >
                  View in Collection
                </a>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[10px] uppercase tracking-[0.3em] px-8 py-4 opacity-40 hover:opacity-100 transition"
                >
                  Close Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}