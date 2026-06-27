'use client';

import React from 'react';

export default function DoubleCheckModal({ isOpen, onClose, onConfirm, data, saving, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden bg-[#FFFDF8] rounded-2xl shadow-2xl border border-[#E3D9C2] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 text-center border-b border-[#E3D9C2]">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 bg-[#F0E2C2] rounded-full">
            <span className="text-xl text-[#8C6D22] font-bold">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-[#2B2620]">
            Double-Check Entry
          </h3>
          <p className="mt-1 text-xs text-[#7D7156]">
            Please verify these details carefully to avoid memory doubts.
          </p>
        </div>

        {/* Data list */}
        <div className="p-5 space-y-3 bg-[#F7F3EA]/50">
          {Object.entries(data).map(([key, val]) => {
            if (val === undefined || val === null || val === '') return null;
            if (key === 'bikeId') return null; // internal id, not meaningful to the person

            // Format labels for better visual readability
            let displayKey = key.replace(/([A-Z])/g, ' $1');
            displayKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1);

            if (key === 'imageUrl') {
              return (
                <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-[#E3D9C2] last:border-none">
                  <span className="text-[#7D7156] text-xs uppercase tracking-wider">Receipt Photo:</span>
                  <img src={val} alt="Receipt preview" className="w-10 h-10 object-cover rounded-lg border border-[#E3D9C2]" />
                </div>
              );
            }

            let displayVal = val;
            if (typeof val === 'boolean') {
              displayVal = val ? 'Yes' : 'No';
            }
            if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('rent')) {
              displayVal = `৳${val}`;
            }

            return (
              <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-[#E3D9C2] last:border-none">
                <span className="text-[#7D7156] text-xs uppercase tracking-wider">{displayKey}:</span>
                <span className="font-bold text-[#2B2620] text-right">{displayVal}</span>
              </div>
            );
          })}
        </div>

        {/* Error message, if a save failed */}
        {error && (
          <div className="px-5 pt-4">
            <div className="bg-[#F7E9E5] border border-[#E3C2B8] rounded-xl px-3.5 py-2.5">
              <p className="text-xs font-semibold text-[#8C2D22]">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 flex gap-3 border-t border-[#E3D9C2] bg-[#FFFDF8]">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl bg-[#F0EADA] hover:bg-[#E3D9C2] text-[#3D362B] transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl bg-[#1F7A4D] hover:bg-[#155C3A] text-white shadow-lg shadow-[#1F7A4D]/25 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Saving…' : error ? 'Try Again' : 'Confirm & Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
