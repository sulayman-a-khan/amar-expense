'use client';

const STATUS_STYLE = {
  Completed: { bg: 'bg-[#5DE88A]/15', text: 'text-[#5DE88A]', border: 'border-[#5DE88A]/30' },
  Pending: { bg: 'bg-[#FF8E8E]/15', text: 'text-[#FF8E8E]', border: 'border-[#FF8E8E]/30' },
  Advance: { bg: 'bg-[#7CB9FF]/15', text: 'text-[#7CB9FF]', border: 'border-[#7CB9FF]/30' },
};

export default function RentStatsCard({ record, onEditRent, rentSource }) {
  if (!record) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
        className="rounded-[24px] p-6 text-center shadow-lg"
      >
        <p className="text-sm text-white/40 font-medium">This month hasn&apos;t started yet.</p>
      </div>
    );
  }

  const { monthlyRent, carryForward, advanceBalance, totalExpected, totalReceived, remainingBalance, status } = record;
  const progress = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : 100;
  const style = STATUS_STYLE[status] || STATUS_STYLE.Pending;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        boxShadow: '0 8px 40px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}
      className="rounded-[24px] p-6 space-y-6 relative overflow-hidden"
    >
      {/* Decorative gradient blob */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#5DE88A]/6 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex justify-between items-start relative">
        <span className="text-[12px] font-semibold text-white/50">Shop Rent</span>
        <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {status}
        </span>
      </div>

      <div className="text-center py-2 relative">
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider block">Remaining Balance</span>
        <span className={`text-[42px] font-black tracking-tight leading-none block mt-2 ${
          remainingBalance > 0 ? 'text-[#FF6B6B]' : remainingBalance < 0 ? 'text-[#7CB9FF]' : 'text-[#5DE88A]'
        }`}>
          ৳{Math.abs(remainingBalance).toLocaleString('en-IN')}
        </span>
        {remainingBalance < 0 && <span className="text-[11px] font-semibold text-[#7CB9FF] block mt-1">(advance)</span>}
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-medium text-white/40">Collection Progress</span>
          <span className="text-[11px] font-semibold text-white/70">{progress}%</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5DE88A] to-[#34D399] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-4 pt-4 border-t border-white/8 relative">
        <Stat label="Total Due" value={totalExpected} />
        <Stat label="Received" value={totalReceived} color="text-[#5DE88A]" />
        <Stat label="Remaining" value={Math.abs(remainingBalance)} color={remainingBalance > 0 ? 'text-[#FF6B6B]' : 'text-[#7CB9FF]'} />
        
        <div className="col-span-1">
          <span className="text-[10px] font-medium text-white/35 block">Base Rent</span>
          <button 
            onClick={onEditRent}
            className="text-[12px] font-bold text-white/80 mt-0.5 hover:text-white transition-colors flex items-center gap-1"
          >
            ৳{(rentSource?.monthlyRent || monthlyRent).toLocaleString('en-IN')}
            <span className="text-[10px] text-[#7CB9FF]">✎</span>
          </button>
        </div>
        <Stat label="Forward" value={carryForward} muted={carryForward === 0} />
        <Stat label="Advance" value={advanceBalance} muted={advanceBalance === 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, muted, color }) {
  return (
    <div>
      <span className="text-[10px] font-medium text-white/35 block">{label}</span>
      <span className={`text-[12px] font-bold block mt-0.5 ${muted ? 'text-white/20' : color || 'text-white/80'}`}>
        ৳{value.toLocaleString('en-IN')}
      </span>
    </div>
  );
}
