'use client';

import { useState, useEffect } from 'react';
import { todayDhakaDateString, getRentCycleRange } from '@/lib/dateUtils';

// Rent "month" runs RENT_CYCLE_START_DAY -> RENT_CYCLE_START_DAY of the next
// calendar month (not the 1st-to-1st calendar month) — see dateUtils.js.
function monthDateBounds(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  const { start, end } = getRentCycleRange(year, month);
  const min = toDateStr(start);

  const lastDay = new Date(end);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1); // end is exclusive (start of next cycle)
  const cycleEnd = toDateStr(lastDay);

  const todayStr = todayDhakaDateString();
  // Cap at today if this cycle's natural end would be in the future.
  const max = cycleEnd > todayStr ? todayStr : cycleEnd;
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
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        boxShadow: '0 4px 20px rgba(15,23,42,0.25)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}
      className="rounded-[24px] p-6 space-y-5"
    >
      <div>
        <h3 className="text-[14px] font-bold text-white">Add Collection</h3>
        {!isCurrentMonth && (
          <p className="text-[11px] text-white/40 mt-0.5">Adding a backdated collection for this past month.</p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-white/40 mb-1">Amount (৳)</label>
          <input
            type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 3000"
            className="w-full pb-2 text-lg font-semibold bg-transparent border-b border-white/15 focus:outline-none focus:border-[#5DE88A]/50 text-white transition-colors placeholder:font-normal placeholder:text-white/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Date</label>
            <input
              type="date" required min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full pb-2 text-sm font-medium bg-transparent border-b border-white/15 focus:outline-none focus:border-[#5DE88A]/50 text-white transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Note</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="w-full pb-2 text-sm font-medium bg-transparent border-b border-white/15 focus:outline-none focus:border-[#5DE88A]/50 text-white transition-colors placeholder:font-normal placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-[#FF8E8E] font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3.5 bg-gradient-to-r from-[#5DE88A] to-[#34D399] text-[#0F172A] font-bold text-sm rounded-[16px] disabled:opacity-60 hover:opacity-90 transition-opacity mt-2 shadow-lg shadow-[#5DE88A]/15"
      >
        Review Collection
      </button>
    </form>
  );
}
