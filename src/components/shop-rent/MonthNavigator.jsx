'use client';

import { formatRentCycleLabel } from '@/lib/dateUtils';

export default function MonthNavigator({ year, month, isCurrentMonth, onNavigate }) {
  const goPrev = () => {
    if (month === 1) onNavigate(year - 1, 12);
    else onNavigate(year, month - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return; // never navigate into the future
    if (month === 12) onNavigate(year + 1, 1);
    else onNavigate(year, month + 1);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        boxShadow: '0 4px 20px rgba(15,23,42,0.25)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}
      className="flex items-center justify-between rounded-full px-2 py-1.5"
    >
      <button
        onClick={goPrev}
        aria-label="Previous month"
        className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors font-medium text-lg"
      >
        ←
      </button>
      <span className="text-sm font-semibold text-white">
        {formatRentCycleLabel(year, month)}
      </span>
      <button
        onClick={goNext}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors font-medium text-lg ${
          isCurrentMonth ? 'text-white/15 cursor-not-allowed' : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        →
      </button>
    </div>
  );
}
