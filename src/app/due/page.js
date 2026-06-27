"use client";

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import EntryFlow from '@/components/EntryFlow';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function DriverDuePage() {
  const [dues, setDues] = useState([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedBike, setSelectedBike] = useState(null); // { bikeId, driverName, bikeName }
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchDues = useCallback(() => {
    setLoadError('');
    fetch('/api/driver-dues')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setDues(data.dues || []);
          setTotalDue(data.totalDue || 0);
        } else {
          setLoadError(data.error || 'Failed to load driver dues.');
        }
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  const openHistory = (due) => {
    setSelectedBike(due);
    setHistory([]);
    setHistoryError('');
    setHistoryLoading(true);
    fetch(`/api/driver-dues?bikeId=${due.bikeId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setHistory(data.entries || []);
        else setHistoryError(data.error || 'Failed to load history.');
      })
      .catch(() => setHistoryError('Could not reach the server.'))
      .finally(() => setHistoryLoading(false));
  };

  return (
    <div>
      <PageHeader title="Driver Due" subtitle="Rent shortfalls owed by drivers" />

      <main className="max-w-md mx-auto px-5 space-y-4">
        <section className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-[24px] p-5 shadow-sm">
          <span className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">
            Total Outstanding Due
          </span>
          <h2 className="text-[32px] font-black mt-1 text-[#2E5C8A] tracking-tight leading-none">
            ৳{totalDue.toLocaleString('en-IN')}
          </h2>
        </section>

        {loading ? (
          <p className="text-center text-sm text-[#7D7156] py-10">Loading…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#B33B2E]">{loadError}</p>
            <button onClick={fetchDues} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : dues.length === 0 ? (
          <p className="text-center text-sm text-[#7D7156] py-10">No driver has any due right now. 🎉</p>
        ) : (
          <div className="space-y-2.5">
            {dues.map((d) => (
              <button
                key={d.bikeId}
                onClick={() => openHistory(d)}
                className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-center justify-between shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div>
                  <p className="font-bold text-sm text-[#2B2620]">{d.driverName}</p>
                  <p className="text-[11px] text-[#7D7156] mt-0.5">Bike {d.bikeName} · ৳{d.dailyRent}/day</p>
                </div>
                <span className="font-extrabold text-base text-[#2E5C8A]">৳{d.balance.toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
        )}
      </main>

      {selectedBike && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => setSelectedBike(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#FFFDF8] rounded-t-[28px] p-6 pb-8 shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-[#E3D9C2] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#2B2620]">{selectedBike.driverName}</h3>
                <p className="text-[11px] text-[#7D7156]">Bike {selectedBike.bikeName} — Due history</p>
              </div>
              <button onClick={() => setSelectedBike(null)} className="text-xs font-bold text-[#B33B2E] px-2 py-1">
                Close
              </button>
            </div>

            {historyLoading ? (
              <p className="text-center text-sm text-[#7D7156] py-8">Loading history…</p>
            ) : historyError ? (
              <p className="text-center text-sm text-[#B33B2E] py-8">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-center text-sm text-[#7D7156] py-8">No due history yet for this bike.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h._id} className="flex justify-between items-start gap-3 border-b border-dashed border-[#E3D9C2] pb-3 last:border-none">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.type === 'shortfall' ? 'bg-[#F7E9E5] text-[#B33B2E]' : 'bg-[#E6F0E5] text-[#1F7A4D]'
                      }`}>
                        {h.type === 'shortfall' ? 'Added to due' : 'Cleared'}
                      </span>
                      <p className="text-[11px] text-[#6B5F4F] mt-1 max-w-[220px]">{h.note}</p>
                      <p className="text-[10px] text-[#7D7156] mt-0.5">{formatGlobalDate(h.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold text-sm block ${h.type === 'shortfall' ? 'text-[#B33B2E]' : 'text-[#1F7A4D]'}`}>
                        {h.type === 'shortfall' ? '+' : '−'}৳{h.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-[#7D7156] mt-0.5 block">Bal: ৳{h.balanceAfter.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-24" />
      <EntryFlow onSaved={fetchDues} />
    </div>
  );
}
