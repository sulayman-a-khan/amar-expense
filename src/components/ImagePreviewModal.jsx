'use client';

export default function ImagePreviewModal({ src, title, onClose }) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full bg-[#1E293B] rounded-3xl p-4 flex flex-col items-center border border-white/10 shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center font-bold text-sm border border-white/10"
        >
          ✕
        </button>
        {title && (
          <h3 className="text-white font-extrabold text-sm mb-3 pr-8 truncate w-full text-center">
            {title}
          </h3>
        )}
        <div className="w-full h-80 rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center">
          <img
            src={src}
            alt={title || 'Driver photo'}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
