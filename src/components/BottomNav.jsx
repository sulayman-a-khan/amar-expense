'use client';

import { useRouter, usePathname } from 'next/navigation';

const ACTIONS = [
  { key: 'rent', label: 'Bike Rent', sub: 'Shift collection', color: 'income' },
  { key: 'income', label: 'Income', sub: 'Shop / Daily / Other', color: 'income' },
  { key: 'expense', label: 'Expense', sub: 'Spending or credit', color: 'expense' },
  { key: 'transfer', label: 'Transfer', sub: 'Between wallets', color: 'loan' },
  { key: 'loan', label: 'Loan', sub: 'Give or owe money', color: 'loan' },
];

const COLOR_CLASSES = {
  income: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]',
  expense: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
  loan: 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]',
};

export default function BottomNav({ onSelectAction }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-5 left-4 right-4 z-30">
      <nav className="max-w-md mx-auto bg-white border border-[#E8EAED] rounded-[22px] px-3 py-3 shadow-lg flex justify-between items-center gap-1">
        <NavButton icon="🏠" label="Home" active={pathname === '/'} onClick={() => router.push('/')} />
        <NavButton icon="📒" label="Ledger" active={pathname === '/ledger'} onClick={() => router.push('/ledger')} />

        <button
          onClick={() => onSelectAction()}
          aria-label="Add entry"
          className="w-14 h-14 rounded-full bg-[#1A1D29] text-white text-2xl font-bold flex items-center justify-center shadow-md -mt-8 border-4 border-[#F4F5F7] active:scale-95 transition-transform"
        >
          +
        </button>

        <NavButton icon="🤝" label="Loans" active={pathname === '/loans'} onClick={() => router.push('/loans')} />
        <NavButton icon="⚙️" label="More" />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center py-1 gap-0.5">
      <span className={`text-base ${active ? 'opacity-100' : 'opacity-50'}`}>{icon}</span>
      <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-[#1A1D29]' : 'text-[#9CA3AF]'}`}>
        {label}
      </span>
    </button>
  );
}

export function ActionSheet({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[28px] p-5 pb-8 shadow-2xl animate-slide-up"
      >
        <div className="w-10 h-1.5 bg-[#E8EAED] rounded-full mx-auto mb-5" />
        <h3 className="text-sm font-bold text-[#1A1D29] mb-4 px-1">What would you like to log?</h3>
        <div className="space-y-2.5">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              onClick={() => onSelect(a.key)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border ${COLOR_CLASSES[a.color]} active:scale-[0.98] transition-transform`}
            >
              <div className="text-left">
                <span className="font-bold text-sm block">{a.label}</span>
                <span className="text-[11px] opacity-70 font-medium">{a.sub}</span>
              </div>
              <span className="text-lg">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
