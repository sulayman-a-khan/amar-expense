'use client';

import { useEffect, useState } from 'react';

// Ticks down to `deadline` (a Date/ISO string) once a second and renders a
// compact "Xd Yh Zm" (or "Yh Zm Ss" once under a day) countdown. Used on
// the Monthly Bikes fleet cards so the due date visibly counts down instead
// of sitting static at "Due in 3d" until the next page refresh.
function getRemaining(deadline) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, totalSeconds };
}

export default function MonthlyRentCountdown({ deadline }) {
  const [remaining, setRemaining] = useState(() => (deadline ? getRemaining(deadline) : null));

  useEffect(() => {
    if (!deadline) return;
    setRemaining(getRemaining(deadline));
    const id = setInterval(() => setRemaining(getRemaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!remaining) return null;

  const { days, hours, minutes, seconds } = remaining;
  // Under 24h left — switch to hour:min:sec precision and a more urgent pulse.
  const urgent = days === 0;

  return (
    <span
      className={`relative inline-flex items-center gap-1 mt-1 ${urgent ? 'animate-pulse' : ''}`}
      style={{ color: urgent ? '#FFB4A8' : 'rgba(255,255,255,0.75)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: urgent ? '#FF6B5B' : '#5de88a' }}
      />
      <span className="text-[10px] font-bold tabular-nums">
        {urgent
          ? `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
          : `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`}
      </span>
    </span>
  );
}
