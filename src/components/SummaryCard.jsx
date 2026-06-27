'use client';
import { useState } from 'react';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function SummaryCard({ summary, selectedDate, onDateChange, onOpenBikeDue, onOpenCashLoan, onOpenLoansPage }) {
  const {
    netProfit = 0, totalIncome = 0, totalExpense = 0,
    totalReceivable = 0, totalPayable = 0,
    bikeDueTotal = 0, cashLoanReceivable = 0,
  } = summary;
  const isPositive = netProfit >= 0;
  const [receivableExpanded, setReceivableExpanded] = useState(false);

  return (
    <section className="ledger-rule bg-[#FFFDF8] border border-[#E3D9C2] rounded-[20px] p-6 pl-8 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">
          Net Balance
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold text-[#2B2620] bg-[#F7F3EA] border border-[#E3D9C2] rounded-lg px-2 py-1 flex items-center gap-1 cursor-pointer">
            📅 {formatGlobalDate(selectedDate)}
          </div>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={onDateChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
      <h2 className={`text-[40px] font-black mt-1.5 tracking-tight leading-none ${isPositive ? 'text-[#1F7A4D]' : 'text-[#B33B2E]'}`}>
        {isPositive ? '+' : '−'} ৳{Math.abs(netProfit).toLocaleString('en-IN')}
      </h2>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="bg-[#E6F0E5] border border-[#C5DCC2] rounded-2xl p-3">
          <span className="text-[#1F7A4D] text-[10px] font-bold uppercase tracking-wide block">Income</span>
          <span className="font-extrabold text-lg text-[#155C3A] mt-0.5 block">৳{totalIncome.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-[#F7E9E5] border border-[#E3C2B8] rounded-2xl p-3">
          <span className="text-[#B33B2E] text-[10px] font-bold uppercase tracking-wide block">Expense</span>
          <span className="font-extrabold text-lg text-[#8C2D22] mt-0.5 block">৳{totalExpense.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {(totalReceivable > 0 || totalPayable > 0) && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-4 border-t border-[#E3D9C2]">
          <button
            onClick={() => setReceivableExpanded((v) => !v)}
            className="text-left bg-[#E7EEF4] rounded-xl p-2.5 -m-2.5 active:bg-[#DCE6EC] transition-colors"
          >
            <span className="text-[#2E5C8A] text-[10px] font-bold uppercase tracking-wide block">
              Owed to you {receivableExpanded ? '▲' : '▼'}
            </span>
            <span className="font-bold text-sm text-[#234A6E] mt-0.5 block">৳{totalReceivable.toLocaleString('en-IN')}</span>
          </button>
          <button
            onClick={onOpenLoansPage}
            className="text-left rounded-xl p-2.5 -m-2.5 active:bg-[#F7F3EA] transition-colors"
          >
            <span className="text-[#2E5C8A] text-[10px] font-bold uppercase tracking-wide block">You owe</span>
            <span className="font-bold text-sm text-[#234A6E] mt-0.5 block">৳{totalPayable.toLocaleString('en-IN')}</span>
          </button>
        </div>
      )}

      {receivableExpanded && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={onOpenBikeDue}
            className="bg-[#FFFDF8] border border-[#C2D3E0] rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">জমা বাকি</span>
            <span className="font-extrabold text-base text-[#2E5C8A] mt-0.5 block">৳{bikeDueTotal.toLocaleString('en-IN')}</span>
          </button>
          <button
            onClick={onOpenCashLoan}
            className="bg-[#FFFDF8] border border-[#C2D3E0] rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">নগদ ধার</span>
            <span className="font-extrabold text-base text-[#2E5C8A] mt-0.5 block">৳{cashLoanReceivable.toLocaleString('en-IN')}</span>
          </button>
        </div>
      )}
    </section>
  );
}
