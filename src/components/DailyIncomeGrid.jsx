'use client';

export default function DailyIncomeGrid({ shajahanBike, shajahanDue, dailyBikes, onEditBike, onViewBike }) {
  const allDailyBikes = [];
  if (shajahanBike) {
    allDailyBikes.push({ ...shajahanBike, isShajahan: true, due: shajahanDue });
  }
  if (dailyBikes && dailyBikes.length > 0) {
    dailyBikes.forEach((b) => {
      if (!b.isShajahanKaka) {
        allDailyBikes.push(b);
      }
    });
  }

  if (allDailyBikes.length === 0) return null;

  const totalItems = allDailyBikes.length;
  const gridColsClass = totalItems === 1
    ? 'grid-cols-1'
    : totalItems === 2
      ? 'grid-cols-2'
      : totalItems === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span
          style={{ background: 'rgba(52,199,89,0.15)', color: '#1F7A4D' }}
          className="inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest"
        >
          ☀️ Daily Income
        </span>
        <span className="text-[10px] font-bold text-[#7D7156]">
          {totalItems} item{totalItems !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={`grid ${gridColsClass} gap-2.5`}>
        {allDailyBikes.map((bike) => {
          const isShajahan = bike.isShajahanKaka || bike.isShajahan;
          const hasShajahanDue = isShajahan && bike.due && bike.due.amount > 0;

          const collectedToday = bike.collectedToday;
          const isLocked = !isShajahan && !!collectedToday;
          const isOffDay = !isShajahan && collectedToday === 'Off Day';

          // Unified dark green style for all Daily Income cards
          const cardStyle = {
            background: 'linear-gradient(150deg, #163524 0%, #0e2318 60%, #0a1d10 100%)',
            boxShadow: '0 8px 20px rgba(15,40,25,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
          };

          return (
            <div key={bike._id} className="relative group">
              <button
                onClick={() => onViewBike && onViewBike(bike)}
                style={cardStyle}
                className={`w-full h-[104px] rounded-2xl py-2.5 px-2 active:scale-[0.97] transition-transform flex ${
                  bike.driverImage ? 'flex-row items-center justify-center text-left gap-2' : 'flex-col items-center justify-center text-center'
                } relative overflow-hidden`}
              >



                {/* Glow */}
                <div
                  style={{
                    background: 'radial-gradient(circle, rgba(52,199,89,0.16) 0%, transparent 70%)',
                    width: 90, height: 90, top: -30, right: -30,
                  }}
                  className="absolute rounded-full pointer-events-none"
                />

                {/* Locked Badge indicator */}
                {isLocked && (
                  <div
                    style={{
                      background: isOffDay ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.18)',
                    }}
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10"
                  >
                    <span className="text-[9px] font-black text-white leading-none">
                      {isOffDay ? '✕' : '✓'}
                    </span>
                  </div>
                )}

                {bike.driverImage ? (
                  <img
                    src={bike.driverImage}
                    alt={bike.driver || bike.driverName}
                    className="relative w-10 h-10 rounded-full object-cover shrink-0"
                    style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }}
                  />
                ) : null}

                <div className={bike.driverImage ? 'relative min-w-0' : 'contents'}>
                  <p className="relative w-full text-[11px] font-extrabold text-white leading-tight truncate">
                    {bike.driver || bike.driverName}
                  </p>

                  {isShajahan ? (
                    hasShajahanDue ? (
                      <p style={{ color: '#8FC2E8' }} className="relative text-[10px] font-bold mt-1">
                        ৳{bike.due.amount.toLocaleString('en-IN')} due
                      </p>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.75)' }} className="relative text-[10px] font-bold mt-1">
                        ৳100<span style={{ color: 'rgba(255,255,255,0.4)' }}>/day</span>
                      </p>
                    )
                  ) : isLocked ? (
                    <p style={{ color: 'rgba(255,255,255,0.85)' }} className="relative text-[10px] font-bold mt-1">
                      {isOffDay
                        ? 'Off Day'
                        : bike.collectedToday === 'Half Day' && bike.expectedToday != null
                          ? `Half Day ${bike.expectedToday} · ৳${bike.paidToday}`
                          : `${bike.collectedToday} · ৳${bike.paidToday}`}
                    </p>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.4)' }} className="relative text-[10px] font-semibold mt-1">
                      ৳{bike.dailyRent}<span style={{ color: 'rgba(255,255,255,0.28)' }}>/day</span>
                    </p>
                  )}
                </div>
              </button>

              {onEditBike && (
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
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
