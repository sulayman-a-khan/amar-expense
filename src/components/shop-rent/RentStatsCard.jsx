'use client';

const STATUS_STYLE = {
  Completed: { bg: 'bg-[#E6F0E5]', text: 'text-[#155C3A]', border: 'border-[#C5DCC2]' },
  Pending: { bg: 'bg-[#F7E9E5]', text: 'text-[#8C2D22]', border: 'border-[#E3C2B8]' },
  Advance: { bg: 'bg-[#E7EEF4]', text: 'text-[#234A6E]', border: 'border-[#C2D3E0]' },
};

export default function RentStatsCard({ record }) {
  if (!record) {
    return (
      <div className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-[20px] p-6 text-center">
        <p className="text-sm text-[#7D7156] font-semibold">This month hasn&apos;t started yet.</p>
      </div>
    );
  }

  const { monthlyRent, carryForward, advanceBalance, totalExpected, totalReceived, remainingBalance, status } = record;
  const progress = totalExpected > 0 ? Math.min(100, Math.round((totalReceived / totalExpected) * 100)) : 100;
  const style = STATUS_STYLE[status] || STATUS_STYLE.Pending;

  return (
    <div className="ledger-rule bg-[#FFFDF8] border border-[#E3D9C2] rounded-[20px] p-6 pl-8 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase">Shop Rent</span>
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {status}
        </span>
      </div>

      <div>
        <span className="text-[10px] font-bold text-[#7D7156] uppercase tracking-wide block">Remaining Balance</span>
        <span className={`text-[32px] font-black tracking-tight leading-none block mt-1 ${
          remainingBalance > 0 ? 'text-[#B33B2E]' : remainingBalance < 0 ? 'text-[#2E5C8A]' : 'text-[#1F7A4D]'
        }`}>
          ৳{Math.abs(remainingBalance).toLocaleString('en-IN')}
          {remainingBalance < 0 && <span className="text-sm font-bold ml-1.5">(advance)</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-bold text-[#7D7156] uppercase tracking-wide">Collection Progress</span>
          <span className="text-[11px] font-bold text-[#2B2620]">{progress}%</span>
        </div>
        <div className="h-2.5 bg-[#F0EADA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1F7A4D] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E3D9C2]">
        <Stat label="Monthly Rent" value={monthlyRent} />
        <Stat label="Carry Forward" value={carryForward} muted={carryForward === 0} />
        <Stat label="Advance Balance" value={advanceBalance} muted={advanceBalance === 0} />
        <Stat label="Total Expected" value={totalExpected} />
        <Stat label="Total Received" value={totalReceived} color="text-[#1F7A4D]" />
        <Stat label="Remaining" value={Math.abs(remainingBalance)} color={remainingBalance > 0 ? 'text-[#B33B2E]' : 'text-[#2E5C8A]'} />
      </div>
    </div>
  );
}

function Stat({ label, value, muted, color }) {
  return (
    <div>
      <span className="text-[10px] font-bold text-[#7D7156] uppercase tracking-wide block">{label}</span>
      <span className={`text-sm font-extrabold block mt-0.5 ${muted ? 'text-[#A89A7D]' : color || 'text-[#2B2620]'}`}>
        ৳{value.toLocaleString('en-IN')}
      </span>
    </div>
  );
}
