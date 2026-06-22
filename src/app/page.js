"use client";

import { useState, useEffect } from 'react';

export default function Dashboard() {
  // ড্যাশবোর্ড ডেটা স্টেট
  const [wallets, setWallets] = useState({ Business: 0, Pocket: 0, Drawer: 0 });
  const [profitSummary, setProfitSummary] = useState({ netProfit: 0, totalIncome: 0, totalExpense: 0 });
  const [bikes, setBikes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // মোডাল ও ফর্ম কন্ট্রোল স্টেট
  const [showSettings, setShowSettings] = useState(false);
  const [editingBikeId, setEditingBikeId] = useState(null);
  const [newDriverName, setNewDriverName] = useState('');

  // ট্রানজেকশন মোডাল স্টেট (Rent In, Expense, Transfer)
  const [activeForm, setActiveForm] = useState(null); // 'rent', 'expense', 'transfer'
  const [formData, setFormData] = useState({});

  // ডাটাবেজ থেকে ড্যাশবোর্ডের সব ডেটা লোড করার ফাংশন
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (res.ok) {
        setWallets(data.wallets);
        setProfitSummary(data.summary);
        setBikes(data.bikes);
        setActivities(data.activities);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ১. ড্রাইভারের নাম আপডেট করার ফাংশন (API Call)
  const saveDriverName = async () => {
    try {
      const res = await fetch('/api/bikes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingBikeId, driver: newDriverName }),
      });
      if (res.ok) {
        fetchDashboardData(); // সফল হলে স্ক্রিন রিফ্রেশ
        setEditingBikeId(null);
      }
    } catch (error) {
      console.error("Error updating driver:", error);
    }
  };

  // ২. নতুন ট্রানজেকশন সাবমিট করার জেনারিক ফাংশন
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    let endpoint = '/api/incomes';
    if (activeForm === 'expense') endpoint = '/api/expenses';
    if (activeForm === 'transfer') endpoint = '/api/loans-transfers';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: activeForm }),
      });

      if (res.ok) {
        fetchDashboardData(); // ব্যালেন্স ও টাইমলাইন আপডেট
        setActiveForm(null); // ফর্ম বন্ধ
        setFormData({});
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-slate-400 font-mono text-xs">LOADING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-[#090D16] text-[#E2E8F0] font-sans antialiased pb-36 relative overflow-hidden">

      {/* Ambient Glows */}
      <div className="absolute top-[-20%] left-[-30%] w-[100vw] h-[100vw] bg-gradient-to-br from-[#10B981]/10 to-transparent rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header */}
      <header className="bg-[#0D1527]/60 backdrop-blur-2xl sticky top-0 z-40 border-b border-white/[0.04] px-6 py-5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-b from-white to-[#94A3B8] bg-clip-text text-transparent">AMAR HISHAB</h1>
            <p className="text-[9px] text-[#10B981] font-mono tracking-widest uppercase mt-0.5 font-bold">SYSTEM ACTIVE</p>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center">
            <span className="text-sm opacity-70">⚙️</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6 relative z-10">

        {/* Net Profit Card */}
        <section className="bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl border border-white/[0.08] rounded-[32px] p-6 shadow-2xl relative">
          <span className="text-[10px] font-mono font-bold text-[#94A3B8] tracking-widest uppercase block">NET BALANCE TODAY</span>
          <h2 className="text-4xl font-black mt-2 tracking-tighter text-white">
            {profitSummary.netProfit >= 0 ? `+ ৳${profitSummary.netProfit}` : `- ৳${Math.abs(profitSummary.netProfit)}`}
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
            <div className="bg-[#10B981]/05 border border-[#10B981]/20 rounded-2xl p-3">
              <span className="text-[#10B981] text-[9px] font-mono font-bold block">INCOME</span>
              <span className="font-extrabold text-base text-[#14B8A6] mt-0.5 block">৳{profitSummary.totalIncome}</span>
            </div>
            <div className="bg-[#EF4444]/05 border border-[#EF4444]/20 rounded-2xl p-3">
              <span className="text-[#EF4444] text-[9px] font-mono font-bold block">EXPENSE</span>
              <span className="font-extrabold text-base text-[#F43F5E] mt-0.5 block">৳{profitSummary.totalExpense}</span>
            </div>
          </div>
        </section>

        {/* Wallets */}
        <section className="grid grid-cols-3 gap-2.5">
          {Object.entries(wallets).map(([label, val], i) => (
            <div key={i} className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] rounded-2xl py-3 text-center">
              <span className="text-[9px] font-mono font-bold text-[#64748B] tracking-wider uppercase block">{label}</span>
              <span className="text-sm font-black text-white mt-1 block">৳{val}</span>
            </div>
          ))}
        </section>

        {/* Active Fleet */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-mono font-bold text-[#64748B] tracking-widest uppercase px-1">ACTIVE FLEET</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {bikes.map((bike) => (
              <div key={bike._id} className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-2xl py-4 px-2 text-center">
                <span className="text-[9px] font-mono font-black text-[#64748B] block">BIKE {bike.name}</span>
                <p className="text-xs font-extrabold text-[#F1F5F9] mt-2 truncate">{bike.driver}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fleet Settings Panel */}
        {showSettings && (
          <section className="bg-[#0F172A]/90 border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-2">
              <h4 className="text-[10px] font-mono font-bold text-[#94A3B8]">FLEET RE-ASSIGNMENT</h4>
              <button onClick={() => setShowSettings(false)} className="text-[10px] text-[#F43F5E] font-bold">CLOSE</button>
            </div>
            <div className="space-y-2">
              {bikes.map((bike) => (
                <div key={bike._id} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-xl">
                  <span className="text-xs font-mono font-bold text-[#64748B]">Bike {bike.name}</span>
                  <button
                    onClick={() => { setEditingBikeId(bike._id); setNewDriverName(bike.driver); }}
                    className="text-[11px] bg-white/[0.04] border border-white/[0.08] text-white px-3 py-1.5 rounded-lg"
                  >
                    {bike.driver} ✏️
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline Logs */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-mono font-bold text-[#64748B] tracking-widest uppercase px-1">TIMELINE LOGS</h3>
          <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] rounded-[24px] p-5 space-y-4">
            {activities.map((act) => (
              <div key={act.id} className="flex gap-4 relative">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${act.type === 'income' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></span>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold text-[#64748B] block">{act.time}</span>
                  <p className="text-xs text-[#94A3B8] font-medium">{act.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Driver Edit Modal */}
      {editingBikeId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-[#1E293B] border border-white/[0.1] w-full max-w-xs rounded-3xl p-6 shadow-2xl">
            <h4 className="font-bold text-white text-base mb-1">ড্রাইভার পরিবর্তন</h4>
            <input
              type="text"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              className="w-full border border-white/[0.08] bg-white/[0.04] text-white rounded-xl px-4 py-3 text-sm focus:outline-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingBikeId(null)} className="flex-1 py-3 text-xs bg-white/[0.04] rounded-xl text-slate-400">বাতিল</button>
              <button onClick={saveDriverName} className="flex-1 py-3 text-xs bg-[#10B981] text-black rounded-xl">সেভ</button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Input Form Drawer/Modal for Bottom Actions */}
      {activeForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-end justify-center z-50">
          <form onSubmit={handleTransactionSubmit} className="bg-[#0F172A] border-t border-white/[0.1] w-full max-w-md rounded-t-3xl p-6 space-y-4 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <h3 className="text-sm font-bold uppercase font-mono text-white">{activeForm} Entry Form</h3>
              <button type="button" onClick={() => setActiveForm(null)} className="text-xs text-rose-400">Cancel</button>
            </div>

            {/* কমন অ্যামাউন্ট ইনপুট */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#64748B]">AMOUNT (TK)</label>
              <input
                type="number" required
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-[#10B981]"
              />
            </div>

            {/* Rent In ফর্মের জন্য বাইক সিলেক্ট অপশন */}
            {activeForm === 'rent' && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#64748B]">SELECT BIKE</label>
                <select required onChange={(e) => setFormData({ ...formData, bikeId: e.target.value })} className="w-full bg-[#1E293B] border border-white/[0.08] rounded-xl p-3 text-white">
                  <option value="">Choose Bike</option>
                  {bikes.map(b => <option key={b._id} value={b._id}>Bike {b.name} ({b.driver})</option>)}
                </select>
              </div>
            )}

            {/* Expense বা Transfer এর জন্য ওয়ালেট সিলেক্ট অপশন */}
            {activeForm !== 'rent' && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#64748B]">{activeForm === 'transfer' ? 'FROM WALLET' : 'WALLET'}</label>
                <select required onChange={(e) => setFormData({ ...formData, wallet: e.target.value })} className="w-full bg-[#1E293B] border border-white/[0.08] rounded-xl p-3 text-white">
                  <option value="">Choose Wallet</option>
                  <option value="Business">Business</option>
                  <option value="Pocket">Pocket</option>
                  <option value="Drawer">Drawer</option>
                </select>
              </div>
            )}

            {/* Transfer এর জন্য টার্গেট ওয়ালেট */}
            {activeForm === 'transfer' && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#64748B]">TO WALLET</label>
                <select required onChange={(e) => setFormData({ ...formData, toWallet: e.target.value })} className="w-full bg-[#1E293B] border border-white/[0.08] rounded-xl p-3 text-white">
                  <option value="">Choose Wallet</option>
                  <option value="Business">Business</option>
                  <option value="Pocket">Pocket</option>
                  <option value="Drawer">Drawer</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#64748B]">NOTE / DESCRIPTION</label>
              <input
                type="text" onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none"
              />
            </div>

            <button type="submit" className="w-full py-4 bg-[#10B981] hover:bg-[#059669] text-black font-bold rounded-xl shadow-lg transition">
              SUBMIT RECORD
            </button>
          </form>
        </div>
      )}

      {/* Floating Pill Action Bar */}
      <div className="fixed bottom-6 left-4 right-4 z-40">
        <nav className="max-w-md mx-auto bg-[#0D1527]/80 backdrop-blur-2xl text-white rounded-[20px] px-2 py-3.5 shadow-2xl flex justify-between items-center border border-white/[0.06]">
          <button onClick={() => setActiveForm('rent')} className="flex-1 text-center py-0.5 group">
            <span className="block text-[#10B981] text-xs font-bold">●</span>
            <span className="block text-[9px] text-[#64748B] font-mono font-bold mt-1 tracking-widest uppercase">Rent In</span>
          </button>
          <div className="w-px h-5 bg-white/[0.06]"></div>
          <button onClick={() => setActiveForm('expense')} className="flex-1 text-center py-0.5 group">
            <span className="block text-[#EF4444] text-xs font-bold">●</span>
            <span className="block text-[9px] text-[#64748B] font-mono font-bold mt-1 tracking-widest uppercase">Expense</span>
          </button>
          <div className="w-px h-5 bg-white/[0.06]"></div>
          <button onClick={() => setActiveForm('transfer')} className="flex-1 text-center py-0.5 group">
            <span className="block text-[#3B82F6] text-xs font-bold">●</span>
            <span className="block text-[9px] text-[#64748B] font-mono font-bold mt-1 tracking-widest uppercase">Transfer</span>
          </button>
        </nav>
      </div>

    </div>
  );
}