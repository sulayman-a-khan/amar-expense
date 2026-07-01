'use client';

import { useState } from 'react';
import { formatGlobalDate, isWithin48Hours } from '@/lib/dateUtils';

export default function TimelineLog({ activities, selectedDate, onActivityDeleted }) {
  const [deletingId, setDeletingId] = useState(null);
  // Every activity here already belongs to the same selected date (the
  // backend filters by it) — show that date once per entry instead of
  // act.createdAt, which is the real "entered at" timestamp and can read
  // as "today" even while browsing a past day.
  const selectedDateLabel = selectedDate ? formatGlobalDate(selectedDate) : '';

  const handleDelete = async (act) => {
    if (!confirm('Are you sure you want to delete this entry? This will reverse the amount from your wallet.')) return;
    setDeletingId(act.id);
    try {
      const res = await fetch(`/api/transactions/${act.sourceType}/${act.id}`, { method: 'DELETE' });
      if (res.ok) {
        onActivityDeleted?.();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase px-1">
        Activity Log
      </h3>
      <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-[24px] p-5 shadow-sm space-y-4">
        {activities.length > 0 ? activities.map((act) => {
          const canEditDelete = isWithin48Hours(act.createdAt);
          return (
            <div key={act.id} className="flex gap-3.5 items-start justify-between group">
              <div className="flex gap-3.5 items-start min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    act.type === 'expense' ? 'bg-[#B33B2E]' : 'bg-[#1F7A4D]'
                  }`}
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-[#7D7156] block">
                    {selectedDateLabel} • {act.time}
                  </span>
                  <p className="text-[13px] text-[#3D362B] font-medium leading-snug">{act.text}</p>
                </div>
              </div>
              
              {canEditDelete && act.sourceType && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => handleDelete(act)}
                    disabled={deletingId === act.id}
                    className="p-1.5 text-[#B33B2E] hover:bg-[#F7E9E5] rounded-lg disabled:opacity-50"
                    title="Delete within 48h"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          );
        }) : (
          <p className="text-xs text-[#7D7156] text-center py-2">
            {selectedDateLabel ? `No activity logged on ${selectedDateLabel} yet.` : 'No activity logged yet.'}
          </p>
        )}
      </div>
    </section>
  );
}
