'use client';

import { useState, useEffect } from 'react';
import { formatGlobalDate, todayDhakaDateString } from '@/lib/dateUtils';

// Which sub-view is currently expanded below the boxes: null | 'earning' | 'offdays' | 'expenses'
export default function BikeDetailsModal({ bike, onClose }) {
  const [stats, setStats] = useState(null);
  const [earningDetails, setEarningDetails] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeView, setActiveView] = useState(null);
  const [expenseDetail, setExpenseDetail] = useState(null); // the expense whose note popup is open
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const todayStr = todayDhakaDateString();
  const todayColl = earningDetails?.find(
    (c) => new Date(c.date).toISOString().split('T')[0] === todayStr
  );

  const handleKakaAction = async (shift, paidRent) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collection',
          bikeId: bike._id,
          date: todayDhakaDateString(),
          shift,
          paidRent,
          offDayReason: shift === 'Off Day' ? 'Driver Unavailable' : 'N/A',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || 'Failed to save entry');
      } else {
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setSubmitError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!bike) return;

    let isMounted = true;
    setActiveView(null);
    setExpenseDetail(null);

    const fetchStats = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/bikes/${bike._id}/stats?period=all`);
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok) {
          setStats(data.stats);
          setEarningDetails(data.earningDetails || []);
          setOffDays(data.offDays || []);
          setExpenses(data.expenses || []);
        } else {
          setLoadError(data.error || 'Failed to load bike details.');
        }
      } catch {
        if (isMounted) setLoadError('Could not reach the server. Check your internet connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { isMounted = false; };
  }, [bike, refreshKey]);

  if (!bike) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#F7F3EA] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="bg-[#FFFDF8] px-6 py-5 border-b border-[#E3D9C2] shrink-0 flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-xl font-black text-[#2B2620]">
              {bike.isShajahanKaka ? bike.name : `Bike ${bike.name}`}
            </h2>
            <p className="text-sm font-bold text-[#6B5F4F]">{bike.driver}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F7F3EA] hover:bg-[#E3D9C2] text-[#6B5F4F] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {loading ? (
            <div className="py-10 text-center text-sm font-bold text-[#7D7156] animate-pulse">Loading data...</div>
          ) : loadError ? (
            <div className="py-10 text-center text-sm font-bold text-[#B33B2E]">{loadError}</div>
          ) : stats ? (
            <>
              {/* Box 1 & 2: Total Earning, Total Due */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#E3D9C2] shadow-sm">
                  <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wider block">Total Earning</span>
                  <span className="text-lg font-black text-[#1F7A4D] block mt-1">৳{stats.totalEarning.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#E3D9C2] shadow-sm">
                  <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wider block">Total Due</span>
                  <span className="text-lg font-black text-[#2E5C8A] block mt-1">৳{stats.totalDue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Shajahan Kaka Quick Actions Section */}
              {bike.isShajahanKaka && (
                <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#E3D9C2] shadow-sm space-y-3">
                  <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wider block">Today's Collection</span>
                  
                  {submitError && <p className="text-[11px] font-bold text-[#B33B2E] text-center">{submitError}</p>}
                  
                  {todayColl ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 text-[#1F7A4D] bg-[#E6F0E5]/60 rounded-xl">
                      <span>✓ Today's Status: {todayColl.shift === 'Off Day' ? 'Off Day (৳0)' : todayColl.credit > 0 ? `Given (৳100)` : 'Not Given (Due - ৳100)'}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        disabled={submitting}
                        onClick={() => handleKakaAction('Full Day', 100)}
                        className="py-2.5 text-[11px] font-bold bg-[#1F7A4D] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        {submitting ? '...' : 'Given'}
                      </button>
                      <button
                        disabled={submitting}
                        onClick={() => handleKakaAction('Full Day', 0)}
                        className="py-2.5 text-[11px] font-bold bg-[#2E5C8A] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        {submitting ? '...' : 'Not Given (Due)'}
                      </button>
                      <button
                        disabled={submitting}
                        onClick={() => handleKakaAction('Off Day', 0)}
                        className="py-2.5 text-[11px] font-bold bg-[#B33B2E] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        {submitting ? '...' : 'Off Day'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Full-width button: Earning & Expense Details */}
              <button
                onClick={() => setActiveView(activeView === 'earning' ? null : 'earning')}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors ${
                  activeView === 'earning' ? 'bg-[#2B2620] text-white' : 'bg-[#FFFDF8] border border-[#E3D9C2] text-[#2B2620]'
                }`}
              >
                Earning & Expense Details {activeView === 'earning' ? '▲' : '▼'}
              </button>

              {activeView === 'earning' && (
                <div className="bg-[#FFFDF8] rounded-2xl border border-[#E3D9C2] overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-2.5 bg-[#F7F3EA] text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide">
                    <span>Date</span>
                    <span className="text-right">Credit</span>
                    <span className="text-right">Due</span>
                  </div>
                  <div className="divide-y divide-[#E3D9C2] max-h-72 overflow-y-auto">
                    {earningDetails.length === 0 ? (
                      <p className="text-center text-xs text-[#7D7156] py-6">No collection records yet.</p>
                    ) : earningDetails.map((row) => (
                      <div key={row._id} className="grid grid-cols-3 px-4 py-3 text-xs items-center">
                        <span className="text-[#2B2620] font-semibold">{formatGlobalDate(row.date)}</span>
                        <span className="text-right font-bold text-[#1F7A4D]">৳{row.credit.toLocaleString('en-IN')}</span>
                        <span className="text-right font-bold text-[#2E5C8A]">৳{row.due.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Box 3 & 4: Off Day, Expenses */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveView(activeView === 'offdays' ? null : 'offdays')}
                  className={`p-4 rounded-2xl border shadow-sm text-left transition-colors ${
                    activeView === 'offdays' ? 'bg-[#2B2620] border-[#2B2620]' : 'bg-[#FFFDF8] border-[#E3D9C2]'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${activeView === 'offdays' ? 'text-[#7D7156]' : 'text-[#6B5F4F]'}`}>
                    Off Day
                  </span>
                  <span className={`text-lg font-black block mt-1 ${activeView === 'offdays' ? 'text-white' : 'text-[#2B2620]'}`}>
                    {offDays.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveView(activeView === 'expenses' ? null : 'expenses')}
                  className={`p-4 rounded-2xl border shadow-sm text-left transition-colors ${
                    activeView === 'expenses' ? 'bg-[#2B2620] border-[#2B2620]' : 'bg-[#FFFDF8] border-[#E3D9C2]'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${activeView === 'expenses' ? 'text-[#7D7156]' : 'text-[#6B5F4F]'}`}>
                    Expenses
                  </span>
                  <span className={`text-lg font-black block mt-1 ${activeView === 'expenses' ? 'text-white' : 'text-[#B33B2E]'}`}>
                    ৳{stats.totalExpense.toLocaleString('en-IN')}
                  </span>
                </button>
              </div>

              {activeView === 'offdays' && (
                <div className="bg-[#FFFDF8] rounded-2xl border border-[#E3D9C2] overflow-hidden">
                  <div className="grid grid-cols-2 px-4 py-2.5 bg-[#F7F3EA] text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide">
                    <span>Date</span>
                    <span>Reason</span>
                  </div>
                  <div className="divide-y divide-[#E3D9C2] max-h-72 overflow-y-auto">
                    {offDays.length === 0 ? (
                      <p className="text-center text-xs text-[#7D7156] py-6">No off days recorded.</p>
                    ) : offDays.map((d) => (
                      <div key={d._id} className="grid grid-cols-2 px-4 py-3 text-xs items-center">
                        <span className="text-[#2B2620] font-semibold">{formatGlobalDate(d.date)}</span>
                        <span className="text-[#B33B2E] font-bold">{d.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'expenses' && (
                <div className="bg-[#FFFDF8] rounded-2xl border border-[#E3D9C2] overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_auto] px-4 py-2.5 bg-[#F7F3EA] text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide">
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right pr-1">Detail</span>
                  </div>
                  <div className="divide-y divide-[#E3D9C2] max-h-72 overflow-y-auto">
                    {expenses.length === 0 ? (
                      <p className="text-center text-xs text-[#7D7156] py-6">No expenses recorded for this bike.</p>
                    ) : expenses.map((e) => (
                      <div key={e._id} className="grid grid-cols-[1fr_1fr_auto] px-4 py-3 text-xs items-center">
                        <span className="text-[#2B2620] font-semibold">{formatGlobalDate(e.date)}</span>
                        <span className="text-right font-bold text-[#B33B2E]">৳{e.amount.toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => setExpenseDetail(e)}
                          aria-label="View expense detail"
                          className="justify-self-end w-7 h-7 rounded-full bg-[#F7F3EA] flex items-center justify-center text-[#6B5F4F] font-bold"
                        >
                          ⓘ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center text-sm font-bold text-[#7D7156]">Failed to load data</div>
          )}
        </div>
      </div>

      {/* Expense detail popup */}
      {expenseDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-5" onClick={() => setExpenseDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[#FFFDF8] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-fade-scale-in">
            <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide">{expenseDetail.category}</span>
            <p className="text-lg font-black text-[#B33B2E] mt-1">৳{expenseDetail.amount.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-[#7D7156] mt-0.5">{formatGlobalDate(expenseDetail.date)}</p>
            <div className="mt-3 pt-3 border-t border-[#E3D9C2]">
              <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">Description</span>
              <p className="text-sm text-[#2B2620]">
                {expenseDetail.isCredit
                  ? `Credit / Due — Payable to: ${expenseDetail.payableToShop || 'N/A'}`
                  : (expenseDetail.note || 'No additional description.')}
              </p>
            </div>
            <button
              onClick={() => setExpenseDetail(null)}
              className="w-full mt-4 py-2.5 bg-[#F7F3EA] text-[#6B5F4F] text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
