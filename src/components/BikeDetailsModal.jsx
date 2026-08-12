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
  const [monthlyData, setMonthlyData] = useState(null);
  const [manualDueEntries, setManualDueEntries] = useState([]);
  const [showManualReduce, setShowManualReduce] = useState(false);
  const [manualReduceAmount, setManualReduceAmount] = useState('');
  const [manualReduceNote, setManualReduceNote] = useState('');
  const [manualReduceSubmitting, setManualReduceSubmitting] = useState(false);
  const [manualReduceError, setManualReduceError] = useState('');

  const todayStr = activeDate || todayDhakaDateString();
  const todayColl = earningDetails?.find(
    (c) => new Date(c.date).toISOString().split('T')[0] === todayStr
  );

  const handleKakaAction = async (shift, paidRent, offDayReason, expectedRent) => {
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
          ...(shift === 'Half Day' ? { expectedRent } : {}),
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

  // Lets you knock down Shajahan Kaka's outstanding due by hand (e.g. he
  // paid off some due separately, in person, or you're adjusting it) —
  // fully independent of today's collection entry. Every reduce is logged
  // as its own history row (see manualDueEntries) so nothing is silently
  // lost.
  const handleManualReduceSubmit = async () => {
    const amount = Number(manualReduceAmount);
    if (manualReduceAmount === '' || Number.isNaN(amount) || amount <= 0) {
      setManualReduceError('Enter a valid amount.');
      return;
    }
    if (stats && amount > stats.totalDue) {
      setManualReduceError(`Amount can't be more than the current due (৳${stats.totalDue.toLocaleString('en-IN')}).`);
      return;
    }
    setManualReduceSubmitting(true);
    setManualReduceError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_due_reduce',
          bikeId: bike._id,
          amount,
          note: manualReduceNote,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setManualReduceError(data.error || 'Failed to reduce due.');
      } else {
        setShowManualReduce(false);
        setManualReduceAmount('');
        setManualReduceNote('');
        setRefreshKey((k) => k + 1);
      }
    } catch {
      setManualReduceError('Network error');
    } finally {
      setManualReduceSubmitting(false);
    }
  };

  useEffect(() => {
    if (!bike) return;

    let isMounted = true;
    setActiveView(null);
    setExpenseDetail(null);
    setShowKakaAmountInput(false);
    setKakaAmount('');
    setSubmitError('');
    setShowManualReduce(false);
    setManualReduceAmount('');
    setManualReduceNote('');
    setManualReduceError('');

    // MONTHLY bikes use a completely separate data source (see
    // /api/bike-monthly-rent) — the DAILY stats endpoint below is left
    // fully intact for when a bike is on/returns to the DAILY agreement.
    if (bike.rentMode === 'MONTHLY') {
      const fetchMonthly = async () => {
        setLoading(true);
        setLoadError('');
        try {
          const res = await fetch(`/api/bike-monthly-rent?bikeId=${bike._id}`);
          const data = await res.json();
          if (!isMounted) return;
          if (res.ok) {
            setMonthlyData(data);
          } else {
            setLoadError(data.error || 'Failed to load monthly rent status.');
          }
        } catch {
          if (isMounted) setLoadError('Could not reach the server. Check your internet connection.');
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchMonthly();
      return () => { isMounted = false; };
    }

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
          setManualDueEntries(data.manualDueEntries || []);
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

  const isMonthly = bike.rentMode === 'MONTHLY';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#F7F3EA] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="bg-[#FFFDF8] px-6 py-5 border-b border-[#E3D9C2] shrink-0 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            {bike.driverImage ? (
              <img
                src={bike.driverImage}
                alt={bike.driver}
                className="w-11 h-11 rounded-full object-cover border border-[#E3D9C2] shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#F7F3EA] border border-[#E3D9C2] shrink-0 flex items-center justify-center text-[#6B5F4F] font-black text-sm">
                {(bike.driver || '?').charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#2B2620] truncate">
                {bike.isShajahanKaka ? bike.name : `Bike ${bike.name}`}
              </h2>
              <p className="text-sm font-bold text-[#6B5F4F] truncate">{bike.driver}</p>
            </div>
            {/* Week/Month/Year/All Time period selector is a DAILY-system
                concept (it drives the earning-history stats query below) —
                hidden for MONTHLY bikes since there's nothing to page
                through there beyond the current + past months already shown. */}
            {!isMonthly && (
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
            )}
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
          ) : isMonthly ? (
            // --- MONTHLY rent UI ---
            // Everything below this branch (down to the matching `) : stats ? (`
            // for the DAILY branch) is the entire ORIGINAL daily-rent UI,
            // preserved untouched and simply not rendered while this bike is
            // in MONTHLY mode. Switch the bike back to DAILY in Edit Bike to
            // see it again — nothing needs to be rebuilt.
            <MonthlyRentPanel
              bike={bike}
              data={monthlyData}
              onPaid={() => setRefreshKey((k) => k + 1)}
            />
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
                      {todayColl.shift === 'Off Day'
                        ? 'Off Day'
                        : todayColl.shift === 'Half Day'
                          ? `Half Day ${todayColl.expectedRent} (৳${todayColl.credit})`
                          : `${todayColl.shift} (৳${todayColl.credit})`}
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

              {/* Manual Due Reduce — Shajahan Kaka only. Lets you reduce his
                  outstanding due by hand (separate from a day's collection),
                  while keeping a full history of every manual reduce. */}
              {bike.isShajahanKaka && stats.totalDue > 0 && (
                <div className="bg-[#FFFDF8] p-4 rounded-2xl border border-[#E3D9C2] shadow-sm space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wider">Manual Due Reduce</span>
                    {!showManualReduce && (
                      <button
                        onClick={() => { setShowManualReduce(true); setManualReduceError(''); }}
                        className="text-[10px] font-bold text-[#2E5C8A] bg-[#EAF1F8] px-2.5 py-1 rounded-lg active:scale-[0.98] transition-transform"
                      >
                        Reduce Due
                      </button>
                    )}
                  </div>

                  {showManualReduce && (
                    <div className="space-y-2">
                      {manualReduceError && <p className="text-[11px] font-bold text-[#B33B2E]">{manualReduceError}</p>}
                      <div>
                        <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
                          Amount (৳) <span className="text-[#7D7156] font-normal">— max ৳{stats.totalDue.toLocaleString('en-IN')}</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={stats.totalDue}
                          autoFocus
                          placeholder="e.g. 500"
                          value={manualReduceAmount}
                          onChange={(e) => setManualReduceAmount(e.target.value)}
                          className="w-full p-2.5 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
                          Reason / note <span className="text-[#7D7156] font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Paid in person on Eid"
                          value={manualReduceNote}
                          onChange={(e) => setManualReduceNote(e.target.value)}
                          className="w-full p-2.5 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          disabled={manualReduceSubmitting}
                          onClick={() => { setShowManualReduce(false); setManualReduceAmount(''); setManualReduceNote(''); setManualReduceError(''); }}
                          className="py-2.5 text-[11px] font-bold bg-[#F7F3EA] text-[#6B5F4F] border border-[#E3D9C2] rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={manualReduceSubmitting}
                          onClick={handleManualReduceSubmit}
                          className="py-2.5 text-[11px] font-bold bg-[#2E5C8A] text-white rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                        >
                          {manualReduceSubmitting ? '...' : 'Confirm Reduce'}
                        </button>
                      </div>
                    </div>
                  )}

                  {manualDueEntries.length > 0 && (
                    <div className="pt-1 border-t border-[#E3D9C2] divide-y divide-[#E3D9C2]">
                      {manualDueEntries.map((entry) => (
                        <div key={entry._id} className="py-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold text-[#2B2620] block">{formatGlobalDate(entry.date)}</span>
                            <span className="text-[10px] text-[#7D7156] block truncate">{entry.note}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-[#2E5C8A] block">-৳{Number(entry.amount).toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-[#7D7156] block">Left: ৳{Number(entry.balanceAfter).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
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
                    ) : earningDetails.map((row) => {
                      let badgeLabel = 'Full';
                      let badgeColor = 'bg-[#E6F0E5] text-[#1F7A4D] border-[#C5DCC2]'; // Green

                      const dailyRent = bike.dailyRent || 500;
                      const expectedRent = row.shift === 'Full Day' ? dailyRent : row.shift === 'Half Day' ? (row.expectedRent ?? 0) : 0;

                      if (row.shift === 'Off Day') {
                        badgeLabel = 'Off';
                        badgeColor = 'bg-[#F0EFF1] text-[#7D7156] border-[#D4D2D5]'; // Grey
                      } else if (row.shift === 'Half Day') {
                        badgeLabel = `Half ${expectedRent}`;
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#2B2620] font-semibold whitespace-nowrap">{formatGlobalDate(row.date)}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            {row.dueCleared > 0 && (
                              row.dueBalanceAfter === 0 ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none text-white bg-[#1F7A4D] border-[#1F7A4D]">
                                  Due Paid
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none text-white bg-[#2E5C8A] border-[#2E5C8A]">
                                  Due Reduce ৳{Number(row.dueCleared).toLocaleString('en-IN')}
                                </span>
                              )
                            )}
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

function MonthlyRentPanel({ bike, data, onPaid }) {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('Pocket');
  const [note, setNote] = useState('');
  const [shortfallReason, setShortfallReason] = useState('');
  const [commitmentDate, setCommitmentDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (!data) return <div className="py-10 text-center text-sm font-bold text-[#7D7156]">Loading payment data...</div>;

  const { currentMonth, history, payments } = data;
  const targetRent = currentMonth.rentAmount || bike.monthlyRentAmount || 9000;
  const totalReceived = currentMonth.totalReceived || 0;
  const rawRemaining = currentMonth.remainingBalance;
  const remainingBalance = (rawRemaining !== undefined && rawRemaining !== null && !(rawRemaining === 0 && totalReceived < targetRent && currentMonth.status !== 'Paid'))
    ? rawRemaining
    : Math.max(0, targetRent - totalReceived);
  const isPaid = currentMonth.status === 'Paid' || (remainingBalance <= 0 && totalReceived >= targetRent);
  const isPartial = currentMonth.status === 'Partial' || (totalReceived > 0 && remainingBalance > 0);
  const isOverdue = currentMonth.status === 'Overdue' || (!isPaid && currentMonth.isOverdue);

  const progressPercent = Math.min(100, Math.round((totalReceived / targetRent) * 100));

  const parsedAmount = Number(amount) || 0;
  const isPartialEntry = parsedAmount > 0 && parsedAmount < remainingBalance;

  const handlePay = async () => {
    const parsed = Number(amount);
    if (amount === '' || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (parsed > remainingBalance) {
      setError(`Amount cannot exceed remaining due (৳${remainingBalance.toLocaleString('en-IN')}).`);
      return;
    }
    if (isPartialEntry && !shortfallReason.trim()) {
      setError('Please provide a reason for partial payment.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/bike-monthly-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'payment',
          bikeId: bike._id,
          amount: parsed,
          wallet,
          note,
          shortfallReason: isPartialEntry ? shortfallReason : '',
          commitmentDate: isPartialEntry && commitmentDate ? commitmentDate : null,
        }),
      });
      const resData = await res.json();
      if (!res.ok || resData.error) {
        setError(resData.error || 'Failed to save payment.');
      } else {
        setAmount('');
        setNote('');
        setShortfallReason('');
        setCommitmentDate('');
        setShowForm(false);
        onPaid();
      }
    } catch {
      setError('Network connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find latest committed date from payments if driver gave a commitment date for partial payment
  const latestCommitmentPayment = payments?.find(p => p.commitmentDate);
  const commitmentDateObj = latestCommitmentPayment?.commitmentDate ? new Date(latestCommitmentPayment.commitmentDate) : null;

  let commitmentDaysLeft = null;
  let extraDaysRequested = null;
  if (commitmentDateObj && !isPaid) {
    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    commitmentDaysLeft = Math.ceil((commitmentDateObj.getTime() - today.getTime()) / msPerDay);

    const deadline = currentMonth.deadlineDate ? new Date(currentMonth.deadlineDate) : null;
    if (deadline) {
      extraDaysRequested = Math.max(0, Math.ceil((commitmentDateObj.getTime() - deadline.getTime()) / msPerDay));
    }
  }

  const monthName = new Date(Date.UTC(currentMonth.year, currentMonth.month - 1, 1))
    .toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="space-y-4">
      {/* Overview Status Card with Rent Progress Bar */}
      <div className="bg-[#FFFDF8] p-5 rounded-3xl border border-[#E3D9C2] shadow-sm space-y-4">
        {/* Header line: Month & Status Badge */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F7A4D] animate-pulse" />
            <span className="text-xs font-black text-[#2B2620] uppercase tracking-wider">{monthName}</span>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-xs ${
            isPaid
              ? 'bg-[#E6F0E5] text-[#1F7A4D] border-[#C5DCC2]'
              : isPartial
                ? 'bg-[#FFF9E6] text-[#B27B00] border-[#FCE8B2]'
                : isOverdue
                  ? 'bg-[#F7E9E5] text-[#B33B2E] border-[#E3C2B8]'
                  : 'bg-[#F7F3EA] text-[#6B5F4F] border-[#E3D9C2]'
          }`}>
            {isPaid ? 'Fully Paid ✓' : isPartial ? 'Partially Paid' : isOverdue ? 'Overdue ⚠️' : 'Pending'}
          </span>
        </div>

        {/* 3 Metric Grid: Monthly Rent | Total Paid | Remaining Due */}
        <div className="grid grid-cols-3 gap-2 bg-[#F7F3EA]/70 p-3 rounded-2xl border border-[#E3D9C2]/60">
          <div>
            <span className="text-[9px] font-extrabold text-[#7D7156] uppercase tracking-wide block">Monthly Rent</span>
            <span className="text-sm font-black text-[#2B2620] mt-0.5 block">৳{targetRent.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-[#1F7A4D] uppercase tracking-wide block">Total Paid</span>
            <span className="text-sm font-black text-[#1F7A4D] mt-0.5 block">৳{totalReceived.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold text-[#B33B2E] uppercase tracking-wide block">Remaining Due</span>
            <span className={`text-sm font-black mt-0.5 block ${remainingBalance > 0 ? 'text-[#B33B2E]' : 'text-[#7D7156]'}`}>
              ৳{remainingBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Progress Bar & Commitment Countdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-extrabold">
            <span className="text-[#6B5F4F]">Collection Progress ({progressPercent}%)</span>
            <span className={isOverdue ? 'text-[#B33B2E]' : 'text-[#7D7156]'}>
              {isPaid ? 'Complete' : isOverdue ? 'Deadline Passed (12th)' : `${currentMonth.daysRemaining} days remaining`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#E3D9C2]/50 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPaid ? 'bg-[#1F7A4D]' : isPartial ? 'bg-[#B27B00]' : 'bg-[#B33B2E]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Committed Day & Additional Days Badge on Progress Bar */}
          {commitmentDateObj && !isPaid && (
            <div className="mt-2 p-2.5 bg-[#FFF9E6] border border-[#FCE8B2] rounded-2xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-[#8A6D00]">
                <span>📅</span>
                <span>Committed: {formatGlobalDate(commitmentDateObj)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {extraDaysRequested > 0 && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#FCE8B2] text-[#6B5124]">
                    +{extraDaysRequested} extra {extraDaysRequested === 1 ? 'day' : 'days'}
                  </span>
                )}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md text-white ${
                  commitmentDaysLeft < 0 ? 'bg-[#B33B2E]' : commitmentDaysLeft <= 2 ? 'bg-[#B27B00]' : 'bg-[#1F7A4D]'
                }`}>
                  {commitmentDaysLeft < 0
                    ? `${Math.abs(commitmentDaysLeft)} days overdue`
                    : commitmentDaysLeft === 0
                      ? 'Due today'
                      : `${commitmentDaysLeft} days left`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Record Payment Toggle / Trigger */}
        {!isPaid && !showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setAmount(String(remainingBalance)); // Default to full remaining due
            }}
            className="w-full py-3 bg-[#2B2620] hover:bg-[#1E1A16] text-white font-extrabold text-xs rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>💳</span>
            <span>{totalReceived > 0 ? 'Record Additional Payment' : 'Record Monthly Collection'}</span>
          </button>
        )}
      </div>

      {/* Record Payment Form Card */}
      {!isPaid && showForm && (
        <div className="bg-[#FFFDF8] p-5 rounded-3xl border-2 border-[#2B2620]/20 shadow-lg space-y-4 animate-fade-scale-in">
          <div className="flex justify-between items-center border-b border-[#E3D9C2] pb-3">
            <div>
              <h4 className="text-sm font-black text-[#2B2620]">Record Rent Collection</h4>
              <p className="text-[10px] text-[#7D7156] font-semibold">Enter amount given by driver</p>
            </div>
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              className="text-xs font-bold text-[#6B5F4F] bg-[#F7F3EA] hover:bg-[#E3D9C2] px-2.5 py-1 rounded-full transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {error && (
            <div className="p-2.5 bg-[#F7E9E5] border border-[#E3C2B8] rounded-xl text-xs font-bold text-[#B33B2E] text-center">
              ⚠️ {error}
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[#6B5F4F] uppercase tracking-wider block">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAmount(String(remainingBalance));
                  setShortfallReason('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between ${
                  parsedAmount === remainingBalance
                    ? 'bg-[#1F7A4D] text-white border-[#1F7A4D]'
                    : 'bg-[#FFFDF8] text-[#2B2620] border-[#E3D9C2] hover:bg-[#F7F3EA]'
                }`}
              >
                <span>Full Due</span>
                <span className="font-black">৳{remainingBalance.toLocaleString('en-IN')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const half = Math.round(remainingBalance / 2);
                  setAmount(String(half));
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between ${
                  parsedAmount > 0 && parsedAmount < remainingBalance
                    ? 'bg-[#B27B00] text-white border-[#B27B00]'
                    : 'bg-[#FFFDF8] text-[#2B2620] border-[#E3D9C2] hover:bg-[#F7F3EA]'
                }`}
              >
                <span>Partial (Half)</span>
                <span className="font-black">৳{Math.round(remainingBalance / 2).toLocaleString('en-IN')}</span>
              </button>
            </div>
          </div>

          {/* Amount & Wallet Selection */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-extrabold text-[#6B5F4F] uppercase tracking-wider block mb-1">
                Amount Received (৳)
              </label>
              <input
                type="number"
                min="1"
                max={remainingBalance}
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 text-base font-black bg-[#F7F3EA] border border-[#E3D9C2] rounded-2xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]"
              />
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#6B5F4F] uppercase tracking-wider block mb-1">
                Wallet
              </label>
              <select
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full p-3 text-xs font-bold bg-[#F7F3EA] border border-[#E3D9C2] rounded-2xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]"
              >
                <option value="Pocket">Pocket</option>
                <option value="Drawer">Drawer</option>
              </select>
            </div>
          </div>

          {/* Partial Payment Section: Reason & Commitment Date */}
          {isPartialEntry && (
            <div className="p-3.5 bg-[#FFF9E6] border border-[#FCE8B2] rounded-2xl space-y-3 animate-slide-up">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#8A6D00]">
                <span>⚠️</span>
                <span>Partial Payment Details (Due Remaining: ৳{(remainingBalance - parsedAmount).toLocaleString('en-IN')})</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
                  Reason Driver Paid Partially <span className="text-[#B33B2E]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Driver requested 5 days extra for family emergency"
                  value={shortfallReason}
                  onChange={(e) => setShortfallReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
                  Commitment Date to Pay Remaining Rest <span className="text-[#7D7156] font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={commitmentDate}
                  onChange={(e) => setCommitmentDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
                />
              </div>
            </div>
          )}

          {/* Optional Note */}
          <div>
            <label className="text-[10px] font-extrabold text-[#6B5F4F] uppercase tracking-wider block mb-1">
              Note / Reference <span className="text-[#7D7156] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Paid in cash at garage"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 text-xs bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={submitting}
              onClick={() => { setShowForm(false); setError(''); }}
              className="py-3 text-xs font-bold bg-[#F7F3EA] text-[#6B5F4F] border border-[#E3D9C2] rounded-2xl hover:bg-[#E3D9C2] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              onClick={handlePay}
              className="py-3 text-xs font-black bg-[#1F7A4D] hover:bg-[#165B39] text-white rounded-2xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Saving Payment...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      )}

      {/* Payment History Log */}
      <div className="bg-[#FFFDF8] rounded-3xl border border-[#E3D9C2] overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-[#F7F3EA] border-b border-[#E3D9C2] flex justify-between items-center">
          <span className="text-[10px] font-black text-[#6B5F4F] uppercase tracking-wider">Payment History</span>
          <span className="text-[10px] font-bold text-[#7D7156]">{payments?.length || 0} entry(ies)</span>
        </div>
        <div className="divide-y divide-[#E3D9C2] max-h-56 overflow-y-auto">
          {!payments || payments.length === 0 ? (
            <p className="text-center text-xs font-semibold text-[#7D7156] py-6">No payment records for this bike yet.</p>
          ) : payments.map((p) => (
            <div key={p._id} className="p-3.5 text-xs space-y-1.5 hover:bg-[#F7F3EA]/40 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1F7A4D]" />
                  <span className="text-[#2B2620] font-bold">{formatGlobalDate(p.date)}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#F0EAD9] text-[#6B5F4F]">
                    {p.wallet || 'Pocket'}
                  </span>
                </div>
                <span className="font-black text-sm text-[#1F7A4D]">+৳{p.amount.toLocaleString('en-IN')}</span>
              </div>
              {p.shortfallReason && (
                <div className="p-2 bg-[#F7E9E5]/60 border border-[#E3C2B8]/40 rounded-xl text-[11px] font-medium text-[#B33B2E]">
                  {p.shortfallReason}
                </div>
              )}
              {p.commitmentDate && (
                <p className="text-[11px] font-bold text-[#2E5C8A] flex items-center gap-1">
                  <span>📅</span> Promised rest by: {formatGlobalDate(p.commitmentDate)}
                </p>
              )}
              {p.note && <p className="text-[10px] text-[#7D7156] italic">&quot;{p.note}&quot;</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Rent History (Past Months) */}
      <div className="bg-[#FFFDF8] rounded-3xl border border-[#E3D9C2] overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-[#F7F3EA] border-b border-[#E3D9C2] flex justify-between items-center">
          <span className="text-[10px] font-black text-[#6B5F4F] uppercase tracking-wider">Past Months Overview</span>
          <span className="text-[10px] font-bold text-[#7D7156]">History</span>
        </div>
        <div className="divide-y divide-[#E3D9C2] max-h-48 overflow-y-auto">
          {!history || history.length === 0 ? (
            <p className="text-center text-xs font-semibold text-[#7D7156] py-6">No historical records.</p>
          ) : history.map((r) => (
            <div key={r._id} className="grid grid-cols-2 px-4 py-3 text-xs items-center hover:bg-[#F7F3EA]/40 transition-colors">
              <span className="text-[#2B2620] font-bold">
                {new Date(Date.UTC(r.year, r.month - 1, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
              </span>
              <span className={`text-right font-black ${
                r.status === 'Paid' ? 'text-[#1F7A4D]' : r.status === 'Partial' ? 'text-[#B27B00]' : 'text-[#B33B2E]'
              }`}>
                {r.status === 'Paid' ? 'Paid ✓' : r.status === 'Partial' ? 'Partial' : r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BikeCollectionForm({ bike, submitting, onSubmit }) {
  const [shift, setShift] = useState('Full Day');
  const [paidRent, setPaidRent] = useState('');
  const [halfDayExpected, setHalfDayExpected] = useState('');
  const [offDayReason, setOffDayReason] = useState('');

  const expectedRent = shift === 'Full Day'
    ? bike.dailyRent
    : shift === 'Half Day' ? Number(halfDayExpected || 0) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (shift === 'Off Day' && !offDayReason) return; // guarded by disabling submit below too
    if (shift === 'Half Day' && halfDayExpected === '') return; // expected amount required
    const finalPaid = shift === 'Off Day' ? 0 : (paidRent === '' ? expectedRent : Number(paidRent));
    onSubmit(shift, finalPaid, shift === 'Off Day' ? offDayReason : undefined, shift === 'Half Day' ? expectedRent : undefined);
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
                if (s !== 'Half Day') setHalfDayExpected('');
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
      ) : shift === 'Half Day' ? (
        <>
          <div>
            <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
              Expected Amount (৳)
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="e.g. 300"
              value={halfDayExpected}
              onChange={(e) => setHalfDayExpected(e.target.value)}
              className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block mb-1">
              Given Amount (৳) <span className="text-[#7D7156] font-normal">(Expected: ৳{expectedRent})</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder={`Leave blank for ৳${expectedRent}`}
              value={paidRent}
              onChange={(e) => setPaidRent(e.target.value)}
              className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620]"
            />
          </div>
        </>
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
        disabled={submitting || (shift === 'Off Day' && !offDayReason) || (shift === 'Half Day' && halfDayExpected === '')}
        className="w-full py-2.5 bg-[#2B2620] text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {submitting ? 'Saving...' : 'Save Collection'}
      </button>
    </form>
  );
}
