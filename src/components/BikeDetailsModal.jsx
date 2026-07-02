'use client';

import { useState, useEffect } from 'react';
import { formatGlobalDate, todayDhakaDateString } from '@/lib/dateUtils';

// Which sub-view is currently expanded below the boxes: null | 'earning' | 'offdays' | 'expenses'
export default function BikeDetailsModal({ bike, activeDate, onClose }) {
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
  const [period, setPeriod] = useState('month');
  const [showKakaAmountInput, setShowKakaAmountInput] = useState(false);
  const [kakaAmount, setKakaAmount] = useState('');

  const todayStr = activeDate || todayDhakaDateString();
  const todayColl = earningDetails?.find(
    (c) => new Date(c.date).toISOString().split('T')[0] === todayStr
  );

  const handleKakaAction = async (shift, paidRent, offDayReason) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collection',
          bikeId: bike._id,
          date: todayStr,
          shift,
          paidRent,
          offDayReason: shift === 'Off Day' ? (offDayReason || 'Driver Unavailable') : 'N/A',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || 'Failed to save entry');
      } else {
        setShowKakaAmountInput(false);
        setKakaAmount('');
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setSubmitError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Shajahan Kaka's daily rent is always ৳100. If he already has an
  // outstanding due, tapping "Given" opens a manual amount field instead of
  // instantly logging ৳100 — whatever he actually hands over that day, since
  // any amount above ৳100 should adjust against (reduce) his existing due.
  const handleKakaGivenClick = () => {
    const hasDue = stats && stats.totalDue > 0;
    if (hasDue) {
      setShowKakaAmountInput(true);
      setSubmitError('');
    } else {
      handleKakaAction('Full Day', 100);
    }
  };

  const handleKakaManualSubmit = () => {
    const amount = Number(kakaAmount);
    if (kakaAmount === '' || Number.isNaN(amount) || amount < 0) {
      setSubmitError('Enter a valid amount.');
      return;
    }
    handleKakaAction('Full Day', amount);
  };

  useEffect(() => {
    if (!bike) return;

    let isMounted = true;
    setActiveView(null);
    setExpenseDetail(null);
    setShowKakaAmountInput(false);
    setKakaAmount('');
    setSubmitError('');

    const fetchStats = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/bikes/${bike._id}/stats?period=${period}`);
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
  }, [bike, refreshKey, period]);

  if (!bike) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#F7F3EA] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="bg-[#FFFDF8] px-6 py-5 border-b border-[#E3D9C2] shrink-0 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#2B2620] truncate">
                {bike.isShajahanKaka ? bike.name : `Bike ${bike.name}`}
              </h2>
              <p className="text-sm font-bold text-[#6B5F4F] truncate">{bike.driver}</p>
            </div>
            <div className="relative shrink-0">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-[#2B2620] text-white border border-[#2B2620] focus:outline-none cursor-pointer"
              >
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="alltime">All Time</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white text-[8px]">▼</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F7F3EA] hover:bg-[#E3D9C2] text-[#6B5F4F] rounded-full transition-colors font-bold shrink-0">
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
              {/* Today's Collection (At the top of the card) */}
              <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#E3D9C2] shadow-sm space-y-3">
                {todayColl ? (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-bold text-[#1F7A4D] uppercase tracking-wider flex items-center gap-1">
                      <span>✓</span> Today&apos;s Collection Locked
                    </span>
                    <span className="text-xs font-black text-white bg-[#1F7A4D] px-2.5 py-1 rounded-lg">
                      {todayColl.shift === 'Off Day' ? 'Off Day' : `${todayColl.shift} (৳${todayColl.credit})`}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wider block">Today&apos;s Collection</span>
                      <span className="text-[10px] font-bold text-[#7D7156]">{formatGlobalDate(todayStr)}</span>
                    </div>

                    {submitError && <p className="text-[11px] font-bold text-[#B33B2E] text-center">{submitError}</p>}

                    {bike.isShajahanKaka ? (
                      showKakaAmountInput ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">
                            Amount received (৳) <span className="text-[#7D7156] font-normal">— extra over ৳100 clears his due</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            placeholder="e.g. 150"
                            value={kakaAmount}
                            onChange={(e) => setKakaAmount(e.target.value)}
                            className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <button disabled={submitting} onClick={() => { setShowKakaAmountInput(false); setKakaAmount(''); setSubmitError(''); }}
                              className="py-2.5 text-[11px] font-bold bg-[#F7F3EA] text-[#6B5F4F] border border-[#E3D9C2] rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                              Cancel
                            </button>
                            <button disabled={submitting} onClick={handleKakaManualSubmit}
                              className="py-2.5 text-[11px] font-bold bg-[#1F7A4D] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                              {submitting ? '...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button disabled={submitting} onClick={handleKakaGivenClick}
                            className="py-2.5 text-[11px] font-bold bg-[#1F7A4D] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                            {submitting ? '...' : 'Given'}
                          </button>
                          <button disabled={submitting} onClick={() => handleKakaAction('Off Day', 0)}
                            className="py-2.5 text-[11px] font-bold bg-[#B33B2E] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                            {submitting ? '...' : 'Off Day'}
                          </button>
                        </div>
                      )
                    ) : (
                      <BikeCollectionForm bike={bike} submitting={submitting} onSubmit={handleKakaAction} />
                    )}
                  </>
                )}
              </div>

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
                    ) : earningDetails.map((row) => {
                      let badgeLabel = 'Full';
                      let badgeColor = 'bg-[#E6F0E5] text-[#1F7A4D] border-[#C5DCC2]'; // Green

                      const dailyRent = bike.dailyRent || 500;
                      const expectedRent = row.shift === 'Full Day' ? dailyRent : row.shift === 'Half Day' ? dailyRent * 0.5 : 0;

                      if (row.shift === 'Off Day') {
                        badgeLabel = 'Off';
                        badgeColor = 'bg-[#F0EFF1] text-[#7D7156] border-[#D4D2D5]'; // Grey
                      } else if (row.shift === 'Half Day') {
                        badgeLabel = 'Half';
                        badgeColor = 'bg-[#FFF9E6] text-[#B27B00] border-[#FCE8B2]'; // Yellow
                        if (row.credit < expectedRent) {
                          badgeLabel = 'Due';
                          badgeColor = 'bg-[#F7E9E5] text-[#B33B2E] border-[#E3C2B8]'; // Red
                        }
                      } else {
                        // Full Day
                        if (row.credit < expectedRent) {
                          badgeLabel = 'Due';
                          badgeColor = 'bg-[#F7E9E5] text-[#B33B2E] border-[#E3C2B8]'; // Red
                        }
                      }

                      return (
                        <div key={row._id} className="grid grid-cols-3 px-4 py-3 text-xs items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#2B2620] font-semibold whitespace-nowrap">{formatGlobalDate(row.date)}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                          </div>
                          <span className="text-right font-bold text-[#1F7A4D]">৳{row.credit.toLocaleString('en-IN')}</span>
                          <span className="text-right font-bold text-[#2E5C8A]">৳{row.due.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
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

function BikeCollectionForm({ bike, submitting, onSubmit }) {
  const [shift, setShift] = useState('Full Day');
  const [paidRent, setPaidRent] = useState('');
  const [offDayReason, setOffDayReason] = useState('');

  const expectedRent = shift === 'Full Day' ? bike.dailyRent : shift === 'Half Day' ? bike.dailyRent * 0.5 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shift === 'Off Day' && !offDayReason) return; // guarded by disabling submit below too
    const finalPaid = shift === 'Off Day' ? 0 : (paidRent === '' ? expectedRent : Number(paidRent));
    onSubmit(shift, finalPaid, shift === 'Off Day' ? offDayReason : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">Shift</label>
        <div className="grid grid-cols-3 gap-1 bg-[#F7F3EA] p-1 rounded-xl">
          {['Full Day', 'Half Day', 'Off Day'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setShift(s);
                if (s === 'Off Day') { setPaidRent('0'); setOffDayReason(''); }
                else { setPaidRent(''); setOffDayReason(''); }
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                shift === s ? 'bg-[#2B2620] text-white' : 'text-[#6B5F4F]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {shift === 'Off Day' ? (
        <div>
          <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">Reason</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'No Driver', value: 'Driver Unavailable' },
              { label: 'Mechanical Issue', value: 'Mechanical Issue' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setOffDayReason(r.value)}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                  offDayReason === r.value
                    ? 'bg-[#B33B2E] text-white border-[#B33B2E]'
                    : 'bg-[#FFFDF8] text-[#6B5F4F] border-[#E3D9C2]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
            Paid Rent (৳) <span className="text-[#7D7156] font-normal">(Expected: ৳{expectedRent})</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder={expectedRent}
            value={paidRent}
            onChange={(e) => setPaidRent(e.target.value)}
            className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || (shift === 'Off Day' && !offDayReason)}
        className="w-full py-2.5 bg-[#2B2620] text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Save Collection'}
      </button>
    </form>
  );
}
