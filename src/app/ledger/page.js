"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import EntryFlow from '@/components/EntryFlow';

const FILTERS = ['All', 'Income', 'Expense', 'Loan', 'Transfer', 'Closing'];

const TYPE_DOT = {
  Income: 'bg-[#16A34A]',
  Expense: 'bg-[#DC2626]',
  Loan: 'bg-[#2563EB]',
  Transfer: 'bg-[#2563EB]',
  Closing: 'bg-[#9CA3AF]',
};

export default function LedgerPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [loadError, setLoadError] = useState('');

  const fetchTransactions = useCallback(() => {
    setLoadError('');
    fetch('/api/transactions')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) setTransactions(data.transactions || []);
        else setLoadError(data.error || 'Failed to load the ledger.');
      })
      .catch(() => setLoadError('Could not reach the server. Check your internet connection.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = useMemo(() => {
    if (filter === 'All') return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  return (
    <div>
      <PageHeader title="Full Ledger" subtitle="Every transaction, in one place" />

      <div className="max-w-md mx-auto px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f ? 'bg-[#1A1D29] text-white' : 'bg-white border border-[#E8EAED] text-[#6B7280]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-md mx-auto px-5 space-y-2.5">
        {loading ? (
          <p className="text-center text-sm text-[#9CA3AF] py-10">Loading ledger…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#DC2626]">{loadError}</p>
            <button onClick={fetchTransactions} className="px-4 py-2 bg-[#1A1D29] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-[#9CA3AF] py-10">No {filter !== 'All' ? filter.toLowerCase() : ''} entries yet.</p>
        ) : (
          filtered.map((t) => (
            <div key={t._id} className="bg-white border border-[#E8EAED] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[t.type] || 'bg-[#9CA3AF]'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-bold text-sm text-[#1A1D29] truncate">{t.title}</span>
                  <span className={`font-extrabold text-sm whitespace-nowrap ${
                    t.type === 'Income' ? 'text-[#16A34A]' : t.type === 'Expense' ? 'text-[#DC2626]' : 'text-[#2563EB]'
                  }`}>
                    {t.type === 'Expense' ? '−' : t.type === 'Income' ? '+' : ''}৳{Number(t.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{new Date(t.date).toLocaleDateString('en-GB')} · {t.subType}</p>
                {t.note && <p className="text-[11px] text-[#6B7280] mt-1">{t.note}</p>}
              </div>
            </div>
          ))
        )}
      </main>

      <div className="h-24" />
      <EntryFlow onSaved={fetchTransactions} />
    </div>
  );
}
