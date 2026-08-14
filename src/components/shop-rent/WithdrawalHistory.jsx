'use client';

import { formatGlobalDate } from '@/lib/dateUtils';

export default function WithdrawalHistory({ withdrawals }) {
  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-[12px] font-bold text-white/50 px-1">
        Collection History
      </h3>
      {(!withdrawals || withdrawals.length === 0) ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
          className="rounded-[20px] p-6 text-center"
        >
          <p className="text-sm text-white/30 font-medium">No collections recorded for this month yet.</p>
        </div>
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
          className="rounded-[20px] divide-y divide-white/6 shadow-lg"
        >
          {withdrawals.map((w) => (
            <div key={w._id} className="px-5 py-4 flex justify-between items-center">
              <div>
                <span className="text-[14px] font-semibold text-white block">৳{w.amount.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-white/40 block mt-0.5">{formatGlobalDate(w.date)}</span>
                {w.note && <p className="text-[11px] text-white/30 mt-1 italic">{w.note}</p>}
              </div>
              <span className="w-8 h-8 rounded-full bg-[#5DE88A]/10 text-[#5DE88A] flex items-center justify-center text-sm font-black">+</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
