'use client';

import React, { useState, useEffect, useRef } from 'react';
import { yesterdayDhakaDateString } from '@/lib/dateUtils';

export default function YesterdayCheckBlock({ missingYesterday, missingReason, onEntryComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [bikes, setBikes] = useState([]);
  const [selectedBike, setSelectedBike] = useState('');
  const [shift, setShift] = useState('Full Day');
  const [paidRent, setPaidRent] = useState('');
  const [offDayReason, setOffDayReason] = useState('Driver Unavailable');
  const [closingCash, setClosingCash] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Track which bikes have been submitted in this session (so we can show
  // them as done even before the API re-check comes back).
  const [submittedBikeIds, setSubmittedBikeIds] = useState(new Set());
  
  // Track whether closing was submitted this session
  const [closingSubmitted, setClosingSubmitted] = useState(false);

  // Lock target date to yesterday (in Dhaka time, not the browser's local timezone)
  const formattedYesterday = yesterdayDhakaDateString();

  // Auto-clear success messages after 3 seconds
  const successTimer = useRef(null);
  useEffect(() => {
    if (successMsg) {
      successTimer.current = setTimeout(() => setSuccessMsg(''), 3000);
    }
    return () => clearTimeout(successTimer.current);
  }, [successMsg]);

  useEffect(() => {
    if (missingYesterday && !dismissed) {
      setIsOpen(true);
      fetchBikes();
    } else {
      setIsOpen(false);
    }
  }, [missingYesterday, dismissed]);

  const fetchBikes = async () => {
    try {
      const res = await fetch('/api/bikes');
      const data = await res.json();
      if (data.bikes) {
        setBikes(data.bikes);
        if (data.bikes.length > 0) setSelectedBike(data.bikes[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Parse the missingReason to figure out which bikes are still needed
  const needsClosing = missingReason?.includes('closing') && !closingSubmitted;
  
  // Bikes that haven't been submitted yet (either per API or this session)
  const pendingBikes = bikes.filter(
    (b) => !submittedBikeIds.has(b._id)
  );

  // Check if the reason mentions a specific bike as missing
  const isBikeMissing = (bikeName) => {
    if (!missingReason) return true; // if no reason, assume all need entry
    return missingReason.includes(bikeName);
  };

  const actualPendingBikes = pendingBikes.filter((b) => isBikeMissing(b.name));

  const handleBikeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const activeBike = bikes.find(b => b._id === selectedBike);
      let expected = activeBike ? activeBike.dailyRent : 0;
      if (shift === 'Half Day') expected *= 0.5;
      if (shift === 'Off Day') expected = 0;

      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collection',
          bikeId: selectedBike,
          date: formattedYesterday,
          shift,
          paidRent: shift === 'Off Day' ? 0 : (paidRent || expected),
          offDayReason: shift === 'Off Day' ? offDayReason : 'N/A'
        })
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        const bikeName = activeBike?.name || 'Bike';
        setSuccessMsg(`✅ ${bikeName} entry saved!`);
        setSubmittedBikeIds(prev => new Set([...prev, selectedBike]));
        setPaidRent('');
        setShift('Full Day');
        
        // Move to the next pending bike
        const remaining = actualPendingBikes.filter(b => b._id !== selectedBike);
        if (remaining.length > 0) {
          setSelectedBike(remaining[0]._id);
        }
        
        // If no more bikes and closing is done, refresh dashboard
        if (remaining.length === 0 && !needsClosing) {
          onEntryComplete();
        }
      }
    } catch (err) {
      setErrorMsg('Failed to save yesterday entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dailyClosing',
          date: formattedYesterday,
          closingCash,
          note
        })
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setSuccessMsg('✅ Daily closing saved!');
        setClosingCash('');
        setNote('');
        setClosingSubmitted(true);
        
        // If all bikes are also done, refresh dashboard
        if (actualPendingBikes.length === 0) {
          onEntryComplete();
        }
      }
    } catch (err) {
      setErrorMsg('Failed to save yesterday closing.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setDismissed(true);
    setIsOpen(false);
    onEntryComplete();
  };

  if (!isOpen) return null;

  // Count completed vs total
  const totalBikes = bikes.filter(b => isBikeMissing(b.name)).length;
  const completedBikes = submittedBikeIds.size;
  const allBikesDone = actualPendingBikes.length === 0;
  const allDone = allBikesDone && !needsClosing;

  // If everything is done after submitting in this session, auto-close
  if (allDone && (submittedBikeIds.size > 0 || closingSubmitted)) {
    // Give a brief delay so the user sees the success message
    setTimeout(() => {
      setIsOpen(false);
      onEntryComplete();
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2620]/90 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden bg-[#FFFDF8] rounded-3xl shadow-2xl border border-[#E3C2B8]">
        
        {/* Header Alert */}
        <div className="p-6 text-center bg-[#F7E9E5] border-b border-[#E3C2B8]">
          <span className="inline-block px-3 py-1 text-xs font-bold text-[#B33B2E] bg-[#E3C2B8] rounded-full uppercase tracking-widest animate-pulse">
            Missing Entry Alert
          </span>
          <h2 className="mt-3 text-xl font-black text-[#2B2620]">
            Yesterday&apos;s Records Incomplete!
          </h2>
          <p className="mt-1 text-sm text-[#6B5F4F]">
            {missingReason || 'Please record yesterday\'s entries to unlock the dashboard.'}
          </p>
          <div className="mt-2 inline-flex text-xs font-semibold text-[#7D7156] bg-[#F0EADA] px-3 py-1 rounded-lg">
            Locked Date: {formattedYesterday}
          </div>
        </div>

        {/* Message Panel */}
        {(errorMsg || successMsg) && (
          <div className="p-4 text-center text-sm font-semibold">
            {errorMsg && <div className="text-[#B33B2E]">{errorMsg}</div>}
            {successMsg && <div className="text-[#1F7A4D]">{successMsg}</div>}
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* Section 1: Yesterday's Bike Entry */}
          {actualPendingBikes.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#E3D9C2]">
              <h3 className="font-bold text-[#3D362B] mb-3 text-sm flex items-center gap-1.5">
                🚲 Step 1: Yesterday&apos;s Bike Shift Rent
                {totalBikes > 1 && (
                  <span className="ml-auto text-xs font-semibold text-[#2E5C8A] bg-[#E7EEF4] px-2 py-0.5 rounded-lg">
                    {completedBikes}/{totalBikes} done
                  </span>
                )}
              </h3>
              <form onSubmit={handleBikeSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#7D7156] mb-1">Select Vehicle/Driver</label>
                  <select
                    value={selectedBike}
                    onChange={(e) => setSelectedBike(e.target.value)}
                    className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl"
                  >
                    {actualPendingBikes.map(b => (
                      <option key={b._id} value={b._id}>{b.name} - {b.driverName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-[#F0EADA] p-1 rounded-xl">
                  {['Full Day', 'Half Day', 'Off Day'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                        shift === s
                          ? 'bg-[#2E5C8A] text-white shadow-sm'
                          : 'text-[#6B5F4F] hover:bg-[#E3D9C2]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {shift === 'Off Day' ? (
                  <div>
                    <label className="block text-xs font-medium text-[#7D7156] mb-1">Reason for Off-Day</label>
                    <select
                      value={offDayReason}
                      onChange={(e) => setOffDayReason(e.target.value)}
                      className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl"
                    >
                      <option value="Driver Unavailable">Driver Unavailable</option>
                      <option value="Mechanical Issue">Mechanical Issue</option>
                      <option value="Police/Others">Police/Others</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#7D7156] mb-1">Rent Paid (৳)</label>
                    <input
                      type="number"
                      placeholder="Leave blank for expected rent"
                      value={paidRent}
                      onChange={(e) => setPaidRent(e.target.value)}
                      className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-bold text-white bg-[#2B2620] hover:bg-[#3D362B] rounded-xl transition-colors"
                >
                  {loading ? 'Saving...' : `Submit Bike Entry (${actualPendingBikes.find(b => b._id === selectedBike)?.name || ''})`}
                </button>
              </form>
            </div>
          )}

          {/* Bikes completed indicator */}
          {allBikesDone && totalBikes > 0 && (
            <div className="p-4 rounded-2xl bg-[#E6F0E5] border border-[#C5DCC2] text-center">
              <p className="text-sm font-bold text-[#155C3A]">✅ All bike entries recorded!</p>
            </div>
          )}

          {/* Section 2: Yesterday's Cash Closing */}
          {needsClosing && (
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#E3D9C2]">
              <h3 className="font-bold text-[#3D362B] mb-3 text-sm flex items-center gap-1.5">
                💵 Step 2: Yesterday&apos;s Closing Cash
              </h3>
              <form onSubmit={handleClosingSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#7D7156] mb-1">Actual Cash in Hand / Drawer (৳)</label>
                  <input
                    type="number"
                    required
                    placeholder="Counted cash balance"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#7D7156] mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. verified ok"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2.5 text-sm bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-bold text-white bg-[#2E5C8A] hover:bg-[#234A6E] rounded-xl transition-all"
                >
                  {loading ? 'Saving...' : 'Lock Daily Closing'}
                </button>
              </form>
            </div>
          )}

          {/* Closing completed indicator */}
          {closingSubmitted && (
            <div className="p-4 rounded-2xl bg-[#E6F0E5] border border-[#C5DCC2] text-center">
              <p className="text-sm font-bold text-[#155C3A]">✅ Daily closing recorded!</p>
            </div>
          )}

        </div>

        {/* Skip button */}
        <div className="px-6 pb-5 pt-2 border-t border-[#E3D9C2]">
          <button
            onClick={handleSkip}
            className="w-full py-2.5 text-xs font-semibold text-[#7D7156] hover:text-[#3D362B] transition-colors"
          >
            Skip for Now →
          </button>
        </div>

      </div>
    </div>
  );
}
