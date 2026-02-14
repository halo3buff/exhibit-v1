'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { lineages } from '@/lib/lineages';
import Placard from '@/components/Placard';

export default function WanderPage() {
  const [loadingLineage, setLoadingLineage] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const router = useRouter();

  // Updated to handle both the aesthetic Title and the technical Query
  const handleEntry = (topic, query) => {
    setLoadingLineage({ title: topic });
    
    // Use the specific expert query if it exists, otherwise fallback to topic
    const finalQuery = query || topic;

    setTimeout(() => {
      router.push(`/gallery?topic=${encodeURIComponent(finalQuery)}`);
    }, 500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim() === '') return;
    // For manual search, the input is both the title and the query
    handleEntry(searchInput.trim(), searchInput.trim());
  };

  if (loadingLineage) {
    return (
      <main className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-12 text-white font-sans animate-in fade-in duration-700">
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-[0.5em] opacity-30 mb-8 animate-pulse">
            Requesting Access to Digital Archives
          </p>
          <h2 className="text-4xl font-extralight tracking-tighter uppercase italic opacity-80 animate-bounce">
            {loadingLineage.title}
          </h2>
          <div className="mt-12 h-[1px] w-24 bg-white/20 mx-auto overflow-hidden">
            <div className="h-full bg-white w-full animate-loading-bar" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-[#fdfdfc] flex flex-col p-12 relative overflow-hidden font-sans">
      <header className="w-full text-center mt-12 animate-entrance z-20 pointer-events-none">
        <p className="text-[9px] uppercase tracking-[0.6em] opacity-30 mb-4 italic">
          The Guided Sequence
        </p>
        <h1 className="text-4xl md:text-5xl font-light tracking-tighter text-[#1a1a1a]">
          Where would you like to begin?
        </h1>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mt-8 w-full flex justify-center z-20">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search for a topic..."
          className="px-4 py-2 w-80 border border-gray-300 rounded shadow focus:outline-none focus:ring-2 focus:ring-black text-black"
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-black text-white uppercase tracking-[0.1em] rounded hover:bg-gray-900 transition"
        >
          Go
        </button>
      </form>

      <div className="flex-1 relative w-full max-w-[1400px] mx-auto mt-10">
        {lineages.map((item, index) => (
          <div
            key={item.id}
            className={`absolute animate-entrance ${item.pos} z-10 transition-all duration-500 hover:z-30`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Pass both title and query to the click handler */}
            <Placard item={item} onClick={() => handleEntry(item.title, item.query)} />
          </div>
        ))}
      </div>

      <footer className="w-full text-center text-[9px] uppercase tracking-[0.4em] opacity-30 pb-4 z-20">
        Step 1: Choose an influence
      </footer>
    </main>
  );
}