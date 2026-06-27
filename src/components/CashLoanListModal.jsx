'use client';

import { formatGlobalDate } from '@/lib/dateUtils';

export default function CashLoanListModal({ isOpen, onClose, cashLoans }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F7F3EA] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-slide-up"
      >
        <div className="bg-[#FFFDF8] px-6 py-5 border-b border-[#E3D9C2] shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#2B2620]">নগদ ধার</h2>
            <p className="text-[11px] font-bold text-[#6B5F4F]">Cash given as loans, not yet returned</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F7F3EA] hover:bg-[#E3D9C2] text-[#6B5F4F] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {(!cashLoans || cashLoans.length === 0) ? (
            <p className="text-center text-sm text-[#7D7156] py-10">No outstanding cash loans. 🎉</p>
          ) : (
            <div className="divide-y divide-[#E3D9C2]">
              {cashLoans.map((l) => (
                <div key={l._id} className="px-6 py-4">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-bold text-[#2B2620]">{l.person}</span>
                    <span className="text-sm font-extrabold text-[#2E5C8A] whitespace-nowrap">৳{l.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-[11px] text-[#7D7156] mt-0.5">{formatGlobalDate(l.date)}</p>
                  {l.note && <p className="text-[11px] text-[#6B5F4F] mt-1">{l.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
