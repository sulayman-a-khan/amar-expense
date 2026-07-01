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
              mode === m ? 'bg-[#2B2620] text-white' : 'bg-[#FFFDF8] border border-[#E3D9C2] text-[#6B5F4F]'
            }`}
          >
            {m === 'summary' ? 'All-Time' : `Year ${year}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#7D7156] py-6">Loading report…</p>
      ) : error ? (
        <p className="text-center text-sm text-[#B33B2E] py-6">{error}</p>
      ) : data ? (
        <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl p-5 space-y-3">
          <ReportRow label="Total Rent Received" value={data.totals.totalReceived} color="text-[#1F7A4D]" />
          <ReportRow label="Total Expected" value={data.totals.totalExpected} />
          <ReportRow label="Outstanding Balance" value={data.totals.outstandingBalance} color="text-[#B33B2E]" />
          <ReportRow label="Advance Balance" value={data.totals.advanceBalance} color="text-[#2E5C8A]" />
          <div className="pt-3 border-t border-[#E3D9C2] flex justify-between items-center">
            <span className="text-[11px] font-bold text-[#6B5F4F] uppercase tracking-wide">Collection Rate</span>
            <span className="text-base font-black text-[#2B2620]">{data.totals.collectionRate}%</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReportRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] font-semibold text-[#6B5F4F]">{label}</span>
      <span className={`text-sm font-extrabold ${color || 'text-[#2B2620]'}`}>৳{value.toLocaleString('en-IN')}</span>
    </div>
  );
}
