'use client';

import { useState, useEffect } from 'react';
import { todayDhakaDateString } from '@/lib/dateUtils';

function monthDateBounds(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const min = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); // day 0 of next month = last day of this month
  const todayStr = todayDhakaDateString();
  const monthEnd = `${year}-${pad(month)}-${pad(lastDay)}`;
  // Cap at today if this month's natural end would be in the future.
  const max = monthEnd > todayStr ? todayStr : monthEnd;
  return { min, max };
}

export default function QuickCollectionForm({ year, month, isCurrentMonth, onReview, disabled }) {
  const { min, max } = monthDateBounds(year, month);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(isCurrentMonth ? todayDhakaDateString() : min);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Reset the default date whenever the viewed month changes, so switching
  // months doesn't leave a stale date from a different month pre-filled.
  useEffect(() => {
    setDate(isCurrentMonth ? todayDhakaDateString() : min);
  }, [year, month, isCurrentMonth, min]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError('');
    onReview({ amount, date, note });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-5 space-y-3">
      <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">Add Collection</h3>
      {!isCurrentMonth && (
        <p className="text-[11px] text-[#7D7156] -mt-1">Adding a backdated collection for this past month.</p>
      )}

      <div>
        <label className="block text-[10px] font-bold text-[#7D7156] uppercase tracking-wide mb-1">Amount (৳)</label>
        <input
          type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 3000"
          className="w-full p-3 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-[#7D7156] uppercase tracking-wide mb-1">Date</label>
        <input
          type="date" required min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full p-3 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-[#7D7156] uppercase tracking-wide mb-1">Note (optional)</label>
        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. partial payment"
          className="w-full p-3 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]"
        />
      </div>

      {error && <p className="text-xs text-[#B33B2E] font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 bg-[#2B2620] text-white font-bold text-sm rounded-xl disabled:opacity-60"
      >
        Review Collection
      </button>
    </form>
  );
}
