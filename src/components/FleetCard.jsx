'use client';

export default function FleetCard({ bikes, onEditBike }) {
  if (!bikes || bikes.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B7280] tracking-widest uppercase px-1">
        Active Fleet
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {bikes.map((bike) => (
          <button
            key={bike._id}
            onClick={() => onEditBike(bike)}
            className="bg-white border border-[#E8EAED] rounded-2xl py-3.5 px-2 text-center shadow-sm active:scale-[0.97] transition-transform"
          >
            <span className="text-[10px] font-bold text-[#6B7280] block">BIKE {bike.name}</span>
            <p className="text-xs font-bold text-[#1A1D29] mt-1.5 truncate">{bike.driver}</p>
            <span className="text-[10px] text-[#9CA3AF] mt-0.5 block">৳{bike.dailyRent}/day</span>
          </button>
        ))}
      </div>
    </section>
  );
}
