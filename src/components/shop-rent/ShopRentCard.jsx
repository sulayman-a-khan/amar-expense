'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nowInDhaka, getRentCycleLabel, getRentCycleRange } from '@/lib/dateUtils';

const STATUS_STYLE = {
  Completed: 'text-[#1F7A4D]',
  Pending: 'text-[#B33B2E]',
  Advance: 'text-[#2E5C8A]',
};

// Days left (inclusive of today) in the current rent cycle, e.g. cycle
// running 10 Jun - 9 Jul: on 9 Jul this returns 1, on 10 Jun it returns 30.
function getDaysLeftInRentCycle() {
  const now = nowInDhaka();
  const { year, month } = getRentCycleLabel(now);
  const { end } = getRentCycleRange(year, month);

  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const cycleEnd = new Date(end);
  cycleEnd.setUTCHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((cycleEnd - today) / msPerDay));
}

export default function ShopRentCard() {
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    fetch('/api/shop-rent')
      .then((res) => res.json())
      .then((data) => setRecord(data.record || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    setDaysLeft(getDaysLeftInRentCycle());
  }, []);

  if (loading) return null;

  return (
    <button
      onClick={() => router.push('/shop-rent')}
      className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform text-left"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">Shop Rent — This Month</span>
          {daysLeft !== null && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F3ECD9] text-[#8A7A4E] uppercase tracking-wide whitespace-nowrap">
              {daysLeft === 0 ? 'Last day' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
            </span>
          )}
        </div>
        {record ? (
          <span className={`text-sm font-extrabold mt-0.5 block ${STATUS_STYLE[record.status] || 'text-[#2B2620]'}`}>
            {record.remainingBalance > 0 && `৳${record.remainingBalance.toLocaleString('en-IN')} due`}
            {record.remainingBalance < 0 && `৳${Math.abs(record.remainingBalance).toLocaleString('en-IN')} advance`}
            {record.remainingBalance === 0 && 'Fully collected ✓'}
          </span>
        ) : (
          <span className="text-sm font-extrabold text-[#7D7156] mt-0.5 block">Not started yet</span>
        )}
      </div>
      <span className="text-[#7D7156]">→</span>
    </button>
  );
}
