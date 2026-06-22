'use client';

import React, { useState, useEffect } from 'react';

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

  // Lock target date to yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedYesterday = yesterday.toISOString().split('T')[0];

  useEffect(() => {
    if (missingYesterday) {
      setIsOpen(true);
      fetchBikes();
    } else {
      setIsOpen(false);
    }
  }, [missingYesterday]);

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
        setSuccessMsg('Yesterday Bike Entry logged successfully!');
        setPaidRent('');
        onEntryComplete();
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
        setSuccessMsg('Yesterday Daily Closing logged successfully!');
        setClosingCash('');
        setNote('');
        onEntryComplete();
      }
    } catch (err) {
      setErrorMsg('Failed to save yesterday closing.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl dark:bg-zinc-900 border border-red-200 dark:border-red-950/50">
        
        {/* Header Alert */}
        <div className="p-6 text-center bg-red-50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-950/30">
          <span className="inline-block px-3 py-1 text-xs font-bold text-red-600 bg-red-100 rounded-full dark:bg-red-950 dark:text-red-400 uppercase tracking-widest animate-pulse">
            Missing Entry Alert
          </span>
          <h2 className="mt-3 text-xl font-black text-zinc-900 dark:text-zinc-50">
            Yesterday's Records Incomplete!
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {missingReason || 'Please record yesterday\'s entries to unlock the dashboard.'}
          </p>
          <div className="mt-2 inline-flex text-xs font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-3 py-1 rounded-lg">
            Locked Date: {formattedYesterday}
          </div>
        </div>

        {/* Message Panel */}
        {(errorMsg || successMsg) && (
          <div className="p-4 text-center text-sm font-semibold">
            {errorMsg && <div className="text-red-600 dark:text-red-400">{errorMsg}</div>}
            {successMsg && <div className="text-green-600 dark:text-green-400">{successMsg}</div>}
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* Section 1: Yesterday's Bike Entry */}
          {bikes.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3 text-sm flex items-center gap-1.5">
                🚲 Step 1: Yesterday's Bike Shift Rent
              </h3>
              <form onSubmit={handleBikeSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Select Vehicle/Driver</label>
                  <select
                    value={selectedBike}
                    onChange={(e) => setSelectedBike(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                  >
                    {bikes.map(b => (
                      <option key={b._id} value={b._id}>{b.name} - {b.driverName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                  {['Full Day', 'Half Day', 'Off Day'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                        shift === s
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {shift === 'Off Day' ? (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Reason for Off-Day</label>
                    <select
                      value={offDayReason}
                      onChange={(e) => setOffDayReason(e.target.value)}
                      className="w-full p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    >
                      <option value="Driver Unavailable">Driver Unavailable</option>
                      <option value="Mechanical Issue">Mechanical Issue</option>
                      <option value="Police/Others">Police/Others</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Rent Paid (৳)</label>
                    <input
                      type="number"
                      placeholder="Leave blank for expected rent"
                      value={paidRent}
                      onChange={(e) => setPaidRent(e.target.value)}
                      className="w-full p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl transition-colors"
                >
                  {loading ? 'Saving...' : 'Submit Bike Entry'}
                </button>
              </form>
            </div>
          )}

          {/* Section 2: Yesterday's Cash Closing */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3 text-sm flex items-center gap-1.5">
              💵 Step 2: Yesterday's Closing Cash
            </h3>
            <form onSubmit={handleClosingSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Actual Cash in Hand / Drawer (৳)</label>
                <input
                  type="number"
                  required
                  placeholder="Counted cash balance"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. verified ok"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
              >
                {loading ? 'Saving...' : 'Lock Daily Closing'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
