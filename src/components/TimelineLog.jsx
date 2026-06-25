'use client';

export default function TimelineLog({ activities }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B7280] tracking-widest uppercase px-1">
        Today&apos;s Activity Log
      </h3>
      <div className="bg-white border border-[#E8EAED] rounded-[24px] p-5 shadow-sm space-y-4">
        {activities.length > 0 ? activities.map((act) => (
          <div key={act.id} className="flex gap-3.5 items-start">
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                act.type === 'income' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
              }`}
            />
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-[#9CA3AF] block">{act.time}</span>
              <p className="text-[13px] text-[#374151] font-medium leading-snug">{act.text}</p>
            </div>
          </div>
        )) : (
          <p className="text-xs text-[#9CA3AF] text-center py-2">No activity logged today yet.</p>
        )}
      </div>
    </section>
  );
}
