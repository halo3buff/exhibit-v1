'use client';
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function GalleryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");
  const displayTitle = typeParam || "Gallery";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [brokenImages, setBrokenImages] = useState(new Set());
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    if (!typeParam) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setBrokenImages(new Set());
    
    fetch(`/api/search?type=${encodeURIComponent(typeParam)}`)
      .then(res => res.json())
      .then(data => {
        console.log(`[GALLERY] Received ${data.length} items`);
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[GALLERY] Error:", err);
        setItems([]);
        setLoading(false);
      });
  }, [typeParam]);

  const handleImageError = (itemId, imageUrl) => {
    console.log(`[BROKEN IMAGE] ${itemId}: ${imageUrl}`);
    setBrokenImages(prev => new Set([...prev, itemId]));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider opacity-40 mb-2">Loading</p>
          <h2 className="text-2xl font-light">{displayTitle}</h2>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <p className="text-sm opacity-60 mb-4">No results for "{displayTitle}"</p>
        <button
          onClick={() => router.push("/wander")}
          className="text-xs uppercase tracking-wide opacity-40 hover:opacity-100"
        >
          ← Return
        </button>
      </div>
    );
  }

  const visibleItems = items.filter(item => !brokenImages.has(item.id));

  return (
    <>
      <main className="min-h-screen bg-white p-12">
        <div className="mb-16 pb-6 border-b border-black/10">
          <button
            onClick={() => router.push("/wander")}
            className="text-[10px] uppercase tracking-wide opacity-40 hover:opacity-100 mb-4 block"
          >
            ← RETURN TO INDEX
          </button>
          <h1 className="text-3xl font-light tracking-tight">{displayTitle}</h1>
          <p className="text-xs opacity-40 mt-2">{visibleItems.length} items</p>
        </div>

        <div 
          className="grid gap-6"
          style={{ 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'
          }}
        >
          {visibleItems.map((item, idx) => (
            <div
              key={item.id}
              className="cursor-pointer group relative"
              onClick={() => setSelected(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="w-full aspect-square border border-black/20 overflow-hidden bg-white">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading={idx < 30 ? "eager" : "lazy"}
                  onError={() => handleImageError(item.id, item.imageUrl)}
                />
              </div>

              <p className="text-[9px] uppercase tracking-wide opacity-40 mt-2 truncate">
                {item.title}
              </p>

              {/* HOVER TOOLTIP */}
              {hoveredItem === item.id && (
                <div className="absolute left-0 bottom-full mb-2 z-10 w-64 bg-white border border-black/20 shadow-lg p-3 pointer-events-none">
                  <p className="text-xs font-medium mb-1 line-clamp-2">{item.title}</p>
                  <p className="text-[10px] opacity-60 mb-1">{item.author}</p>
                  <p className="text-[9px] opacity-40">{item.year}</p>
                  <div className="mt-2 pt-2 border-t border-black/10">
                    <p className="text-[8px] uppercase tracking-wide opacity-40">{item.source}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-16"
          onClick={() => setSelected(null)}
        >
          <div 
            className="max-w-5xl w-full flex gap-16 items-start"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1">
              <img
                src={selected.imageUrl}
                alt={selected.title}
                className="w-full h-auto object-contain border border-black/10"
              />
            </div>

            <div className="w-[300px] space-y-6">
              <div>
                <h2 className="text-xl font-light mb-2">{selected.title}</h2>
                <p className="text-sm opacity-60">{selected.author}</p>
                <p className="text-xs opacity-40 mt-1">{selected.year}</p>
              </div>

              <div className="pt-4 border-t border-black/10">
                <p className="text-[9px] uppercase tracking-wide opacity-40 mb-1">Source</p>
                <p className="text-xs">{selected.source}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-wide px-4 py-2 border border-black/20 hover:bg-black hover:text-white transition"
                >
                  View Original
                </a>
                <button
                  onClick={() => setSelected(null)}
                  className="text-[10px] uppercase tracking-wide px-4 py-2 opacity-40 hover:opacity-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}