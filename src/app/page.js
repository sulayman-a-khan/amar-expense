"use client";

import { useState, useEffect, useCallback } from 'react';
import YesterdayCheckBlock from '@/components/YesterdayCheckBlock';
import SummaryCard from '@/components/SummaryCard';
import WalletRow from '@/components/WalletRow';
import FleetCard from '@/components/FleetCard';
import TimelineLog from '@/components/TimelineLog';
import EntryFlow from '@/components/EntryFlow';
import EditBikeModal from '@/components/EditBikeModal';

export default function Dashboard() {
  const [wallets, setWallets] = useState({ Business: 0, Pocket: 0, Drawer: 0 });
  const [summary, setSummary] = useState({ netProfit: 0, totalIncome: 0, totalExpense: 0, totalReceivable: 0, totalPayable: 0 });
  const [bikes, setBikes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editingBike, setEditingBike] = useState(null);

  const [missingYesterday, setMissingYesterday] = useState(false);
  const [missingReason, setMissingReason] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoadError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      const res = await fetch('/api/dashboard', { signal: controller.signal });
      clearTimeout(timeout);

      const data = await res.json();
      if (res.ok) {
        setWallets(data.wallets || { Business: 0, Pocket: 0, Drawer: 0 });
        setSummary(data.summary || {});
        setBikes(data.bikes || []);
        setActivities(data.activities || []);
        setMissingYesterday(data.missingYesterday || false);
        setMissingReason(data.missingReason || '');
      } else {
        setLoadError(data.error || 'The server returned an error while loading your data.');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setLoadError('This is taking too long. Your database connection may be slow or unreachable — check your internet connection and try again.');
      } else {
        setLoadError('Could not reach the server. Check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#9CA3AF] font-medium text-sm">
        Loading your ledger…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-semibold text-[#1A1D29] max-w-xs">{loadError}</p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2.5 bg-[#1A1D29] text-white text-xs font-bold rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <YesterdayCheckBlock
        missingYesterday={missingYesterday}
        missingReason={missingReason}
        onEntryComplete={fetchDashboardData}
      />

      <header className="bg-[#F4F5F7]/95 backdrop-blur-md sticky top-0 z-20 px-5 py-5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#1A1D29]">Amar Hishab</h1>
            <p className="text-[11px] text-[#9CA3AF] font-semibold mt-0.5">আপনার দৈনিক হিসাব</p>
          </div>
          <span className="w-9 h-9 bg-white border border-[#E8EAED] rounded-xl flex items-center justify-center text-sm">
            📒
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-5">
        <SummaryCard summary={summary} />
        <WalletRow wallets={wallets} />
        <FleetCard bikes={bikes} onEditBike={(bike) => setEditingBike(bike)} />
        <TimelineLog activities={activities} />
      </main>

      <EditBikeModal
        bike={editingBike}
        onClose={() => setEditingBike(null)}
        onSaved={fetchDashboardData}
      />

      <EntryFlow bikes={bikes.map((b) => ({ _id: b._id, name: b.name, driver: b.driver, dailyRent: b.dailyRent }))} onSaved={fetchDashboardData} />
    </div>
  );
}
