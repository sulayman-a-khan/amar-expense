'use client';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function SummaryCard({ summary, pocketBalance = 0, selectedDate, onDateChange }) {
  const { totalIncome = 0, totalExpense = 0 } = summary;

  const todayNet = totalIncome - totalExpense;
  const previousBalance = pocketBalance - todayNet;
  const isPositiveNet = todayNet >= 0;

  return (
    <section
      style={{
        background: 'linear-gradient(145deg, #0e2318 0%, #163524 45%, #0a1d10 100%)',
        boxShadow: '0 20px 60px rgba(15, 40, 25, 0.45), 0 4px 16px rgba(0,0,0,0.3)',
      }}
      className="relative overflow-hidden rounded-[28px] p-6"
    >
      {/* Decorative circles */}
      <div
        style={{
          background: 'radial-gradient(circle, rgba(52,199,89,0.12) 0%, transparent 70%)',
          width: 240, height: 240, top: -80, right: -60,
        }}
        className="absolute rounded-full pointer-events-none"
      />
      <div
        style={{
          background: 'radial-gradient(circle, rgba(52,199,89,0.06) 0%, transparent 70%)',
          width: 180, height: 180, bottom: -60, left: -40,
        }}
        className="absolute rounded-full pointer-events-none"
      />

      {/* Top row: label + date */}
      <div className="relative flex justify-between items-center">
        <span
          style={{ letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)' }}
          className="text-[10px] font-bold uppercase"
        >
          My Pocket Today
        </span>

        <div className="relative">
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(6px)',
            }}
            className="text-[11px] font-semibold text-white/70 rounded-xl px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="opacity-60">
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="white" strokeWidth="1.2"/>
              <path d="M4 1v2M8 1v2M1 5h10" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {formatGlobalDate(selectedDate)}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={onDateChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Hero balance */}
      <div className="relative mt-5">
        <div className="flex items-baseline gap-2">
          <span
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, fontWeight: 800, lineHeight: 1 }}
          >
            ৳
          </span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: '#ffffff',
            }}
          >
            {pocketBalance.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Net change + previous row */}
        <div className="flex items-center gap-2.5 mt-3">
          {/* Net badge */}
          <span
            style={{
              background: isPositiveNet
                ? 'rgba(52,199,89,0.18)'
                : 'rgba(255,80,80,0.18)',
              border: `1px solid ${isPositiveNet ? 'rgba(52,199,89,0.35)' : 'rgba(255,80,80,0.35)'}`,
              color: isPositiveNet ? '#5de88a' : '#ff7070',
            }}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full leading-none"
          >
            {isPositiveNet ? '▲' : '▼'} {isPositiveNet ? '+' : '−'}৳{Math.abs(todayNet).toLocaleString('en-IN')} today
          </span>

          <span
            style={{ color: 'rgba(255,255,255,0.3)' }}
            className="text-[11px] font-semibold"
          >
            was ৳{previousBalance.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{ background: 'rgba(255,255,255,0.08)' }}
        className="relative h-px w-full my-5"
      />

      {/* Income / Expense pills */}
      <div className="relative grid grid-cols-2 gap-3">
        {/* Income */}
        <div
          style={{
            background: 'rgba(52,199,89,0.10)',
            border: '1px solid rgba(52,199,89,0.22)',
          }}
          className="rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 8V2M2 5l3-3 3 3" stroke="#5de88a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'rgba(93,232,138,0.75)', letterSpacing: '0.1em' }} className="text-[9px] font-bold uppercase">Income</span>
          </div>
          <span style={{ color: '#5de88a' }} className="text-[17px] font-extrabold leading-none">
            ৳{totalIncome.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Expense */}
        <div
          style={{
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.2)',
          }}
          className="rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2v6M2 5l3 3 3-3" stroke="#ff7070" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ color: 'rgba(255,112,112,0.75)', letterSpacing: '0.1em' }} className="text-[9px] font-bold uppercase">Expense</span>
          </div>
          <span style={{ color: '#ff7070' }} className="text-[17px] font-extrabold leading-none">
            ৳{totalExpense.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </section>
  );
}
