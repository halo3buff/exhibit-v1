'use client';
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function GalleryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?${searchParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Search error:", err);
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs tracking-widest animate-pulse">
      INDEXING_ARCHIVE...
    </div>
  );

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="flex justify-between items-center mb-12 border-b border-black pb-4">
        <button onClick={() => router.push("/wander")} className="text-xs font-bold uppercase tracking-widest">← Return</button>
        <h1 className="text-2xl font-light italic uppercase tracking-tighter">
          {searchParams.get("topic") || searchParams.get("movement") || "Archive"}
        </h1>
        <p className="text-[10px] opacity-40">{items.length} Records</p>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className="break-inside-avoid border border-black/10 p-2 bg-white cursor-crosshair group"
            onClick={() => setSelected(item)}
          >
            <img src={item.imageUrl} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
            <div className="mt-4 flex justify-between items-start">
              <p className="text-[10px] font-bold uppercase max-w-[70%]">{item.title}</p>
              <p className="text-[10px] opacity-40 font-mono">{item.year}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setSelected(null)}>
          <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12" onClick={e => e.stopPropagation()}>
            <img src={selected.imageUrl} className="w-full h-auto border border-black shadow-2xl" alt="" />
            <div className="flex flex-col justify-center space-y-6">
              <h2 className="text-5xl font-light italic tracking-tighter leading-none">{selected.title}</h2>
              <p className="text-xl opacity-60 font-serif">{selected.author}</p>
              <p className="text-sm leading-relaxed opacity-80">{selected.source}</p>
              <div className="pt-8">
                <a href={selected.link} target="_blank" className="bg-black text-white px-8 py-4 text-xs uppercase font-bold tracking-widest">View Original Source</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function GalleryPage() {
  return <Suspense fallback={null}><GalleryContent /></Suspense>;
}