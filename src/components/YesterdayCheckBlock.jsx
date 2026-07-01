'use client';

import React, { useState, useEffect } from 'react';
import { yesterdayDhakaDateString, formatGlobalDate } from '@/lib/dateUtils';

export default function YesterdayCheckBlock({ missingYesterday, missingReason, onOk, onSkip }) {
  const [isOpen, setIsOpen] = useState(false);
  const formattedYesterday = yesterdayDhakaDateString();

  useEffect(() => {
    if (missingYesterday) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [missingYesterday]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#2B2620]/90 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden bg-[#FFFDF8] rounded-[28px] shadow-2xl border border-[#E3D9C2] animate-fade-scale-in">
        
        {/* Warning Icon & Title */}
        <div className="p-6 text-center bg-[#F7E9E5] border-b border-[#E3C2B8]">
          <div className="w-12 h-12 rounded-full bg-[#B33B2E] text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-md">
            ⚠️
          </div>
          <h2 className="mt-3 text-lg font-black text-[#2B2620]">
            Entry Missing!
          </h2>
          <p className="mt-2.5 text-xs font-bold text-[#B33B2E] bg-red-50 border border-red-200/50 rounded-xl py-2.5 px-3 leading-relaxed">
            {formatGlobalDate(formattedYesterday)} has missing entries.<br />
            Please give entry first.
          </p>
        </div>

        {/* Buttons */}
        <div className="p-4 bg-[#FFFDF8] flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-xs font-bold text-[#7D7156] bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl active:scale-[0.98] transition-transform"
          >
            Skip for Now
          </button>
          <button
            onClick={() => onOk(formattedYesterday)}
            className="flex-1 py-3 text-xs font-bold text-white bg-[#2B2620] hover:bg-[#1E1A16] rounded-xl active:scale-[0.98] transition-transform shadow-md"
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
}
