// src/components/Placard.js
'use client';

export default function Placard({ item, onClick }) {
  if (!item) return null; // prevent crash if item is undefined

  return (
    <div
      onClick={() => item && onClick(item)}
      style={{
        height: '160px',
        width: '320px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
      className="group bg-[#DEDCDC] cursor-pointer
                 shadow-[0_2px_10px_rgba(0,0,0,0.05)]
                 transition-all duration-300
                 hover:-translate-y-1
                 hover:bg-[#e6e4e4]
                 hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)]"
    >
      <div className="text-black select-none">
        <h3 className="text-[16px] leading-tight font-bold mb-1">
          {item.title || 'Untitled'} ({item.year || 'Unknown'})
        </h3>
        <h2 className="text-[16px] leading-tight font-bold italic mb-2" style={{ marginTop: '8px' }}>
          {item.author || 'Unknown Artist'}
        </h2>
        <p className="text-[12px] leading-snug font-light opacity-80 max-w-[210px]" style={{ marginTop: '8px' }}>
          {item.description || 'No description available.'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }} 
           className="opacity-50 group-hover:opacity-80 transition-opacity">
        <span className="text-[9px] uppercase tracking-[0.2em] font-medium">
          VIEW ARCHIVE
        </span>
        <span className="text-[11px] tabular-nums font-normal">
          {item.code || 'N/A'}
        </span>
      </div>
    </div>
  );
}
