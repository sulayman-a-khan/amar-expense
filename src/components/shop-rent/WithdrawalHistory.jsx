'use client';

import { formatGlobalDate } from '@/lib/dateUtils';

export default function WithdrawalHistory({ withdrawals }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase px-1">
        Withdrawal History
      </h3>
      {(!withdrawals || withdrawals.length === 0) ? (
        <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-6 text-center">
          <p className="text-sm text-[#7D7156] font-semibold">No collections recorded for this month yet.</p>
        </div>
      ) : (
        <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl divide-y divide-[#E3D9C2]">
          {withdrawals.map((w) => (
            <div key={w._id} className="px-4 py-3.5 flex justify-between items-start">
              <div>
                <span className="text-sm font-bold text-[#2B2620] block">৳{w.amount.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-[#7D7156] block mt-0.5">{formatGlobalDate(w.date)}</span>
                {w.note && <p className="text-[11px] text-[#6B5F4F] mt-1">{w.note}</p>}
              </div>
              <span className="text-[#1F7A4D] text-xs font-bold">+</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
