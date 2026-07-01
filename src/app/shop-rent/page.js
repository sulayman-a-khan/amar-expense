"use client";

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import DoubleCheckModal from '@/components/DoubleCheckModal';
import MonthNavigator from '@/components/shop-rent/MonthNavigator';
import RentStatsCard from '@/components/shop-rent/RentStatsCard';
import WithdrawalHistory from '@/components/shop-rent/WithdrawalHistory';
import QuickCollectionForm from '@/components/shop-rent/QuickCollectionForm';
import RentReports from '@/components/shop-rent/RentReports';
import { nowInDhaka } from '@/lib/dateUtils';

export default function ShopRentPage() {
  const now = nowInDhaka();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);

  const [rentSource, setRentSource] = useState(null);
  const [record, setRecord] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showReports, setShowReports] = useState(false);
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
    <div>
      <PageHeader title="Shop Rent Tracker" subtitle="Monthly rent collection and balance" />

      <main className="max-w-md mx-auto px-5 space-y-4">
        <MonthNavigator year={year} month={month} isCurrentMonth={isCurrentMonth} onNavigate={handleNavigate} />

        {loading ? (
          <p className="text-center text-sm text-[#7D7156] py-10">Loading…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#B33B2E]">{loadError}</p>
            <button onClick={() => fetchMonth(year, month)} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <RentStatsCard record={record} />

            {/* Default monthly rent setting */}
            <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-center justify-between">
              {editingRent ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" value={newRentValue} onChange={(e) => setNewRentValue(e.target.value)}
                      placeholder={`${rentSource?.monthlyRent || 8000}`}
                      className="flex-1 p-2.5 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none"
                    />
                    <button onClick={handleSaveRent} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">Save</button>
                    <button onClick={() => { setEditingRent(false); setRentEditError(''); }} className="px-3 py-2 bg-[#F0EADA] text-[#6B5F4F] text-xs font-bold rounded-xl">✕</button>
                  </div>
                  {rentEditError && <p className="text-xs text-[#B33B2E] font-semibold">{rentEditError}</p>}
                  <p className="text-[10px] text-[#7D7156]">This only affects future months — past records are never changed.</p>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] font-bold text-[#7D7156] uppercase tracking-wide block">Default Monthly Rent</span>
                    <span className="text-sm font-extrabold text-[#2B2620]">৳{(rentSource?.monthlyRent || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    onClick={() => { setNewRentValue(String(rentSource?.monthlyRent || '')); setEditingRent(true); }}
                    className="text-[11px] font-bold text-[#2E5C8A] px-3 py-1.5"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>

            <QuickCollectionForm year={year} month={month} isCurrentMonth={isCurrentMonth} onReview={handleReviewCollection} />

            <WithdrawalHistory withdrawals={withdrawals} />

            <button
              onClick={() => setShowReports((v) => !v)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#FFFDF8] border border-[#E3D9C2] text-[#2B2620]"
            >
              {showReports ? 'Hide Reports ▲' : 'View Reports ▼'}
            </button>

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
