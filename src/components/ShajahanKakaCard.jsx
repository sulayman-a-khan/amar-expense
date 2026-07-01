'use client';

import { useState } from 'react';
import { todayDhakaDateString } from '@/lib/dateUtils';

export default function ShajahanKakaCard({ bike, due, onView, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!bike) return null;

  const handleAction = async (shift) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collection',
          bikeId: bike._id,
          date: todayDhakaDateString(),
          shift,
          paidRent: shift === 'Full Day' ? 100 : 0,
          offDayReason: shift === 'Off Day' ? 'Driver Unavailable' : 'N/A',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to save entry');
      } else {
        onSaved?.();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 shadow-sm space-y-3">
      <div 
        onClick={() => onView(bike)}
        className="flex items-center justify-between cursor-pointer active:opacity-80 transition-opacity"
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
      </div>

      {error && <p className="text-[11px] font-bold text-[#B33B2E] text-center">{error}</p>}

      <div className="border-t border-[#F7F3EA] pt-3">
        {bike.collectedToday ? (
          <div className="flex items-center justify-center gap-2 text-xs font-bold py-1.5 text-[#1F7A4D] bg-[#E6F0E5]/60 rounded-xl">
            <span>✓ Today's Status: {bike.collectedToday === 'Off Day' ? 'Off Day (৳0)' : `Given Today (৳${bike.paidToday || 100})`}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={loading}
              onClick={() => handleAction('Full Day')}
              className="py-2.5 text-xs font-bold bg-[#1F7A4D] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Given Today'}
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction('Off Day')}
              className="py-2.5 text-xs font-bold bg-[#B33B2E] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Not Given Today'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
