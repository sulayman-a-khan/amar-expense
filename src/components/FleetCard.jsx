'use client';

export default function FleetCard({ bikes, onEditBike, onViewBike }) {
  if (!bikes || bikes.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-bold text-[#6B5F4F] tracking-widest uppercase px-1">
        Active Fleet
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {bikes.map((bike) => (
          <div key={bike._id} className="relative group">
            <button
              onClick={() => onViewBike(bike)}
              className="w-full bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl py-3.5 px-2 text-center shadow-sm active:scale-[0.97] transition-transform"
            >
              <span className="text-[10px] font-bold text-[#6B5F4F] block">BIKE {bike.name}</span>
              <p className="text-xs font-bold text-[#2B2620] mt-1.5 truncate">{bike.driver}</p>
              <span className="text-[10px] text-[#7D7156] mt-0.5 block">৳{bike.dailyRent}/day</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEditBike(bike); }}
              className="absolute top-1 right-1 p-1.5 text-[#7D7156] hover:text-[#6B5F4F] bg-[#FFFDF8]/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✏️
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
