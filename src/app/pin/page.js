'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PinScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const submit = async (pin) => {
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const next = searchParams.get('next') || '/';
        router.replace(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect PIN.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError('');

    if (clean && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    if (clean && index === 3) {
      const pin = next.join('');
      if (pin.length === 4) submit(pin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F3EA] p-6">
      <div className="w-full max-w-xs text-center space-y-6">
        <div>
          <div className="w-14 h-14 rounded-full bg-[#2B2620] text-white text-2xl flex items-center justify-center mx-auto shadow-md">
            🔒
          </div>
          <h1 className="mt-4 text-lg font-black text-[#2B2620]">Enter PIN</h1>
          <p className="mt-1 text-xs font-bold text-[#7D7156]">This ledger is locked. Enter your PIN to continue.</p>
        </div>

        <div className="flex justify-center gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={checking}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-black bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl focus:outline-none focus:border-[#2B2620] text-[#2B2620] disabled:opacity-50"
            />
          ))}
        </div>

        {error && <p className="text-xs font-bold text-[#B33B2E]">{error}</p>}
        {checking && <p className="text-xs font-bold text-[#7D7156]">Checking...</p>}
      </div>
    </div>
  );
}

export default function PinPage() {
  return (
    <Suspense fallback={null}>
      <PinScreen />
    </Suspense>
  );
}
