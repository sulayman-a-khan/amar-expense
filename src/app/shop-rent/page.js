"use client";

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import DoubleCheckModal from '@/components/DoubleCheckModal';
import MonthNavigator from '@/components/shop-rent/MonthNavigator';
import RentStatsCard from '@/components/shop-rent/RentStatsCard';
import WithdrawalHistory from '@/components/shop-rent/WithdrawalHistory';
import QuickCollectionForm from '@/components/shop-rent/QuickCollectionForm';
import RentReports from '@/components/shop-rent/RentReports';
import { nowInDhaka, getRentCycleLabel } from '@/lib/dateUtils';

export default function ShopRentPage() {
  const initialCycle = getRentCycleLabel(nowInDhaka());
  const [year, setYear] = useState(initialCycle.year);
  const [month, setMonth] = useState(initialCycle.month);

  const [rentSource, setRentSource] = useState(null);
  const [record, setRecord] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showReports, setShowReports] = useState(false);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [editingRent, setEditingRent] = useState(false);
  const [newRentValue, setNewRentValue] = useState('');
  const [rentEditError, setRentEditError] = useState('');

  const [pendingCollection, setPendingCollection] = useState(null);
  const [showDoubleCheck, setShowDoubleCheck] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMonth = useCallback((y, m) => {
    setLoading(true);
    setLoadError('');
    fetch(`/api/shop-rent?year=${y}&month=${m}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setRentSource(data.rentSource);
          setRecord(data.record);
          setWithdrawals(data.withdrawals || []);
          setIsCurrentMonth(data.isCurrentMonth);
        } else {
          setLoadError(data.error || 'Failed to load Shop Rent data.');
        }
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

  const handleNavigate = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  const handleReviewCollection = (formData) => {
    setPendingCollection(formData);
    setSaveError('');
    setShowDoubleCheck(true);
  };

  const confirmCollection = async () => {
    if (!pendingCollection) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/shop-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdrawal', year, month, ...pendingCollection }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSaveError(data.error || 'Failed to save the collection.');
      } else {
        setShowDoubleCheck(false);
        setPendingCollection(null);
        fetchMonth(year, month);
      }
    } catch {
      setSaveError('Network error — your collection was not saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRent = async () => {
    setRentEditError('');
    const parsed = Number(newRentValue);
    if (!newRentValue || Number.isNaN(parsed) || parsed <= 0) {
      setRentEditError('Enter a valid positive amount.');
      return;
    }
    try {
      const res = await fetch('/api/shop-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateRent', monthlyRent: parsed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setRentEditError(data.error || 'Failed to update rent.');
      } else {
        setRentSource(data.rentSource);
        setEditingRent(false);
      }
    } catch {
      setRentEditError('Network error — please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <PageHeader title="Shop Rent Tracker" subtitle="Monthly rent collection and balance" darkTheme={true} />

      <main className="max-w-md mx-auto px-5 space-y-6">
        <MonthNavigator year={year} month={month} isCurrentMonth={isCurrentMonth} onNavigate={handleNavigate} />

        {loading ? (
          <p className="text-center text-sm text-white/40 py-10">Loading…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#FF8E8E]">{loadError}</p>
            <button onClick={() => fetchMonth(year, month)} className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 hover:bg-white/15 transition-colors">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <RentStatsCard 
              record={record} 
              rentSource={rentSource}
              onEditRent={() => { setNewRentValue(String(rentSource?.monthlyRent || '')); setEditingRent(true); }}
            />

            {editingRent && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
                className="rounded-[20px] p-4 flex-1 space-y-2 shadow-lg"
              >
                <div className="flex gap-2">
                  <input
                    type="number" min="0" value={newRentValue} onChange={(e) => setNewRentValue(e.target.value)}
                    placeholder={`${rentSource?.monthlyRent || 8000}`}
                    className="flex-1 p-2.5 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#5DE88A]/40 text-white placeholder:text-white/20"
                  />
                  <button onClick={handleSaveRent} className="px-4 py-2 bg-[#5DE88A] text-[#0F172A] text-xs font-bold rounded-xl hover:opacity-90 transition-opacity">Save</button>
                  <button onClick={() => { setEditingRent(false); setRentEditError(''); }} className="px-3 py-2 bg-white/10 text-white/60 text-xs font-bold rounded-xl hover:bg-white/15 transition-colors">✕</button>
                </div>
                {rentEditError && <p className="text-xs text-[#FF8E8E] font-semibold">{rentEditError}</p>}
                <p className="text-[10px] text-white/30">This only affects future months — past records are never changed.</p>
              </div>
            )}

            {showCollectionForm ? (
              <div className="space-y-3">
                <QuickCollectionForm year={year} month={month} isCurrentMonth={isCurrentMonth} onReview={(data) => { handleReviewCollection(data); setShowCollectionForm(false); }} />
                <button
                  type="button"
                  onClick={() => setShowCollectionForm(false)}
                  className="w-full text-center text-[12px] font-semibold text-white/40 hover:text-white/60 transition-colors py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCollectionForm(true)}
                className="w-full py-3.5 rounded-[16px] text-sm font-bold text-white/50 border border-dashed border-white/15 hover:border-white/30 hover:text-white/70 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Add Collection
              </button>
            )}

            <WithdrawalHistory withdrawals={withdrawals} />

            <div className="text-center pt-2">
              <button
                onClick={() => setShowReports((v) => !v)}
                className="text-[12px] font-semibold text-[#7CB9FF] hover:text-[#7CB9FF]/70 transition-colors"
              >
                {showReports ? 'Hide Reports ▲' : 'View Reports ▼'}
              </button>
            </div>

            {showReports && <RentReports year={year} />}
          </>
        )}
      </main>

      <DoubleCheckModal
        isOpen={showDoubleCheck}
        onClose={() => { setShowDoubleCheck(false); setSaveError(''); }}
        onConfirm={confirmCollection}
        data={pendingCollection ? { type: 'Shop Rent Collection', ...pendingCollection } : {}}
        saving={saving}
        error={saveError}
      />

      <div className="h-10" />
    </div>
  );
}
