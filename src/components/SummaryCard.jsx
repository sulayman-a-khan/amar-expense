'use client';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function SummaryCard({ summary, selectedDate, onDateChange }) {
  const { netProfit = 0, totalIncome = 0, totalExpense = 0, totalReceivable = 0, totalPayable = 0 } = summary;
  const isPositive = netProfit >= 0;

  return (
    <section className="bg-white border border-[#E8EAED] rounded-[28px] p-6 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-[#6B7280] tracking-widest uppercase">
          Net Balance
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold text-[#1A1D29] bg-[#F4F5F7] border border-[#E8EAED] rounded-lg px-2 py-1 flex items-center gap-1 cursor-pointer">
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
      <h2 className={`text-[40px] font-black mt-1.5 tracking-tight leading-none ${isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
        {isPositive ? '+' : '−'} ৳{Math.abs(netProfit).toLocaleString('en-IN')}
      </h2>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3">
          <span className="text-[#16A34A] text-[10px] font-bold uppercase tracking-wide block">Income</span>
          <span className="font-extrabold text-lg text-[#15803D] mt-0.5 block">৳{totalIncome.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-3">
          <span className="text-[#DC2626] text-[10px] font-bold uppercase tracking-wide block">Expense</span>
          <span className="font-extrabold text-lg text-[#B91C1C] mt-0.5 block">৳{totalExpense.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {(totalReceivable > 0 || totalPayable > 0) && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-4 border-t border-[#E8EAED]">
          <div>
            <span className="text-[#2563EB] text-[10px] font-bold uppercase tracking-wide block">Owed to you</span>
            <span className="font-bold text-sm text-[#1D4ED8] mt-0.5 block">৳{totalReceivable.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[#2563EB] text-[10px] font-bold uppercase tracking-wide block">You owe</span>
            <span className="font-bold text-sm text-[#1D4ED8] mt-0.5 block">৳{totalPayable.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </section>
  );
}
