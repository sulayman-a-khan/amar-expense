'use client';

import { useState, useEffect } from 'react';

export default function EditBikeModal({ bike, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [driver, setDriver] = useState('');
  const [dailyRent, setDailyRent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bike) {
      setName(bike.name || '');
      setDriver(bike.driver || '');
      setDailyRent(bike.dailyRent ?? '');
      setError('');
    }
  }, [bike]);

  if (!bike) return null;

  const handleSave = async () => {
    if (!name.trim() || !driver.trim() || dailyRent === '' || Number(dailyRent) < 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bike._id, name: name.trim(), driver: driver.trim(), dailyRent }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to save changes.');
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-5 z-50">
      <div className="bg-[#FFFDF8] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-fade-scale-in">
        <h4 className="font-bold text-[#2B2620] text-base mb-1">Edit Bike Details</h4>
        <p className="text-xs text-[#6B5F4F] mb-4">Update name, driver, or daily rent</p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">Bike Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#E3D9C2] bg-[#F7F3EA] text-[#2B2620] rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">Driver Name</label>
            <input
              type="text" value={driver} onChange={(e) => setDriver(e.target.value)}
              className="w-full border border-[#E3D9C2] bg-[#F7F3EA] text-[#2B2620] rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">Daily Rent (৳)</label>
            <input
              type="number" min="0" value={dailyRent} onChange={(e) => setDailyRent(e.target.value)}
              className="w-full border border-[#E3D9C2] bg-[#F7F3EA] text-[#2B2620] rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-xs text-[#B33B2E] font-semibold mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 py-3 text-xs font-bold bg-[#F7F3EA] rounded-xl text-[#6B5F4F] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 text-xs font-bold bg-[#2B2620] text-white rounded-xl disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
