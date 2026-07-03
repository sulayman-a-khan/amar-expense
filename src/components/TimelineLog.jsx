'use client';

import { useRef, useState } from 'react';
import { formatGlobalDate, isWithin48Hours } from '@/lib/dateUtils';

const HOLD_DURATION = 550; // ms to hold before delete triggers

export default function TimelineLog({ activities, selectedDate, onActivityDeleted }) {
  const [deletingId, setDeletingId] = useState(null);
  const [holdingId, setHoldingId] = useState(null);
  const holdTimer = useRef(null);

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

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldingId(null);
  };

  const startHold = (act, canDelete) => {
    if (!canDelete) return;
    setHoldingId(act.id);
    holdTimer.current = setTimeout(() => {
      clearHold();
      handleDelete(act);
    }, HOLD_DURATION);
  };

  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase px-1">
        Activity Log
      </h3>
      <div className="space-y-2.5">
        {activities.length > 0 ? activities.map((act) => {
          const canEditDelete = isWithin48Hours(act.createdAt) && !!act.sourceType;
          const isZero = act.amount === 0;
          const isHolding = holdingId === act.id;
          const isDeleting = deletingId === act.id;
          return (
            <div
              key={act.id}
              onMouseDown={() => startHold(act, canEditDelete)}
              onMouseUp={clearHold}
              onMouseLeave={clearHold}
              onTouchStart={() => startHold(act, canEditDelete)}
              onTouchEnd={clearHold}
              onTouchCancel={clearHold}
              onContextMenu={(e) => { if (canEditDelete) e.preventDefault(); }}
              className={`relative overflow-hidden bg-[#FFFDF8] border rounded-2xl p-4 shadow-sm flex items-start gap-3 transition-all select-none ${
                isHolding ? 'border-[#B33B2E] scale-[0.98]' : 'border-[#E3D9C2]'
              } ${isDeleting ? 'opacity-50' : ''}`}
              style={{ touchAction: canEditDelete ? 'pan-y' : undefined }}
            >
              {isHolding && (
                <span
                  className="absolute inset-0 bg-[#B33B2E]/10 pointer-events-none"
                  style={{ animation: `activityHoldFill ${HOLD_DURATION}ms linear forwards` }}
                />
              )}
              <span
                className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 relative ${
                  act.isOffDay ? 'bg-[#B33B2E]' : isZero ? 'bg-[#B8A88A]' : act.type === 'expense' ? 'bg-[#B33B2E]' : 'bg-[#1F7A4D]'
                }`}
              />
              <div className="flex-1 min-w-0 relative">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-bold text-sm text-[#2B2620] truncate">{act.text}</span>
                  {act.isOffDay ? (
                    <span className="text-[10px] font-black uppercase tracking-wide text-white bg-[#B33B2E] px-2.5 py-1 rounded-lg whitespace-nowrap">
                      Off Day
                    </span>
                  ) : act.amount != null && (
                    <span
                      className={`font-extrabold text-sm whitespace-nowrap ${
                        isZero ? 'text-[#9A8C6F]' : act.type === 'expense' ? 'text-[#B33B2E]' : 'text-[#1F7A4D]'
                      }`}
                    >
                      {isZero ? '' : act.type === 'expense' ? '−' : '+'}৳{act.amount.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {canEditDelete && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B5F4F] bg-[#F0EAD9] border border-[#E3D9C2] px-2 py-0.5 rounded-md whitespace-nowrap">
                      Hold to delete
                    </span>
                  )}
                  <span className="ml-auto flex flex-col items-end leading-tight">
                    <span className="text-[10px] text-[#9A8C6F]">{selectedDateLabel}</span>
                    {act.time && <span className="text-[9px] text-[#B5A88A]">{act.time}</span>}
                  </span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-[#7D7156] text-center py-2">
              {selectedDateLabel ? `No activity logged on ${selectedDateLabel} yet.` : 'No activity logged yet.'}
            </p>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes activityHoldFill {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </section>
  );
}
