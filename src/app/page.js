"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import YesterdayCheckBlock from '@/components/YesterdayCheckBlock';
import SummaryCard from '@/components/SummaryCard';
import WalletRow from '@/components/WalletRow';
import ShajahanKakaCard from '@/components/ShajahanKakaCard';
import FleetCard from '@/components/FleetCard';
import TimelineLog from '@/components/TimelineLog';
import EntryFlow from '@/components/EntryFlow';
import EditBikeModal from '@/components/EditBikeModal';
import BikeDetailsModal from '@/components/BikeDetailsModal';
import BikeDueListModal from '@/components/BikeDueListModal';
import CashLoanListModal from '@/components/CashLoanListModal';
import ShopRentCard from '@/components/shop-rent/ShopRentCard';
import { todayDhakaDateString } from '@/lib/dateUtils';

export default function Dashboard() {
  const router = useRouter();
  const [wallets, setWallets] = useState({ Pocket: 0, Drawer: 0 });
  const [selectedDate, setSelectedDate] = useState(todayDhakaDateString());
  const [summary, setSummary] = useState({ netProfit: 0, totalIncome: 0, totalExpense: 0, totalReceivable: 0, totalPayable: 0, bikeDueTotal: 0, cashLoanReceivable: 0 });
  const [receivableBreakdown, setReceivableBreakdown] = useState({ bikeDues: [], cashLoans: [] });
  const [bikes, setBikes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editingBike, setEditingBike] = useState(null);
  const [viewingBike, setViewingBike] = useState(null);
  const [showBikeDueList, setShowBikeDueList] = useState(false);
  const [showCashLoanList, setShowCashLoanList] = useState(false);

  const [missingYesterday, setMissingYesterday] = useState(false);
  const [missingReason, setMissingReason] = useState('');
  const [isMissingMode, setIsMissingMode] = useState(false);
  const [dismissedMissing, setDismissedMissing] = useState(false);

  const latestRequestRef = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    setLoadError('');
    // Tag this call so that if a newer fetch (e.g. the user switched dates
    // again) finishes first, this older response gets ignored instead of
    // overwriting the screen with the wrong date's numbers.
    const requestId = ++latestRequestRef.current;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      const res = await fetch(`/api/dashboard?date=${selectedDate}`, { signal: controller.signal });
      clearTimeout(timeout);

      const data = await res.json();
      if (requestId !== latestRequestRef.current) return; // superseded by a newer request — discard

      if (res.ok) {
        setWallets(data.wallets || { Pocket: 0, Drawer: 0 });
        setSummary(data.summary || {});
        setReceivableBreakdown(data.receivableBreakdown || { bikeDues: [], cashLoans: [] });
        setBikes(data.bikes || []);
        setActivities(data.activities || []);
        setMissingYesterday(data.missingYesterday || false);
        setMissingReason(data.missingReason || '');
      } else {
        setLoadError(data.error || 'The server returned an error while loading your data.');
      }
    } catch (error) {
      if (requestId !== latestRequestRef.current) return; // superseded — ignore this error too
      if (error.name === 'AbortError') {
        setLoadError('This is taking too long. Your database connection may be slow or unreachable — check your internet connection and try again.');
      } else {
        setLoadError('Could not reach the server. Check your internet connection and try again.');
      }
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#7D7156] font-medium text-sm">
        Loading your ledger…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-semibold text-[#2B2620] max-w-xs">{loadError}</p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2.5 bg-[#2B2620] text-white text-xs font-bold rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <YesterdayCheckBlock
        missingYesterday={missingYesterday && !dismissedMissing}
        missingReason={missingReason}
        onOk={(date) => {
          setDismissedMissing(true);
          setSelectedDate(date);
          setIsMissingMode(true);
        }}
        onSkip={() => {
          setDismissedMissing(true);
        }}
      />

      {isMissingMode && (
        <div className="bg-[#F7E9E5] border-b border-[#E3C2B8] py-3 px-5 sticky top-0 z-30 shadow-sm">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <span className="text-xs font-bold text-[#B33B2E]">
              ⚠️ Missing Entries — {selectedDate}
            </span>
            <button
              onClick={() => {
                setIsMissingMode(false);
                setSelectedDate(todayDhakaDateString());
              }}
              className="px-5 py-1.5 bg-[#1F7A4D] hover:bg-[#155C3A] text-white text-xs font-bold rounded-full shadow transition-all active:scale-95"
            >
              Done ✓
            </button>
          </div>
        </div>
      )}

      <header className={`bg-[#F7F3EA]/95 backdrop-blur-md sticky ${isMissingMode ? 'top-[42px]' : 'top-0'} z-20 px-5 py-5`}>
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#2B2620]">Amar Hishab</h1>
            <p className="text-[11px] text-[#7D7156] font-semibold mt-0.5">আপনার দৈনিক হিসাব</p>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #163524 0%, #0e2318 100%)',
              border: '1px solid rgba(93,232,138,0.25)',
              boxShadow: '0 4px 14px rgba(15,40,25,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            className="rounded-2xl px-3.5 py-2 text-right"
          >
            <p style={{ color: 'rgba(93,232,138,0.6)', letterSpacing: '0.12em' }} className="text-[9px] font-bold uppercase">Drawer</p>
            <p style={{ color: '#ffffff' }} className="text-sm font-black leading-tight mt-0.5">৳{(wallets.Drawer || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-5">
        <SummaryCard 
          summary={summary} 
          pocketBalance={wallets.Pocket || 0}
          selectedDate={selectedDate} 
          onDateChange={(e) => setSelectedDate(e.target.value)} 
        />
        <ShajahanKakaCard
          bike={bikes.find((b) => b.isShajahanKaka)}
          due={receivableBreakdown.bikeDues.find((d) => d.isShajahanKaka)}
          onView={(bike) => setViewingBike(bike)}
          onSaved={fetchDashboardData}
        />
        <ShopRentCard />
        <FleetCard bikes={bikes.filter((b) => !b.isShajahanKaka)} onEditBike={(bike) => setEditingBike(bike)} onViewBike={(bike) => setViewingBike(bike)} />
        <TimelineLog activities={activities} selectedDate={selectedDate} onActivityDeleted={fetchDashboardData} />
      </main>

      <EditBikeModal
        bike={editingBike}
        onClose={() => setEditingBike(null)}
        onSaved={fetchDashboardData}
      />

      <BikeDetailsModal
        bike={viewingBike}
        activeDate={selectedDate}
        onClose={() => {
          setViewingBike(null);
          fetchDashboardData();
        }}
      />

      <BikeDueListModal
        isOpen={showBikeDueList}
        onClose={() => setShowBikeDueList(false)}
        bikeDues={receivableBreakdown.bikeDues}
        onSelectBike={(d) => {
          setShowBikeDueList(false);
          const fullBike = bikes.find((b) => b._id === d.bikeId);
          setViewingBike(fullBike || { _id: d.bikeId, name: d.bikeName, driver: d.driverName });
        }}
      />

      <CashLoanListModal
        isOpen={showCashLoanList}
        onClose={() => setShowCashLoanList(false)}
        cashLoans={receivableBreakdown.cashLoans}
      />

      <EntryFlow
        bikes={bikes.map((b) => ({ _id: b._id, name: b.name, driver: b.driver, dailyRent: b.dailyRent }))}
        selectedDate={selectedDate}
        onSaved={fetchDashboardData}
      />
    </div>
  );
}
