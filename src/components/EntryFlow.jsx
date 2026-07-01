'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DoubleCheckModal from './DoubleCheckModal';
import BottomNav, { ActionSheet } from './BottomNav';
import EntrySheet from './EntrySheet';

const ENDPOINTS = {
  rent: { url: '/api/bikes', build: (f) => ({ action: 'collection', ...f }) },
  income: { url: '/api/incomes', build: (f) => f },
  expense: { url: '/api/expenses', build: (f) => f },
  transfer: { url: '/api/loans-transfers', build: (f) => ({ action: 'transfer', ...f }) },
  loan: { url: '/api/loans-transfers', build: (f) => ({ action: 'loan', ...f }) },
};

// Drop-in: renders the bottom nav + FAB + the full create-entry flow
// (action sheet -> form -> Double-Check Guard -> save). Mount once per page.
export default function EntryFlow({ bikes = [], selectedDate, onSaved }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeForm, setActiveForm] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [showDoubleCheck, setShowDoubleCheck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [saveError, setSaveError] = useState('');
  const [sheetInstanceKey, setSheetInstanceKey] = useState(0);
  const [bikeList, setBikeList] = useState(bikes);
  const [walletBalances, setWalletBalances] = useState({});

  // If a page doesn't already have bikes loaded (e.g. Ledger, Loans), fetch
  // them lazily the first time the "Bike Rent" form is actually opened.
  const ensureBikes = useCallback(async () => {
    if (bikeList.length > 0) return;
    try {
      const res = await fetch('/api/bikes');
      const data = await res.json();
      if (res.ok) {
        setBikeList(data.bikes?.map((b) => ({ _id: b._id, name: b.name, driver: b.driverName, dailyRent: b.dailyRent, isShajahanKaka: b.isShajahanKaka })) || []);
      } else {
        setErrorBanner(data.error || 'Could not load your bikes.');
      }
    } catch {
      setErrorBanner('Could not reach the server to load your bikes. Check your connection.');
    }
  }, [bikeList.length]);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (res.ok && data.wallets) setWalletBalances(data.wallets);
    } catch { /* silent */ }
  }, []);

  const handleSelectAction = (key) => {
    setSheetOpen(false);
    if (key === 'rent') ensureBikes();
    if (key === 'transfer') fetchWallets();
    setActiveForm(key);
  };

  const handleReviewSubmit = (type, formData) => {
    setActiveForm(type);
    setPendingData(formData);
    setShowDoubleCheck(true);
  };

  const confirmAndSaveTransaction = async () => {
    if (!activeForm || !pendingData) return;
    setSaving(true);
    setSaveError('');
    const { url, build } = ENDPOINTS[activeForm];

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(build(pendingData)),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSaveError(data.error || 'Something went wrong while saving. Your entry was not saved — please try again.');
      } else {
        setShowDoubleCheck(false);
        setActiveForm(null);
        setPendingData(null);
        setSheetInstanceKey((k) => k + 1);
        onSaved?.();
      }
    } catch {
      setSaveError('Network error — your entry was not saved. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {errorBanner && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-[#F7E9E5] border border-[#E3C2B8] text-[#8C2D22] text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
            {errorBanner}
          </div>
        </div>
      )}

      <DoubleCheckModal
        isOpen={showDoubleCheck}
        onClose={() => { setShowDoubleCheck(false); setSaveError(''); }}
        onConfirm={confirmAndSaveTransaction}
        data={{ type: activeForm, ...pendingData }}
        saving={saving}
        error={saveError}
      />

      <ActionSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectAction}
      />

      <EntrySheet
        key={`${activeForm}-${sheetInstanceKey}`}
        type={activeForm && !showDoubleCheck ? activeForm : null}
        bikes={bikeList}
        walletBalances={walletBalances}
        defaultDate={selectedDate}
        onClose={() => { setActiveForm(null); setSheetInstanceKey((k) => k + 1); }}
        onReviewSubmit={handleReviewSubmit}
      />

      <BottomNav onSelectAction={() => setSheetOpen(true)} />
    </>
  );
}
