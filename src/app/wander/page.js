'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WanderPage() {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadPreviews() {
      try {
        const res = await fetch('/manifests/moma.json');
        if (res.ok) {
          const data = await res.json();
          const validData = data.filter(item => item.imageUrl && item.imageUrl.trim() !== "");
          const shuffled = validData.sort(() => 0.5 - Math.random());
          setPreviews(shuffled.slice(0, 3));
        }
      } catch (e) { 
        console.error("Failed to load manifests:", e); 
      } finally {
        setLoading(false);
      }
    }
    loadPreviews();
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8Xw8AAasBRue6YmAAAAAASUVORK5CYII=";
    e.target.className = "w-full h-full bg-gray-100 object-cover opacity-10";
  };

  const categories = [
    { title: "PHOTOGRAPHY", type: "photograph", desc: "01" },
    { title: "DRAWINGS", type: "drawing", desc: "02" },
    { title: "POSTERS", type: "poster", desc: "03" },
    { title: "PRINTS", type: "print", desc: "04" },
    { title: "PAINTINGS", type: "painting", desc: "05" },
    { title: "FURNITURE", type: "furniture", desc: "06" }
  ];

  if (loading) return (
    <main className="h-screen bg-white flex items-center justify-center">
      <p className="font-black uppercase tracking-widest text-[10px] animate-pulse">Initializing Index...</p>
    </main>
  );

  return (
    <main className="h-screen bg-white overflow-hidden p-12">
      <div className="relative w-[850px] h-[650px] ml-[5%] mt-[2%]">
        
        <div className="absolute top-0 left-0">
          <h1 className="text-4xl font-black tracking-tighter leading-none">DIGITAL@SCALE</h1>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">INDEX SYSTEM</p>
        </div>

        <div className="absolute top-[100px] left-0 w-[420px] h-[320px] border border-black overflow-hidden bg-gray-50">
          {previews[0] && (
            <img 
              src={previews[0].imageUrl} 
              onError={handleImageError}
              className="w-full h-full object-cover grayscale" 
              alt="preview-1" 
            />
          )}
        </div>

        <div className="absolute top-[100px] left-[435px] w-[200px] h-[150px] border border-black overflow-hidden bg-gray-50">
          {previews[1] && (
            <img 
              src={previews[1].imageUrl} 
              onError={handleImageError}
              className="w-full h-full object-cover" 
              alt="preview-2" 
            />
          )}
        </div>

        <div className="absolute top-[265px] left-[435px] flex flex-col space-y-3">
          {categories.map((cat, i) => (
            <button 
              key={i} 
              onClick={() => router.push(`/gallery?type=${cat.type}`)}
              className="appearance-none bg-transparent border-none p-0 m-0 text-left text-[12px] font-black uppercase tracking-tighter hover:opacity-50 transition-opacity"
            >
              {cat.title}
            </button>
          ))}
        </div>

        <div className="absolute top-[435px] left-0 w-[530px] h-[100px] border border-black overflow-hidden bg-gray-50">
          {previews[2] && (
            <img 
              src={previews[2].imageUrl} 
              onError={handleImageError}
              className="w-full h-full object-cover contrast-125" 
              alt="preview-3" 
            />
          )}
        </div>

      </div>
    </main>
  );
}