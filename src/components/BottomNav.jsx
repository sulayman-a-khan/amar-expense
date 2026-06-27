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
  income: 'bg-[#E6F0E5] border-[#C5DCC2] text-[#1F7A4D]',
  expense: 'bg-[#F7E9E5] border-[#E3C2B8] text-[#B33B2E]',
  loan: 'bg-[#E7EEF4] border-[#C2D3E0] text-[#2E5C8A]',
};

export default function BottomNav({ onSelectAction }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-5 left-4 right-4 z-30">
      <nav className="max-w-md mx-auto bg-[#FFFDF8] border border-[#E3D9C2] rounded-[22px] px-3 py-3 shadow-lg flex justify-between items-center gap-1">
        <NavButton icon="🏠" label="Home" active={pathname === '/'} onClick={() => router.push('/')} />
        <NavButton icon="📒" label="Ledger" active={pathname === '/ledger'} onClick={() => router.push('/ledger')} />

        <button
          onClick={() => onSelectAction()}
          aria-label="Add entry"
          className="w-14 h-14 rounded-full bg-[#2B2620] text-white text-2xl font-bold flex items-center justify-center shadow-md -mt-8 border-4 border-[#F7F3EA] active:scale-95 transition-transform"
        >
          +
        </button>

        <NavButton icon="🤝" label="Loans" active={pathname === '/loans'} onClick={() => router.push('/loans')} />
        <NavButton icon="⏳" label="Due" active={pathname === '/due'} onClick={() => router.push('/due')} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex-1 flex flex-col items-center py-1 gap-0.5">
      <span className={`text-base ${active ? 'opacity-100' : 'opacity-50'}`}>{icon}</span>
      <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-[#2B2620]' : 'text-[#7D7156]'}`}>
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
        className="w-full max-w-md bg-[#FFFDF8] rounded-t-[28px] p-5 pb-8 shadow-2xl animate-slide-up"
      >
        <div className="w-10 h-1.5 bg-[#E3D9C2] rounded-full mx-auto mb-5" />
        <h3 className="text-sm font-bold text-[#2B2620] mb-4 px-1">What would you like to log?</h3>
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
