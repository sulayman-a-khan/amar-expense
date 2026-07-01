"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import DoubleCheckModal from '@/components/DoubleCheckModal';
import EntryFlow from '@/components/EntryFlow';
import BikeDetailsModal from '@/components/BikeDetailsModal';
import BikeDueListModal from '@/components/BikeDueListModal';
import CashLoanListModal from '@/components/CashLoanListModal';

const WALLETS = ['Pocket', 'Drawer'];

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Unresolved');
  const [resolving, setResolving] = useState(null); // loan object pending resolve
  const [resolveWallet, setResolveWallet] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [summary, setSummary] = useState(null);
  const [receivableBreakdown, setReceivableBreakdown] = useState({ bikeDues: [], cashLoans: [] });
  const [receivableExpanded, setReceivableExpanded] = useState(false);
  const [showBikeDueList, setShowBikeDueList] = useState(false);
  const [showCashLoanList, setShowCashLoanList] = useState(false);
  const [viewingBike, setViewingBike] = useState(null);

  const fetchLoans = useCallback(() => {
    setLoadError('');
    fetch('/api/loans-transfers')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setLoans(data.loans || []);
          setSummary(data.summary || null);
          setReceivableBreakdown(data.receivableBreakdown || { bikeDues: [], cashLoans: [] });
        } else {
          setLoadError(data.error || 'Failed to load loans.');
        }
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const filtered = useMemo(() => {
    if (filter === 'All') return loans;
    if (filter === 'Unresolved') return loans.filter((l) => !l.resolved);
    return loans.filter((l) => l.resolved);
  }, [loans, filter]);

  const openResolve = (loan) => {
    setResolving(loan);
    setResolveWallet('');
    setErrorMsg('');
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmResolve = async () => {
    setErrorMsg('');
    setIsResolving(true);
    try {
      const res = await fetch('/api/loans-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolveLoan', loanId: resolving._id, wallet: resolveWallet }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to resolve loan.');
      } else {
        setShowConfirm(false);
        setResolving(null);
        fetchLoans();
      }
    } catch {
      setErrorMsg('Network error — please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Loans & Liabilities" subtitle="Money given out, and money owed" />

      {summary && (
        <div className="max-w-md mx-auto px-5 mb-5">
          <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-[24px] p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReceivableExpanded((v) => !v)}
                className="text-left bg-[#E7EEF4] rounded-xl p-3 border border-[#C2D3E0]"
              >
                <span className="text-[#2E5C8A] text-[10px] font-bold uppercase tracking-wide block">
                  Owed to you {receivableExpanded ? '▲' : '▼'}
                </span>
                <span className="font-extrabold text-lg text-[#234A6E] mt-0.5 block">৳{summary.totalReceivable.toLocaleString('en-IN')}</span>
              </button>
              <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl p-3">
                <span className="text-[#6B5F4F] text-[10px] font-bold uppercase tracking-wide block">You owe</span>
                <span className="font-extrabold text-lg text-[#2B2620] mt-0.5 block">৳{summary.totalPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {receivableExpanded && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E3D9C2]">
                <button
                  onClick={() => setShowBikeDueList(true)}
                  className="bg-[#FFFDF8] border border-[#C2D3E0] rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">জমা বাকি</span>
                  <span className="font-extrabold text-base text-[#2E5C8A] mt-0.5 block">৳{summary.bikeDueTotal.toLocaleString('en-IN')}</span>
                </button>
                <button
                  onClick={() => setShowCashLoanList(true)}
                  className="bg-[#FFFDF8] border border-[#C2D3E0] rounded-2xl p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <span className="text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide block">নগদ ধার</span>
                  <span className="font-extrabold text-base text-[#2E5C8A] mt-0.5 block">৳{summary.cashLoanReceivable.toLocaleString('en-IN')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5 mb-4">
        <div className="flex gap-2">
          {['Unresolved', 'Resolved', 'All'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
                filter === f ? 'bg-[#2B2620] text-white' : 'bg-[#FFFDF8] border border-[#E3D9C2] text-[#6B5F4F]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 space-y-2.5">
        {loading ? (
          <p className="text-center text-sm text-[#7D7156] py-10">Loading…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#B33B2E]">{loadError}</p>
            <button onClick={fetchLoans} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-[#7D7156] py-10">No {filter.toLowerCase()} loans.</p>
        ) : (
          filtered.map((l) => (
            <div key={l._id} className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7EEF4] text-[#2E5C8A] mb-1">
                    {l.type === 'Receivable' ? 'Owed to you' : 'You owe'}
                  </span>
                  <p className="font-bold text-sm text-[#2B2620]">{l.person}</p>
                  {l.note && <p className="text-[11px] text-[#6B5F4F] mt-0.5 max-w-[200px]">{l.note}</p>}
                  <p className="text-[10px] text-[#7D7156] mt-1">{new Date(l.date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-base text-[#2E5C8A] block">৳{l.amount.toLocaleString('en-IN')}</span>
                  {l.resolved ? (
                    <span className="text-[10px] font-bold text-[#1F7A4D] mt-1 block">Resolved ✓</span>
                  ) : (
                    <button
                      onClick={() => openResolve(l)}
                      className="text-[11px] font-bold text-white bg-[#2B2620] rounded-lg px-3 py-1.5 mt-1.5"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {resolving && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
          <form onSubmit={handleResolveSubmit} className="w-full max-w-md bg-[#FFFDF8] rounded-t-[28px] p-6 pb-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center border-b border-[#E3D9C2] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#2B2620]">Resolve Loan</h3>
              <button type="button" onClick={() => setResolving(null)} className="text-xs font-bold text-[#B33B2E] px-2 py-1">
                Cancel
              </button>
            </div>
            <p className="text-sm text-[#3D362B] mb-4">
              {resolving.type === 'Receivable'
                ? `${resolving.person} is paying back ৳${resolving.amount.toLocaleString('en-IN')}.`
                : `You're paying back ৳${resolving.amount.toLocaleString('en-IN')} to ${resolving.person}.`}
            </p>
            <label className="block text-[11px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1.5">
              {resolving.type === 'Receivable' ? 'Receive Into Wallet' : 'Pay Out From Wallet'}
            </label>
            <select
              required value={resolveWallet} onChange={(e) => setResolveWallet(e.target.value)}
              className="w-full p-3 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none mb-4"
            >
              <option value="">Choose wallet</option>
              {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            {errorMsg && <p className="text-xs text-[#B33B2E] font-semibold mb-3">{errorMsg}</p>}
            <button type="submit" className="w-full py-3.5 bg-[#2B2620] text-white font-bold text-sm rounded-2xl">
              Review & Resolve
            </button>
          </form>
        </div>
      )}

      <DoubleCheckModal
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setErrorMsg(''); }}
        onConfirm={confirmResolve}
        data={resolving ? { person: resolving.person, type: resolving.type, amount: resolving.amount, wallet: resolveWallet } : {}}
        saving={isResolving}
        error={errorMsg}
      />

      <BikeDetailsModal
        bike={viewingBike}
        onClose={() => {
          setViewingBike(null);
          fetchLoans();
        }}
      />

      <BikeDueListModal
        isOpen={showBikeDueList}
        onClose={() => setShowBikeDueList(false)}
        bikeDues={receivableBreakdown.bikeDues}
        onSelectBike={(d) => {
          setShowBikeDueList(false);
          setViewingBike({ _id: d.bikeId, name: d.bikeName, driver: d.driverName, isShajahanKaka: d.isShajahanKaka });
        }}
      />

      <CashLoanListModal
        isOpen={showCashLoanList}
        onClose={() => setShowCashLoanList(false)}
        cashLoans={receivableBreakdown.cashLoans}
      />

      <div className="h-24" />
      <EntryFlow onSaved={fetchLoans} />
    </div>
  );
}
