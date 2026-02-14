'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WanderPage() {
  const [preview, setPreview] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await fetch('/manifests/moma.json');
        if (res.ok) {
          const data = await res.json();
          setPreview(data[Math.floor(Math.random() * data.length)]);
        }
      } catch (e) {
        console.error("Failed to load preview:", e);
      }
    }
    loadPreview();
  }, []);

  const navigate = (filters) => {
    const params = new URLSearchParams();
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.movement) params.set('movement', filters.movement);
    if (filters.era) params.set('era', filters.era);
    if (filters.type) params.set('type', filters.type);
    router.push(`/gallery?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#f4f4f2] flex flex-col p-6 md:p-12 text-[#1a1a1a]">
      {/* HEADER SECTION - Static and Clean */}
      <div className="w-full mb-12">
        <h1 className="text-5xl md:text-7xl font-bold italic border-b-2 border-black pb-4 uppercase tracking-tighter">
          THE EXHIBITION ARCHIVE
        </h1>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row gap-16 items-start">
        
        {/* LEFT: NAVIGATION MENU - Boxed style from your earlier screenshot */}
        <div className="w-full md:w-1/3 flex flex-col border-t border-black">
          {['1920S AVANT-GARDE', 'SWISS TYPOGRAPHY', 'INDUSTRIAL PHOTOGRAPHY', 'BAUHAUS ARCHIVE', 'MODERNIST VAULT'].map((label, i) => (
            <button 
              key={i}
              onClick={() => navigate({ topic: label.toLowerCase() })} 
              className="text-left text-xl py-3 px-2 border-b border-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              {label}
            </button>
          ))}
          
          <div className="mt-8">
            <p className="text-[10px] uppercase font-bold opacity-50 mb-4">SELECT AN ENTRY POINT TO BEGIN INDEXING.</p>
            <div className="h-px bg-black/20 w-full mb-4"></div>
            <p className="text-[10px] uppercase tracking-widest font-bold">Status: System_Online</p>
          </div>
        </div>

        {/* RIGHT: THE CLUSTER - This replicates the overlapping look */}
        <div className="w-full md:w-1/2 relative min-h-[600px] flex items-center justify-center">
          {preview && (
            <div className="relative">
              {/* Main Image - Color, Static, No Hover Transform */}
              <div className="relative z-10 border border-black p-4 bg-white shadow-xl max-w-lg">
                <img 
                  src={preview.imageUrl} 
                  className="w-full h-auto object-contain block border border-black/10" 
                  alt="Archive Preview" 
                />
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase font-black">{preview.title}</p>
                    <p className="text-[8px] opacity-40 uppercase">{preview.id}</p>
                  </div>
                  <span className="text-[8px] opacity-30 font-mono italic">PREVIEW_NODE_01</span>
                </div>
              </div>

              {/* Decorative "Archival" elements to match the reference image cluster style */}
              <div className="absolute -top-6 -left-6 w-32 h-40 border border-black/10 bg-white/50 -z-10 rotate-3"></div>
              <div className="absolute -bottom-10 -right-4 w-48 h-12 bg-black/5 -rotate-2 -z-10"></div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}