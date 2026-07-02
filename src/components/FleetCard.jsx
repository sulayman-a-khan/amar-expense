'use client';

export default function FleetCard({ bikes, onEditBike, onViewBike }) {
  if (!bikes || bikes.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">
          Active Fleet
        </h3>
        <span className="text-[10px] font-semibold text-[#7D7156]">
          {bikes.length} bike{bikes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {bikes.map((bike) => (
          <div key={bike._id} className="relative group ledger-rule">
            <button
              onClick={() => onViewBike(bike)}
              style={{
                background: 'linear-gradient(150deg, #163524 0%, #0e2318 60%, #0a1d10 100%)',
                boxShadow: '0 8px 20px rgba(15,40,25,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              className="w-full rounded-2xl py-3.5 px-2.5 text-center active:scale-[0.97] transition-transform"
            >
              {/* Decorative glow, echoes SummaryCard */}
              <div
                style={{
                  background: 'radial-gradient(circle, rgba(52,199,89,0.16) 0%, transparent 70%)',
                  width: 90, height: 90, top: -30, right: -30,
                }}
                className="absolute rounded-full pointer-events-none"
              />

              <div className="relative flex items-center justify-center gap-1 mb-1.5">
                <span
                  style={{ background: '#5de88a', boxShadow: '0 0 0 2px rgba(93,232,138,0.25)' }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <span
                  style={{ color: 'rgba(93,232,138,0.7)', letterSpacing: '0.1em' }}
                  className="text-[9px] font-bold uppercase"
                >
                  Bike {bike.name}
                </span>
              </div>

              <p className="relative text-[12px] font-extrabold text-white leading-tight truncate">
                {bike.driver}
              </p>

              <p
                style={{ color: 'rgba(255,255,255,0.4)' }}
                className="relative text-[10px] font-semibold mt-1"
              >
                ৳{bike.dailyRent}<span style={{ color: 'rgba(255,255,255,0.28)' }}>/day</span>
              </p>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onEditBike(bike); }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-full text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
