'use client';

export default function ShajahanKakaCard({ bike, due, onView }) {
  if (!bike) return null;

  return (
    <button
      onClick={() => onView(bike)}
      className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform text-left"
    >
      <div>
        <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">Shajahan Kaka</span>
        <span className={`text-sm font-extrabold mt-0.5 block ${due && due.amount > 0 ? 'text-[#2E5C8A]' : 'text-[#1F7A4D]'}`}>
          {due && due.amount > 0 ? `৳${due.amount.toLocaleString('en-IN')} due` : 'No outstanding due ✓'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[#7D7156] bg-[#F7F3EA] px-2 py-1 rounded-lg">৳100/day</span>
        <span className="text-[#7D7156]">→</span>
      </div>
    </button>
  );
}
