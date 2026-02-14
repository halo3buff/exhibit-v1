'use client';
import { useState, useEffect, use } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';

export default function ArtifactPage({ params }) {
  const resolvedParams = use(params);
  const artifactId = decodeURIComponent(resolvedParams.id);
  const [artifact, setArtifact] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    // 1. Check the Gallery Cache first (Fastest)
    const cached = sessionStorage.getItem('last_search_results');
    if (cached) {
      const items = JSON.parse(cached);
      const found = items.find(i => i.id.toString() === artifactId);
      if (found) {
        setArtifact(found);
        generateAINote(found);
        return;
      }
    }

    // 2. Production Fallback: If not in cache, we tell the user to return
    // (In a later phase, we can make this fetch directly from the JSON files)
  }, [artifactId]);

  async function generateAINote(item) {
    // Only generate if we have an API key, otherwise show default text
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      setNote("The archive is currently performing maintenance on its AI curatorial systems.");
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const prompt = `Curator note for "${item.title}" by ${item.author || 'Unknown'} from the ${item.source} collection. 3 sentences, academic tone, focusing on its significance in design history.`;
      const result = await model.generateContent(prompt);
      setNote(result.response.text());
    } catch (e) {
      setNote("Historical context is currently being retrieved from the physical archives.");
    }
  }

  if (!artifact) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
      <div className="text-[10px] uppercase tracking-[0.5em] text-white/20 animate-pulse">Retrieving Artifact...</div>
      <Link href="/gallery" className="text-[9px] text-white/40 hover:text-white underline underline-offset-4">Return to Archive</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans">
      <Link href="/gallery" className="text-[9px] uppercase tracking-widest opacity-40 hover:opacity-100 mb-12 inline-block transition-all">
        ← Close Exhibition
      </Link>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Image Section */}
        <div className="flex items-center justify-center bg-zinc-900/30 p-4 border border-white/5 backdrop-blur-sm shadow-2xl">
          <img 
            src={artifact.imageUrl} 
            alt={artifact.title} 
            className="max-h-[80vh] w-auto object-contain shadow-2xl" 
            onError={(e) => { e.target.src = "https://via.placeholder.com/800x800?text=Image+Temporarily+Unavailable"; }}
          />
        </div>
        
        {/* Text Section */}
        <div className="flex flex-col justify-center space-y-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-extralight tracking-tighter italic leading-[1.1] mb-6 text-white/90">
              {artifact.title}
            </h1>
            <p className="text-2xl opacity-40 font-light tracking-tight">{artifact.author || "Unknown Designer"}</p>
          </div>

          <div className="border-l-2 border-white/5 pl-10 py-2 space-y-6">
            <h2 className="text-[9px] uppercase tracking-[0.5em] opacity-30 font-bold">Curatorial Analysis</h2>
            <p className="text-xl md:text-2xl font-extralight leading-relaxed text-white/70 italic serif">
              {note || "Consulting historical records..."}
            </p>
          </div>

          <div className="pt-10 border-t border-white/5 grid grid-cols-2 gap-8">
            <div>
              <p className="text-[9px] uppercase tracking-widest opacity-20 mb-2">Collection</p>
              <p className="text-xs font-medium opacity-50 tracking-wide">{artifact.source}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest opacity-20 mb-2">Identifier</p>
              <p className="text-[10px] font-mono opacity-30 truncate">{artifact.id}</p>
            </div>
            <div className="col-span-2 pt-4">
              <a 
                href={artifact.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-[0.4em] inline-block border border-white/10 px-10 py-5 hover:bg-white hover:text-black transition-all duration-500 font-medium"
              >
                Access Original Registry
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}