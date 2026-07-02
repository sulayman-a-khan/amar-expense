"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import DoubleCheckModal from '@/components/DoubleCheckModal';
import EntryFlow from '@/components/EntryFlow';

const WALLETS = ['Pocket', 'Drawer'];

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [typeFilter, setTypeFilter] = useState('Payable'); // null | 'Receivable' | 'Payable'
  const [resolving, setResolving] = useState(null); // loan object pending resolve
  const [resolveWallet, setResolveWallet] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [summary, setSummary] = useState(null);

  const fetchLoans = useCallback(() => {
    setLoadError('');
    fetch('/api/loans-transfers')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setLoans(data.loans || []);
          setSummary(data.summary || null);
        } else {
          setLoadError(data.error || 'Failed to load loans.');
        }
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const filtered = useMemo(() => {
    let result = loans.filter((l) => l.resolved === showResolved);
    if (typeFilter) result = result.filter((l) => l.type === typeFilter);
    return result;
  }, [loans, showResolved, typeFilter]);

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
        <div className="max-w-md mx-auto px-5 mb-6">
          <div className="relative bg-gradient-to-br from-[#2B2620] to-[#1C1812] rounded-[28px] p-6 shadow-lg overflow-hidden">
            {/* subtle decorative glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-14 -left-10 w-40 h-40 rounded-full bg-white/[0.03] blur-2xl pointer-events-none" />

            <div className="relative grid grid-cols-2 gap-3">
              <button
                onClick={() => setTypeFilter((v) => (v === 'Receivable' ? null : 'Receivable'))}
                className={`text-left rounded-2xl p-4 border transition-colors active:scale-[0.98] ${
                  typeFilter === 'Receivable'
                    ? 'bg-[#8FD9AE]/15 border-[#8FD9AE]/60'
                    : 'bg-white/[0.06] hover:bg-white/[0.09] border-white/10'
                }`}
              >
                <span className="text-[#8FD9AE] text-[10px] font-bold uppercase tracking-wide block">আমি পাবো</span>
                <span className="font-extrabold text-xl text-white mt-1.5 block">৳{summary.cashLoanReceivable.toLocaleString('en-IN')}</span>
              </button>
              <button
                onClick={() => setTypeFilter((v) => (v === 'Payable' ? null : 'Payable'))}
                className={`text-left rounded-2xl p-4 border transition-colors active:scale-[0.98] ${
                  typeFilter === 'Payable'
                    ? 'bg-[#E8A99A]/15 border-[#E8A99A]/60'
                    : 'bg-white/[0.06] hover:bg-white/[0.09] border-white/10'
                }`}
              >
                <span className="text-[#E8A99A] text-[10px] font-bold uppercase tracking-wide block">আমার কাছে পাবে</span>
                <span className="font-extrabold text-xl text-white mt-1.5 block">৳{summary.totalPayable.toLocaleString('en-IN')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5 mb-4">
        <div className="flex items-center justify-end gap-2">
          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="px-3 py-2 rounded-full text-xs font-bold bg-[#F1E9DC] text-[#6B5F4F] hover:bg-[#E3D9C2] transition-all flex items-center gap-1"
            >
              {typeFilter === 'Receivable' ? 'আমি পাবো' : 'আমার কাছে পাবে'} ✕
            </button>
          )}
          <button
            onClick={() => setShowResolved((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              showResolved
                ? 'bg-[#2B2620] text-white shadow-sm'
                : 'bg-[#FFFDF8] border border-[#E3D9C2] text-[#6B5F4F] hover:border-[#D8CDB8]'
            }`}
          >
            Resolved History
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 space-y-3">
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
          <div className="text-center py-14">
            <p className="text-sm text-[#7D7156] font-semibold">
              No {showResolved ? 'resolved' : 'unresolved'}{typeFilter ? (typeFilter === 'Receivable' ? ' receivable' : ' payable') : ''} loans.
            </p>
          </div>
        ) : (
          filtered.map((l) => {
            const isReceivable = l.type === 'Receivable';
            return (
              <div
                key={l._id}
                className="ledger-rule bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 pl-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-1 uppercase tracking-wide ${
                          isReceivable ? 'bg-[#E7EEF4] text-[#2E5C8A]' : 'bg-[#F1E9DC] text-[#6B5F4F]'
                        }`}>
                          {isReceivable ? 'Owed to you' : 'You owe'}
                        </span>
                        <p className="font-bold text-sm text-[#2B2620] truncate">{l.person}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-extrabold text-base block ${isReceivable ? 'text-[#2E5C8A]' : 'text-[#2B2620]'}`}>
                          ৳{l.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {l.note && <p className="text-[11px] text-[#6B5F4F] mt-1 leading-snug">{l.note}</p>}

                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#EFE8D9]">
                      <p className="text-[10px] text-[#9A8F78] font-semibold">{new Date(l.date).toLocaleDateString('en-GB')}</p>
                      {l.resolved ? (
                        <span className="text-[10px] font-bold text-[#1F7A4D] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D]" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => openResolve(l)}
                          className="text-[11px] font-bold text-white bg-[#2B2620] hover:bg-[#3D362B] rounded-lg px-3 py-1.5 transition-colors active:scale-[0.97]"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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

      <div className="h-24" />
      <EntryFlow onSaved={fetchLoans} />
    </div>
  );
}
