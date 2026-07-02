"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import EntryFlow from '@/components/EntryFlow';

const FILTERS = ['All', 'Income', 'Expense', 'Loan', 'Transfer'];

const TYPE_DOT = {
  Income: 'bg-[#1F7A4D]',
  Expense: 'bg-[#B33B2E]',
  Loan: 'bg-[#2E5C8A]',
  Transfer: 'bg-[#2E5C8A]',
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
          <p className="text-center text-sm text-[#7D7156] py-10">Loading ledger…</p>
        ) : loadError ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm font-semibold text-[#B33B2E]">{loadError}</p>
            <button onClick={fetchTransactions} className="px-4 py-2 bg-[#2B2620] text-white text-xs font-bold rounded-xl">
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-[#7D7156] py-10">No {filter !== 'All' ? filter.toLowerCase() : ''} entries yet.</p>
        ) : (
          filtered.map((t) => {
            const isBikeCollection = t.subType === 'Bike Collection';
            const isExpense = t.type === 'Expense';
            const dateLabel = new Date(t.date).toLocaleDateString('en-GB');
            return (
              <div key={t._id} className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[t.type] || 'bg-[#7D7156]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-bold text-sm text-[#2B2620] truncate">{t.title}</span>
                    {isBikeCollection && t.shift === 'Off Day' ? (
                      <span className="text-[10px] font-black uppercase tracking-wide text-white bg-[#B33B2E] px-2.5 py-1 rounded-lg whitespace-nowrap">
                        No Income
                      </span>
                    ) : isBikeCollection && Number(t.amount) === 0 ? (
                      <span className="text-[10px] font-black uppercase tracking-wide text-white bg-[#B8860B] px-2.5 py-1 rounded-lg whitespace-nowrap">
                        Due
                      </span>
                    ) : (
                      <span className={`font-extrabold text-sm whitespace-nowrap ${
                        t.type === 'Income' ? 'text-[#1F7A4D]' : t.type === 'Expense' ? 'text-[#B33B2E]' : 'text-[#2E5C8A]'
                      }`}>
                        {t.type === 'Expense' ? '−' : t.type === 'Income' ? '+' : ''}৳{Number(t.amount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {isBikeCollection ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B5F4F] bg-[#F0EAD9] border border-[#E3D9C2] px-2 py-0.5 rounded-md whitespace-nowrap">
                        {t.bikeName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                        t.shift === 'Off Day'
                          ? 'text-white bg-[#B33B2E]'
                          : t.shift === 'Half Day'
                          ? 'text-[#6B5124] bg-[#F3E3B8]'
                          : 'text-white bg-[#1F7A4D]'
                      }`}>
                        {t.shift}
                      </span>
                      <span className="text-[10px] text-[#9A8C6F] ml-auto">{dateLabel}</span>
                    </div>
                  ) : isExpense ? (
                    <>
                      <div className="flex items-center gap-1.5 mt-1">
                        {t.isCredit ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap text-white bg-[#B33B2E]">
                            Credit
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap text-[#6B5124] bg-[#F3E3B8]">
                            {t.wallet}
                          </span>
                        )}
                        <span className="text-[10px] text-[#9A8C6F] ml-auto">{dateLabel}</span>
                      </div>
                      {t.isCredit && t.payableToShop && (
                        <p className="text-[11px] text-[#6B5F4F] mt-1">Payable to: {t.payableToShop}</p>
                      )}
                      {!t.isCredit && t.noteText && (
                        <p className="text-[11px] text-[#6B5F4F] mt-1">{t.noteText}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-[#6B5F4F] whitespace-nowrap">{t.subType}</span>
                        <span className="text-[10px] text-[#9A8C6F] ml-auto">{dateLabel}</span>
                      </div>
                      {t.note && <p className="text-[11px] text-[#6B5F4F] mt-1">{t.note}</p>}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      <div className="h-24" />
      <EntryFlow onSaved={fetchTransactions} />
    </div>
  );
}
