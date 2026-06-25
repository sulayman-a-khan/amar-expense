'use client';

import React from 'react';

export default function DoubleCheckModal({ isOpen, onClose, onConfirm, data, saving, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 text-center border-b border-zinc-100 dark:border-zinc-800">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 bg-amber-100 rounded-full dark:bg-amber-950/50">
            <span className="text-xl text-amber-600 dark:text-amber-400 font-bold">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Double-Check Entry
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Please verify these details carefully to avoid memory doubts.
          </p>
        </div>

        {/* Data list */}
        <div className="p-5 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          {Object.entries(data).map(([key, val]) => {
            if (val === undefined || val === null || val === '') return null;
            if (key === 'bikeId') return null; // internal id, not meaningful to the person

            // Format labels for better visual readability
            let displayKey = key.replace(/([A-Z])/g, ' $1');
            displayKey = displayKey.charAt(0).toUpperCase() + displayKey.slice(1);

            if (key === 'imageUrl') {
              return (
                <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-none">
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">Receipt Photo:</span>
                  <img src={val} alt="Receipt preview" className="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
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
              <div key={key} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-zinc-200 dark:border-zinc-800 last:border-none">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider">{displayKey}:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right">{displayVal}</span>
              </div>
            );
          })}
        </div>

        {/* Error message, if a save failed */}
        {error && (
          <div className="px-5 pt-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3.5 py-2.5">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 flex gap-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-3 px-4 text-sm font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Saving…' : error ? 'Try Again' : 'Confirm & Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
