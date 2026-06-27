'use client';

const WALLET_META = {
  Pocket: { label: 'Pocket', icon: '👤' },
  Drawer: { label: 'Drawer', icon: '🏠' },
};

export default function WalletRow({ wallets }) {
  return (
    <section className="grid grid-cols-2 gap-2.5">
      {Object.entries(wallets).map(([name, balance]) => (
        <div key={name} className="bg-[#FFFDF8] border border-[#E3D9C2] rounded-2xl py-3.5 text-center shadow-sm">
          <span className="text-base block">{WALLET_META[name]?.icon || '💰'}</span>
          <span className="text-[10px] font-bold text-[#6B5F4F] tracking-wide uppercase block mt-1">
            {WALLET_META[name]?.label || name}
          </span>
          <span className="text-sm font-extrabold text-[#2B2620] mt-0.5 block">
            ৳{Number(balance).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </section>
  );
}
