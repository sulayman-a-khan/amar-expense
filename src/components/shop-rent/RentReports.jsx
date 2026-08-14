'use client';

import { useState, useEffect, useCallback } from 'react';

export default function RentReports({ year }) {
  const [mode, setMode] = useState('summary'); // 'summary' | 'yearly'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError('');
    const url = mode === 'yearly' ? `/api/shop-rent/reports?type=yearly&year=${year}` : `/api/shop-rent/reports?type=summary`;
    fetch(url)
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) => {
        if (ok) setData(d);
        else setError(d.error || 'Failed to load report.');
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => setLoading(false));
  }, [mode, year]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['summary', 'yearly'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors ${
              mode === m ? 'bg-white/15 text-white border border-white/10' : 'bg-transparent border border-white/8 text-white/40 hover:text-white/60'
            }`}
          >
            {m === 'summary' ? 'All-Time' : `Year ${year}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-white/30 py-6">Loading report…</p>
      ) : error ? (
        <p className="text-center text-sm text-[#FF8E8E] py-6">{error}</p>
      ) : data ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
          className="rounded-[20px] p-5 space-y-3 shadow-lg"
        >
          <ReportRow label="Total Rent Received" value={data.totals.totalReceived} color="text-[#5DE88A]" />
          <ReportRow label="Total Expected" value={data.totals.totalExpected} />
          <ReportRow label="Outstanding Balance" value={data.totals.outstandingBalance} color="text-[#FF6B6B]" />
          <ReportRow label="Advance Balance" value={data.totals.advanceBalance} color="text-[#7CB9FF]" />
          <div className="pt-3 border-t border-white/8 flex justify-between items-center">
            <span className="text-[11px] font-semibold text-white/40">Collection Rate</span>
            <span className="text-base font-black text-white">{data.totals.collectionRate}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] font-semibold text-white/40">{label}</span>
      <span className={`text-sm font-extrabold ${color || 'text-white/80'}`}>৳{value.toLocaleString('en-IN')}</span>
    </div>
  );
}
