'use client';

export default function PageHeader({ title, subtitle }) {
  return (
    <header className="bg-[#F4F5F7]/95 backdrop-blur-md sticky top-0 z-20 px-5 py-5">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <a
          href="/"
          aria-label="Back to dashboard"
          className="w-9 h-9 bg-white border border-[#E8EAED] rounded-xl flex items-center justify-center text-base shrink-0"
        >
          ←
        </a>
        <div>
          <h1 className="text-lg font-black tracking-tight text-[#1A1D29]">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#9CA3AF] font-semibold">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
