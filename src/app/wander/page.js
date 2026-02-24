'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// SUB_MAP: names EXACTLY match build-database.js v6.1 sub_category values.
// Verified against full audit of every classification+medium in the DB.
// Run `node scripts/build-database.js` first, then these filters will work.
const SUB_MAP = {
  'Photography': [
    'Gelatin Silver', 'Albumen Print', 'Color Print',
    'Digital Print', 'Salted Paper', 'Daguerreotype', 'Tintype',
  ],
  'Painting': [
    'Oil', 'Acrylic', 'Watercolor', 'Tempera', 'Miniature',
  ],
  'Works on Paper': [
    'Lithograph', 'Print', 'Drawing', 'Letterpress',
    'Illustrated Book', 'Magazine', 'Screenprint',
    'Poster', 'Etching', 'Engraving', 'Woodcut', 'Linocut',
  ],
  'Sculpture': [
    'Bronze', 'Stone', 'Terracotta', 'Medal', 'Plaster',
  ],
  'Decorative Art': [
    'Metalwork', 'Glass', 'Industrial Design', 'Textile',
    'Ceramics', 'Furniture', 'Vessel', 'Basketry', 'Jewelry',
  ],
  'Architecture': [
    'Drawing', 'Model', 'Plan', 'Elevation', 'Rendering',
  ],
};

const CATEGORIES = [
  { title: 'PAINTINGS',       type: 'Painting',       num: '01' },
  { title: 'SCULPTURE',       type: 'Sculpture',      num: '02' },
  { title: 'WORKS ON PAPER',  type: 'Works on Paper', num: '03' },
  { title: 'PHOTOGRAPHY',     type: 'Photography',    num: '04' },
  { title: 'ARCHITECTURE',    type: 'Architecture',   num: '05' },
  { title: 'DECORATIVE ART',  type: 'Decorative Art', num: '06' },
];

export default function WanderPage() {
  const [previews,     setPreviews]    = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [openCategory, setOpenCategory] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadPreviews() {
      try {
        const res = await fetch('/manifests/moma.json');
        if (res.ok) {
          const data    = await res.json();
          const valid   = data.filter(item => item.imageUrl?.trim());
          const shuffled = [...valid].sort(() => 0.5 - Math.random());
          setPreviews(shuffled.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load previews:', e);
      } finally {
        setLoading(false);
      }
    }
    loadPreviews();
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.style.opacity = '0';
  };

  function handleCategoryClick(type) {
    if (openCategory === type) {
      // Second click → navigate to full category
      router.push(`/gallery?type=${encodeURIComponent(type)}`);
    } else {
      setOpenCategory(type);
    }
  }

  function handleSubClick(e, type, sub) {
    e.stopPropagation();
    router.push(`/gallery?type=${encodeURIComponent(type)}&sub=${encodeURIComponent(sub)}`);
  }

  function handleViewAll(e, type) {
    e.stopPropagation();
    router.push(`/gallery?type=${encodeURIComponent(type)}`);
  }

  if (loading) return (
    <main className="h-screen bg-white flex items-center justify-center">
      <p className="font-black uppercase tracking-widest text-[10px] animate-pulse">Initializing Index...</p>
    </main>
  );

  return (
    <>
      <style>{`
        .sub-pill {
          display: inline-block;
          font-size: 8.5px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 7px;
          border: 1px solid rgba(0,0,0,0.2);
          color: rgba(0,0,0,0.5);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s ease;
          background: transparent;
          line-height: 1.2;
        }
        .sub-pill:hover { background: black; color: white; border-color: black; }
        .sub-pill.view-all { border-color: rgba(0,0,0,0.5); color: rgba(0,0,0,0.7); font-weight: 600; }
        .subs-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 5px;
          padding-bottom: 4px;
          animation: subs-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes subs-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cat-btn {
          appearance: none;
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          text-align: left;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          cursor: pointer;
          transition: opacity 0.15s ease;
          display: flex;
          align-items: baseline;
          gap: 5px;
          width: 100%;
        }
        .cat-btn:hover { opacity: 0.45; }
        .cat-num { font-size: 7px; font-weight: 400; letter-spacing: 0.06em; opacity: 0.3; }
        .cat-arrow { font-size: 8px; opacity: 0.22; transition: transform 0.18s ease, opacity 0.12s; }
        .cat-arrow.open { transform: rotate(90deg); opacity: 0.5; }
        .cat-item { margin-bottom: 1px; }
      `}</style>

      <main className="h-screen bg-white overflow-hidden p-12">
        <div className="relative w-[850px] h-[650px] ml-[5%] mt-[2%]">

          {/* Header */}
          <div className="absolute top-0 left-0">
            <h1 className="text-4xl font-black tracking-tighter leading-none">DIGITAL@SCALE</h1>
            <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">INDEX SYSTEM</p>
          </div>

          {/* Large left image */}
          <div className="absolute top-[100px] left-0 w-[420px] h-[320px] border border-black overflow-hidden bg-gray-50">
            {previews[0] && (
              <img src={previews[0].imageUrl} onError={handleImageError}
                className="w-full h-full object-cover grayscale" alt="" />
            )}
          </div>

          {/* Top right image */}
          <div className="absolute top-[100px] left-[435px] w-[200px] h-[150px] border border-black overflow-hidden bg-gray-50">
            {previews[1] && (
              <img src={previews[1].imageUrl} onError={handleImageError}
                className="w-full h-full object-cover" alt="" />
            )}
          </div>

          {/* Category list + sub-category accordion */}
          <div className="absolute top-[265px] left-[435px] w-[380px]">
            {CATEGORIES.map((cat) => {
              const isOpen = openCategory === cat.type;
              const subs   = SUB_MAP[cat.type] || [];
              return (
                <div key={cat.type} className="cat-item">
                  <button className="cat-btn" onClick={() => handleCategoryClick(cat.type)}>
                    <span className="cat-num">{cat.num}</span>
                    {cat.title}
                    <span className={`cat-arrow${isOpen ? ' open' : ''}`}>›</span>
                  </button>
                  {isOpen && subs.length > 0 && (
                    <div className="subs-row">
                      <button className="sub-pill view-all" onClick={(e) => handleViewAll(e, cat.type)}>
                        View All
                      </button>
                      {subs.map(sub => (
                        <button key={sub} className="sub-pill"
                          onClick={(e) => handleSubClick(e, cat.type, sub)}>
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom strip image — FIXED: top-[435px] matches original, not bottom:0 */}
          <div className="absolute top-[435px] left-0 w-[530px] h-[100px] border border-black overflow-hidden bg-gray-50">
            {previews[2] && (
              <img src={previews[2].imageUrl} onError={handleImageError}
                className="w-full h-full object-cover contrast-125" alt="" />
            )}
          </div>

        </div>
      </main>
    </>
  );
}