'use client';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function SummaryCard({ summary, pocketBalance = 0, selectedDate, onDateChange }) {
  const {
    totalIncome = 0, totalExpense = 0,
  } = summary;

  return (
    <section className="ledger-rule bg-[#FFFDF8] border border-[#E3D9C2] rounded-[20px] p-6 pl-8 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">
          My Pocket Today
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
      <h2 className="text-[40px] font-black mt-1.5 tracking-tight leading-none text-[#1F7A4D]">
        ৳{pocketBalance.toLocaleString('en-IN')}
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
    </section>
  );
}
