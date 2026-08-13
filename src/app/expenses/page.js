"use client";

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import EntryFlow from '@/components/EntryFlow';

const CATEGORIES = ['বাসার খরচ', 'আমার খরচ', 'মেডিসিন', 'অন্যান্য খরচ'];

// Elegant color palettes for categories (dark luxurious cards with glows)
const CAT_METADATA = {
  'বাসার খরচ': {
    name: 'Home / Living',
    desc: 'Household expenses & rent',
    grad: 'linear-gradient(135deg, #1E1B4B 0%, #311042 100%)', // Deep purple-blue
    glow: 'rgba(99, 102, 241, 0.15)',
    icon: '🏠'
  },
  'আমার খরচ': {
    name: 'Personal / Self',
    desc: 'Self spending & pocket cash',
    grad: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', // Premium dark slate
    glow: 'rgba(148, 163, 184, 0.15)',
    icon: '👤'
  },
  'মেডিসিন': {
    name: 'Medical / Health',
    desc: 'Medicines & doctor bills',
    grad: 'linear-gradient(135deg, #311010 0%, #1F0808 100%)', // Warm crimson dark
    glow: 'rgba(239, 68, 68, 0.15)',
    icon: '💊'
  },
  'অন্যান্য খরচ': {
    name: 'Other Expenses',
    desc: 'Uncategorized general costs',
    grad: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)', // Neutral charcoal slate
    glow: 'rgba(100, 116, 139, 0.15)',
    icon: '✨'
  },
  '__bike__': {
    name: 'Bike Operations',
    desc: 'Maintenance, fuel & parts',
    grad: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)', // Deep emerald slate
    glow: 'rgba(16, 185, 129, 0.15)',
    icon: '🏍️'
  }
};

function dateKey(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d)) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ExpenseSummaryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchExpenses = useCallback(() => {
    setLoadError('');
    setLoading(true);
    fetch('/api/transactions?range=all')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setTransactions((data.transactions || []).filter((t) => t.type === 'Expense'));
        else setLoadError(data.error || 'Failed to load expenses.');
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const monthExpenses = transactions.filter((t) => dateKey(t.date).startsWith(selectedMonth));
  const grandTotal = monthExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const goMonth = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const currentMonth = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();
    if (newMonth <= currentMonth) setSelectedMonth(newMonth);
  };

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })();

  return (
    <div>
      <PageHeader
        title="Expense Hub"
        subtitle="Analytical budget monitor"
      />

      {/* Month Selector Bar */}
      <div className="max-w-md mx-auto px-5 mb-5">
        <div 
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            boxShadow: '0 8px 30px rgba(15,23,42,0.3)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
          className="flex items-center justify-between rounded-3xl px-4 py-4 text-white"
        >
          <button
            onClick={() => goMonth(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white font-extrabold text-sm hover:bg-white/10 transition-all active:scale-90"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-none">Selected Cycle</p>
            <p className="text-base font-black text-white mt-1.5 leading-none">{monthLabel}</p>
          </div>
          <button
            onClick={() => goMonth(1)}
            disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white font-extrabold text-sm hover:bg-white/10 transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>

      {/* Total Overview - Clean borderless layout */}
      <div className="max-w-md mx-auto px-5 mb-5 flex justify-between items-baseline border-b border-[#E3D9C2] pb-3">
        <span className="text-xs font-black text-[#6B5F4F] uppercase tracking-wide">মোট খরচ</span>
        <span className="text-2xl font-black text-[#B33B2E]">৳{grandTotal.toLocaleString('en-IN')}</span>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-5 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-[#7D7156] py-10">Loading expenses…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#B33B2E]">{loadError}</p>
            <button onClick={fetchExpenses} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : monthExpenses.length === 0 ? (
          <div className="text-center py-20 bg-[#FFFDF8] border border-[#E3D9C2] rounded-3xl">
            <p className="text-4xl mb-3">🍃</p>
            <p className="text-sm font-black text-[#2B2620]">No Expenses Registered</p>
            <p className="text-xs text-[#7D7156] mt-1">Excellent budget discipline this month.</p>
          </div>
        ) : (
          <>
            {/* Category Cards */}
            {CATEGORIES.map((cat) => {
              const catEntries = monthExpenses.filter((t) => t.subType === cat);
              const sum = catEntries.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
              const isExpanded = expandedCategory === cat;
              const percentage = grandTotal > 0 ? Math.round((sum / grandTotal) * 100) : 0;
              const meta = CAT_METADATA[cat];

              // Calculate previous month date string (YYYY-MM)
              const prevMonthStr = (() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              })();

              const prevSum = transactions
                .filter((t) => t.subType === cat && dateKey(t.date).startsWith(prevMonthStr))
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

              const diff = sum - prevSum;
              const percentChange = prevSum > 0 ? Math.round((Math.abs(diff) / prevSum) * 100) : 0;

              return (
                <div 
                  key={cat} 
                  style={{
                    background: meta.grad,
                    boxShadow: `0 4px 20px ${meta.glow || 'rgba(0,0,0,0.1)'}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                  className="rounded-3xl overflow-hidden text-white"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                    className="w-full px-5 py-4 flex justify-between items-center active:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg shadow-inner">
                        {meta.icon}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black text-white">{cat}</p>
                        <p className="text-[10px] text-white/50 font-bold mt-0.5">
                          {catEntries.length} entries · {percentage}% of total
                        </p>
                        {/* Comparison Summary */}
                        <p className="text-[9px] font-semibold mt-1">
                          {diff > 0 ? (
                            <span className="text-[#FF8E8E]">
                              ৳{diff.toLocaleString('en-IN')} ({percentChange}%) more than last month
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-[#5DE88A]">
                              ৳{Math.abs(diff).toLocaleString('en-IN')} ({percentChange}%) less than last month
                            </span>
                          ) : (
                            <span className="text-white/40">Same as last month</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#FF6B6B]">৳{sum.toLocaleString('en-IN')}</span>
                      </div>
                      <span className={`text-[10px] text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </button>



                  {isExpanded && (
                    <div className="px-5 py-4 space-y-3 bg-black/20 border-t border-white/5">
                      {catEntries.length === 0 ? (
                        <p className="text-[11px] text-white/40 italic">No entries this cycle</p>
                      ) : (
                        catEntries
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((t) => {
                            const d = new Date(t.date);
                            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                            return (
                              <div key={t._id} className="flex justify-between items-start gap-3 border-l-2 border-[#FF6B6B]/40 pl-3 py-1 bg-white/2 p-2.5 rounded-2xl">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-black text-white">{t.title}</p>
                                  {t.noteText && <p className="text-[10px] text-white/60 mt-0.5 leading-relaxed">{t.noteText}</p>}
                                  {t.bikeName && (
                                    <span className="inline-block text-[9px] font-black text-white/70 bg-white/10 px-2 py-0.5 rounded-lg mt-1.5">
                                      {t.bikeName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[12px] font-black text-[#FF6B6B]">−৳{Number(t.amount).toLocaleString('en-IN')}</p>
                                  <p className="text-[9px] text-white/40 mt-1">{dateStr}</p>
                                  {t.isCredit && (
                                    <span className="inline-block text-[8px] font-black text-white bg-[#B33B2E] px-1.5 py-0.5 rounded-md mt-1">CREDIT</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized / Bike Expenses */}
            {(() => {
              const bikeExpenses = monthExpenses.filter((t) => !CATEGORIES.includes(t.subType));
              if (bikeExpenses.length === 0) return null;
              const sum = bikeExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
              const isExpanded = expandedCategory === '__bike__';
              const percentage = grandTotal > 0 ? Math.round((sum / grandTotal) * 100) : 0;
              const meta = CAT_METADATA['__bike__'];
              const prevMonthStr = (() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              })();

              const prevSum = transactions
                .filter((t) => !CATEGORIES.includes(t.subType) && dateKey(t.date).startsWith(prevMonthStr))
                .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

              const diff = sum - prevSum;
              const percentChange = prevSum > 0 ? Math.round((Math.abs(diff) / prevSum) * 100) : 0;

              return (
                <div 
                  style={{
                    background: meta.grad,
                    boxShadow: `0 4px 20px ${meta.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                  className="rounded-3xl overflow-hidden text-white"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : '__bike__')}
                    className="w-full px-5 py-4 flex justify-between items-center active:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg shadow-inner">
                        {meta.icon}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-black text-white">{meta.name}</p>
                        <p className="text-[10px] text-white/50 font-bold mt-0.5">
                          {bikeExpenses.length} entries · {percentage}% of total
                        </p>
                        {/* Comparison Summary */}
                        <p className="text-[9px] font-semibold mt-1">
                          {diff > 0 ? (
                            <span className="text-[#FF8E8E]">
                              ৳{diff.toLocaleString('en-IN')} ({percentChange}%) more than last month
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-[#5DE88A]">
                              ৳{Math.abs(diff).toLocaleString('en-IN')} ({percentChange}%) less than last month
                            </span>
                          ) : (
                            <span className="text-white/40">Same as last month</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-black text-[#5DE88A]">৳{sum.toLocaleString('en-IN')}</span>
                      </div>
                      <span className={`text-[10px] text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </button>



                  {isExpanded && (
                    <div className="px-5 py-4 space-y-3 bg-black/20 border-t border-white/5">
                      {bikeExpenses
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((t) => {
                          const d = new Date(t.date);
                          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                          return (
                            <div key={t._id} className="flex justify-between items-start gap-3 border-l-2 border-[#5DE88A]/40 pl-3 py-1 bg-white/2 p-2.5 rounded-2xl">
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-black text-white">{t.title}</p>
                                {t.noteText && <p className="text-[10px] text-white/60 mt-0.5 leading-relaxed">{t.noteText}</p>}
                                {t.bikeName && (
                                  <span className="inline-block text-[9px] font-black text-white/70 bg-white/10 px-2 py-0.5 rounded-lg mt-1.5">
                                    {t.bikeName}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[12px] font-black text-[#5DE88A]">−৳{Number(t.amount).toLocaleString('en-IN')}</p>
                                <p className="text-[9px] text-white/40 mt-1">{dateStr}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </main>

      <div className="h-24" />
      <EntryFlow onSaved={fetchExpenses} />
    </div>
  );
}
