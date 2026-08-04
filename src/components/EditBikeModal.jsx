'use client';

import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';

export default function EditBikeModal({ bike, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [driver, setDriver] = useState('');
  const [dailyRent, setDailyRent] = useState('');
  const [rentMode, setRentMode] = useState('DAILY');
  const [monthlyRentAmount, setMonthlyRentAmount] = useState('');
  const [driverImage, setDriverImage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bike) {
      setName(bike.name || '');
      setDriver(bike.driver || '');
      setDailyRent(bike.dailyRent ?? '');
      setRentMode(bike.rentMode || 'DAILY');
      setMonthlyRentAmount(bike.monthlyRentAmount ?? 9000);
      setDriverImage(bike.driverImage || '');
      setError('');
    }
  }, [bike]);

  if (!bike) return null;

  const handleSave = async () => {
    if (!name.trim() || !driver.trim()) {
      setError('Please fill in name and driver.');
      return;
    }
    if (rentMode === 'DAILY' && (dailyRent === '' || Number(dailyRent) < 0)) {
      setError('Please enter a valid daily rent.');
      return;
    }
    if (rentMode === 'MONTHLY' && (monthlyRentAmount === '' || Number(monthlyRentAmount) <= 0)) {
      setError('Please enter a valid monthly rent amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/bikes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bike._id,
          name: name.trim(),
          driver: driver.trim(),
          dailyRent,
          rentMode,
          monthlyRentAmount,
          driverImage,
        }),
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
        <p className="text-xs text-[#6B5F4F] mb-4">Update name, driver, or rental agreement</p>

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

          <ImageUploader
            value={driverImage}
            onChange={setDriverImage}
            label="Driver Photo (optional)"
            placeholder="📷 Tap to add driver's photo"
            folder="drivers"
            imageClassName="w-full h-32 object-cover rounded-xl border border-[#E3D9C2]"
          />

          {/* Rental agreement mode toggle — switching this is how you move a
              bike between the DAILY and MONTHLY rent systems. Nothing about
              the DAILY history is touched when you switch away from it, and
              switching back restores it exactly as it was. */}
          <div>
            <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">Rental Agreement</label>
            <div className="grid grid-cols-2 gap-1 bg-[#F7F3EA] p-1 rounded-xl">
              {['DAILY', 'MONTHLY'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRentMode(m)}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    rentMode === m ? 'bg-[#2B2620] text-white' : 'text-[#6B5F4F]'
                  }`}
                >
                  {m === 'DAILY' ? 'Daily' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>

          {rentMode === 'DAILY' ? (
            <div>
              <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">Daily Rent (৳)</label>
              <input
                type="number" min="0" value={dailyRent} onChange={(e) => setDailyRent(e.target.value)}
                className="w-full border border-[#E3D9C2] bg-[#F7F3EA] text-[#2B2620] rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-[#6B5F4F] uppercase tracking-wide mb-1">
                Monthly Rent (৳) <span className="text-[#7D7156] font-normal">— due by the 12th</span>
              </label>
              <input
                type="number" min="0" value={monthlyRentAmount} onChange={(e) => setMonthlyRentAmount(e.target.value)}
                className="w-full border border-[#E3D9C2] bg-[#F7F3EA] text-[#2B2620] rounded-xl px-4 py-3 text-sm focus:outline-none"
              />
            </div>
          )}
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
