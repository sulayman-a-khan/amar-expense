'use client';

import { formatGlobalDate } from '@/lib/dateUtils';

export default function CashLoanListModal({ isOpen, onClose, cashLoans }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-slide-up"
      >
        <div className="bg-white px-6 py-5 border-b border-[#E8EAED] shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#1A1D29]">নগদ ধার</h2>
            <p className="text-[11px] font-bold text-[#6B7280]">Cash given as loans, not yet returned</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F4F5F7] hover:bg-[#E8EAED] text-[#6B7280] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {(!cashLoans || cashLoans.length === 0) ? (
            <p className="text-center text-sm text-[#9CA3AF] py-10">No outstanding cash loans. 🎉</p>
          ) : (
            <div className="divide-y divide-[#E8EAED]">
              {cashLoans.map((l) => (
                <div key={l._id} className="px-6 py-4">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-bold text-[#1A1D29]">{l.person}</span>
                    <span className="text-sm font-extrabold text-[#2563EB] whitespace-nowrap">৳{l.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">{formatGlobalDate(l.date)}</p>
                  {l.note && <p className="text-[11px] text-[#6B7280] mt-1">{l.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
