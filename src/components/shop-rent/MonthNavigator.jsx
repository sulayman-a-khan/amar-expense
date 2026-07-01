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
    <div className="flex items-center justify-between bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl px-2 py-2">
      <button
        onClick={goPrev}
        aria-label="Previous month"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#6B5F4F] active:bg-[#F7F3EA] transition-colors font-bold"
      >
        ←
      </button>
      <span className="text-sm font-bold text-[#2B2620]">
        {formatRentCycleLabel(year, month)}
      </span>
      <button
        onClick={goNext}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className={`w-9 h-9 flex items-center justify-center rounded-xl font-bold transition-colors ${
          isCurrentMonth ? 'text-[#E3D9C2] cursor-not-allowed' : 'text-[#6B5F4F] active:bg-[#F7F3EA]'
        }`}
      >
        →
      </button>
    </div>
  );
}
