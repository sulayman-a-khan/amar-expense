'use client';

export default function PageHeader({ title, subtitle }) {
  return (
    <header className="bg-[#F7F3EA]/95 backdrop-blur-md sticky top-0 z-20 px-5 py-5">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <a
          href="/"
          aria-label="Back to dashboard"
          className="w-9 h-9 bg-[#FFFDF8] border border-[#E3D9C2] rounded-xl flex items-center justify-center text-base shrink-0"
        >
          ←
        </a>
        <div>
          <h1 className="text-lg font-black tracking-tight text-[#2B2620]">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#7D7156] font-semibold">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
