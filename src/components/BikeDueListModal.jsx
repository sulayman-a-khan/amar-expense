'use client';

export default function BikeDueListModal({ isOpen, onClose, bikeDues, onSelectBike }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F7F3EA] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-slide-up"
      >
        <div className="bg-[#FFFDF8] px-6 py-5 border-b border-[#E3D9C2] shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#2B2620]">জমা বাকি</h2>
            <p className="text-[11px] font-bold text-[#6B5F4F]">Bike rent due by driver</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F7F3EA] hover:bg-[#E3D9C2] text-[#6B5F4F] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-3 px-6 py-2.5 bg-[#FFFDF8] text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide border-b border-[#E3D9C2] sticky top-0">
            <span>Bike</span>
            <span>Driver</span>
            <span className="text-right">Due</span>
          </div>
          {(!bikeDues || bikeDues.length === 0) ? (
            <p className="text-center text-sm text-[#7D7156] py-10">No bike has any due right now. 🎉</p>
          ) : (
            <div className="divide-y divide-[#E3D9C2]">
              {bikeDues.map((d) => (
                <button
                  key={d.bikeId}
                  onClick={() => onSelectBike(d)}
                  className="w-full grid grid-cols-3 px-6 py-4 items-center text-left active:bg-[#E3D9C2]/40 transition-colors"
                >
                  <span className="text-sm font-bold text-[#2B2620]">{d.bikeName}</span>
                  <span className="text-sm font-semibold text-[#6B5F4F]">{d.driverName}</span>
                  <span className="text-right text-sm font-extrabold text-[#2E5C8A]">৳{d.amount.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
