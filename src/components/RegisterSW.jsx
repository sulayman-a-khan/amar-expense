'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures shouldn't break the app — installability
        // just won't be offered if this fails (e.g. unsupported browser).
      });
    }
  }, []);

  return null;
}
