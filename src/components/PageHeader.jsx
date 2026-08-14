'use client';

export default function PageHeader({ title, subtitle, right, darkTheme }) {
  const bgClass = darkTheme ? 'bg-[#0F172A]/95 text-white border-b border-white/5' : 'bg-[#F7F3EA]/95 border-b border-transparent';
  const buttonClass = darkTheme ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20' : 'bg-[#FFFDF8] text-[#2B2620] border border-[#E3D9C2]';
  const titleClass = darkTheme ? 'text-white' : 'text-[#2B2620]';
  const subtitleClass = darkTheme ? 'text-white/50' : 'text-[#7D7156]';

  return (
    <header className={`${bgClass} backdrop-blur-md px-5 py-5 transition-colors`}>
      <div className="max-w-md mx-auto flex items-center gap-3">
        <a
          href="/"
          aria-label="Back to dashboard"
          className={`w-9 h-9 ${buttonClass} rounded-xl flex items-center justify-center text-base shrink-0 transition-colors`}
        >
          ←
        </a>
        <div className="flex-1 min-w-0">
          <h1 className={`text-lg font-black tracking-tight ${titleClass} transition-colors`}>{title}</h1>
          {subtitle && <p className={`text-[11px] font-semibold ${subtitleClass} transition-colors`}>{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
