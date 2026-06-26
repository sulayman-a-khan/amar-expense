'use client';

export default function BikeDueListModal({ isOpen, onClose, bikeDues, onSelectBike }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F4F5F7] w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-slide-up"
      >
        <div className="bg-white px-6 py-5 border-b border-[#E8EAED] shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-[#1A1D29]">জমা বাকি</h2>
            <p className="text-[11px] font-bold text-[#6B7280]">Bike rent due by driver</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#F4F5F7] hover:bg-[#E8EAED] text-[#6B7280] rounded-full transition-colors font-bold">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-3 px-6 py-2.5 bg-white text-[10px] font-bold text-[#6B7280] uppercase tracking-wide border-b border-[#E8EAED] sticky top-0">
            <span>Bike</span>
            <span>Driver</span>
            <span className="text-right">Due</span>
          </div>
          {(!bikeDues || bikeDues.length === 0) ? (
            <p className="text-center text-sm text-[#9CA3AF] py-10">No bike has any due right now. 🎉</p>
          ) : (
            <div className="divide-y divide-[#E8EAED]">
              {bikeDues.map((d) => (
                <button
                  key={d.bikeId}
                  onClick={() => onSelectBike(d)}
                  className="w-full grid grid-cols-3 px-6 py-4 items-center text-left active:bg-[#E8EAED]/40 transition-colors"
                >
                  <span className="text-sm font-bold text-[#1A1D29]">{d.bikeName}</span>
                  <span className="text-sm font-semibold text-[#6B7280]">{d.driverName}</span>
                  <span className="text-right text-sm font-extrabold text-[#2563EB]">৳{d.amount.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
