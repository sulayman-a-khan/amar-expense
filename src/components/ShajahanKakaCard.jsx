'use client';

export default function ShajahanKakaCard({ bike, due, onView, onEditBike }) {
  if (!bike) return null;

  const hasDue = due && due.amount > 0;

  return (
    <div className="relative group">
      <button
        onClick={() => onView(bike)}
        style={{
          background: 'linear-gradient(150deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 24px rgba(138,109,34,0.10), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}
        className="relative w-full overflow-hidden rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform text-left"
      >
        {/* Soft color wash behind the glass */}
        <div
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.22) 0%, transparent 70%)',
            width: 140, height: 140, top: -50, right: -40,
          }}
          className="absolute rounded-full pointer-events-none"
        />

        <div className="relative flex items-center gap-3 min-w-0">
          {/* Avatar badge — shows the uploaded photo once set, initial otherwise */}
          {bike.driverImage ? (
            <img
              src={bike.driverImage}
              alt={bike.driver}
              className="w-11 h-11 rounded-full object-cover shrink-0"
              style={{ boxShadow: '0 4px 10px rgba(201,162,39,0.35), 0 0 0 2px rgba(255,255,255,0.6)' }}
            />
          ) : (
            <div
              style={{
                background: 'linear-gradient(150deg, #E8C766 0%, #C9A227 100%)',
                boxShadow: '0 4px 10px rgba(201,162,39,0.35)',
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
            >
              শ
            </div>
          )}

          <div className="min-w-0">
            <span
              style={{ color: '#8A7A54', letterSpacing: '0.14em' }}
              className="text-[9px] font-bold uppercase block"
            >
              Shajahan Kaka
            </span>
            <span
              className={`text-sm font-extrabold mt-0.5 block truncate ${
                hasDue ? 'text-[#2E5C8A]' : 'text-[#1F7A4D]'
              }`}
            >
              {hasDue ? `৳${due.amount.toLocaleString('en-IN')} due` : 'No outstanding due ✓'}
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-2 shrink-0">
          <span
            style={{
              background: 'rgba(255,255,255,0.5)',
              color: '#8A6D22',
              border: '1px solid rgba(212,175,55,0.35)',
            }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
          >
            ৳100/day
          </span>
          <span
            style={{ background: 'rgba(255,255,255,0.55)', color: '#6B5F4F', border: '1px solid rgba(255,255,255,0.6)' }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          >
            →
          </span>
        </div>
      </button>

      {onEditBike && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditBike(bike); }}
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.7)',
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full text-[#6B5F4F] hover:text-[#2B2620] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      )}
    </div>
  );
}
