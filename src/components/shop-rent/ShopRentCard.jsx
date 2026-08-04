'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRentCycleRange, startOfTodayDhaka } from '@/lib/dateUtils';

const STATUS_STYLE = {
  Completed: 'text-[#1F7A4D]',
  Pending: 'text-[#B33B2E]',
  Advance: 'text-[#2E5C8A]',
};

function daysRemainingInCycle(year, month) {
  const { end } = getRentCycleRange(year, month);
  const today = startOfTodayDhaka(); // both in the same fake-Dhaka space, safe to diff directly
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / msPerDay));
}

export default function ShopRentCard() {
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shop-rent')
      .then((res) => res.json())
      .then((data) => setRecord(data.record || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const daysLeft = record ? daysRemainingInCycle(record.year, record.month) : null;

  return (
    <button
      onClick={() => router.push('/shop-rent')}
      style={{
        background: 'linear-gradient(150deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 24px rgba(46,92,138,0.10), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
      className="relative w-full overflow-hidden rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform text-left"
    >
      {/* Soft color wash behind the glass */}
      <div
        style={{
          background: 'radial-gradient(circle, rgba(143,194,232,0.28) 0%, transparent 70%)',
          width: 140, height: 140, top: -50, right: -40,
        }}
        className="absolute rounded-full pointer-events-none"
      />

      <div className="relative flex items-center gap-3 min-w-0">
        {/* Icon badge */}
        <div
          style={{
            background: 'linear-gradient(150deg, #A9CDEB 0%, #6E9EC4 100%)',
            boxShadow: '0 4px 10px rgba(110,158,196,0.35)',
          }}
          className="w-11 h-11 rounded-full flex items-center justify-center text-base shrink-0"
        >
          🏬
        </div>

        <div className="min-w-0">
          <span
            style={{ color: '#5E7488', letterSpacing: '0.12em' }}
            className="text-[9px] font-bold uppercase block"
          >
            Shop Rent — This Month
          </span>
          {record ? (
            <span className={`text-sm font-extrabold mt-0.5 block truncate ${STATUS_STYLE[record.status] || 'text-[#2B2620]'}`}>
              {record.remainingBalance > 0 && `৳${record.remainingBalance.toLocaleString('en-IN')} due`}
              {record.remainingBalance < 0 && `৳${Math.abs(record.remainingBalance).toLocaleString('en-IN')} advance`}
              {record.remainingBalance === 0 && 'Fully collected ✓'}
            </span>
          ) : (
            <span className="text-sm font-extrabold text-[#7D7156] mt-0.5 block">Not started yet</span>
          )}
        </div>
      </div>

      <div className="relative flex items-center gap-2 shrink-0">
        {daysLeft !== null && (
          <span
            style={{
              background: 'rgba(255,255,255,0.5)',
              color:
                daysLeft <= 1 ? '#B33B2E' : daysLeft <= 3 ? '#8A5A1F' : '#1F7A4D',
              border: `1px solid ${
                daysLeft <= 1 ? 'rgba(179,59,46,0.3)' : daysLeft <= 3 ? 'rgba(138,90,31,0.3)' : 'rgba(31,122,77,0.3)'
              }`,
            }}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
          >
            {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
          </span>
        )}
        <span
          style={{ background: 'rgba(255,255,255,0.55)', color: '#6B5F4F', border: '1px solid rgba(255,255,255,0.6)' }}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
        >
          →
        </span>
      </div>
    </button>
  );
}
