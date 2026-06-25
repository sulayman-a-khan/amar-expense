'use client';

const WALLET_META = {
  Business: { label: 'Business', icon: '🏪' },
  Pocket: { label: 'Pocket', icon: '👤' },
  Drawer: { label: 'Drawer', icon: '🏠' },
};

export default function WalletRow({ wallets }) {
  return (
    <section className="grid grid-cols-3 gap-2.5">
      {Object.entries(wallets).map(([name, balance]) => (
        <div key={name} className="bg-white border border-[#E8EAED] rounded-2xl py-3.5 text-center shadow-sm">
          <span className="text-base block">{WALLET_META[name]?.icon || '💰'}</span>
          <span className="text-[10px] font-bold text-[#6B7280] tracking-wide uppercase block mt-1">
            {WALLET_META[name]?.label || name}
          </span>
          <span className="text-sm font-extrabold text-[#1A1D29] mt-0.5 block">
            ৳{Number(balance).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </section>
  );
}
