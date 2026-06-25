'use client';

import { useState, useEffect } from 'react';
import { formatGlobalDate } from '@/lib/dateUtils';

export default function BikeDetailsModal({ bike, onClose }) {
  const [period, setPeriod] = useState('month'); // 'week', 'month', 'year', 'all'
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bike) return;
    
    let isMounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/bikes/${bike._id}/stats?period=${period}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setStats(data.stats);
          setHistory(data.history);
        }
      } catch (e) {
        console.error('Failed to fetch bike stats', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchStats();
    
    return () => { isMounted = false; };
  }, [bike, period]);

  if (!bike) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-[#E8EAED] shrink-0 flex justify-between items-center relative z-10">
          <div>
            <h2 className="text-xl font-black text-[#1A1D29]">Bike {bike.name}</h2>
            <p className="text-sm font-bold text-[#6B7280]">{bike.driver}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F4F5F7] hover:bg-[#E8EAED] text-[#6B7280] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Stats Selector */}
          <div className="flex gap-2 p-1 bg-[#E8EAED] rounded-xl overflow-x-auto hide-scrollbar shrink-0">
            {['week', 'month', 'year', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold capitalize transition-all ${
                  period === p ? 'bg-white text-[#1A1D29] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1D29]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm font-bold text-[#9CA3AF] animate-pulse">Loading data...</div>
          ) : stats ? (
            <>
              {/* Top Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-[#E8EAED] shadow-sm">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Total Earning</span>
                  <span className="text-lg font-black text-[#16A34A] block mt-1">৳{stats.totalEarning.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#E8EAED] shadow-sm">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Total Expense</span>
                  <span className="text-lg font-black text-[#DC2626] block mt-1">৳{stats.totalExpense.toLocaleString('en-IN')}</span>
                </div>
                <div className="col-span-2 bg-white p-4 rounded-2xl border border-[#E8EAED] shadow-sm flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Off Days ({period})</span>
                  <span className="text-xl font-black text-[#1A1D29]">{stats.offDaysCount}</span>
                </div>
              </div>

              {/* Due History */}
              {history.dueHistory?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Due / Loan History</h3>
                  <div className="bg-white rounded-2xl border border-[#E8EAED] divide-y divide-[#E8EAED] overflow-hidden">
                    {history.dueHistory.map(loan => (
                      <div key={loan._id} className="p-3.5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-[#9CA3AF]">{formatGlobalDate(loan.date)}</p>
                          <p className="text-sm font-bold text-[#1A1D29] mt-0.5">{loan.type} Loan</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${loan.resolved ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {loan.resolved ? 'Paid' : `Due ৳${loan.amount}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rent History */}
              {history.collections?.length > 0 && (
                <div className="space-y-3 pb-6">
                  <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Rent History</h3>
                  <div className="bg-white rounded-2xl border border-[#E8EAED] divide-y divide-[#E8EAED] overflow-hidden">
                    {history.collections.map(col => (
                      <div key={col._id} className="p-3.5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-[#9CA3AF]">{formatGlobalDate(col.date)}</p>
                          <p className="text-sm font-bold text-[#1A1D29] mt-0.5">{col.shift}</p>
                          {col.shift === 'Off Day' && col.offDayReason && (
                            <p className="text-[10px] font-bold text-[#DC2626]">{col.offDayReason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#16A34A]">৳{col.paidRent}</p>
                          {col.expectedRent > col.paidRent && (
                            <p className="text-[10px] font-bold text-[#DC2626]">Short: ৳{col.expectedRent - col.paidRent}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center text-sm font-bold text-[#9CA3AF]">Failed to load data</div>
          )}
        </div>
      </div>
    </div>
  );
}
