'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_STYLE = {
  Completed: 'text-[#1F7A4D]',
  Pending: 'text-[#B33B2E]',
  Advance: 'text-[#2E5C8A]',
};

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

  return (
    <button
      onClick={() => router.push('/shop-rent')}
      className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform text-left"
    >
      <div>
        <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">Shop Rent — This Month</span>
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
