'use client';

import { useState } from 'react';

export default function ImageUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const sigRes = await fetch('/api/upload-signature');
      const sig = await sigRes.json();
      if (sig.error) throw new Error(sig.error);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      const uploaded = await uploadRes.json();
      if (uploaded.secure_url) {
        onChange(uploaded.secure_url);
      } else {
        throw new Error(uploaded.error?.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wide">
        Receipt Photo (optional)
      </label>

      {value ? (
        <div className="relative">
          <img src={value} alt="Receipt" className="w-full h-32 object-cover rounded-xl border border-[#E8EAED]" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full text-xs font-bold"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center h-20 border-2 border-dashed border-[#E8EAED] rounded-xl cursor-pointer text-[#9CA3AF] text-xs font-semibold active:bg-[#F4F5F7]">
          {uploading ? 'Uploading…' : '📷 Tap to add photo'}
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
      )}

      {error && <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{error}</p>}
    </div>
  );
}
