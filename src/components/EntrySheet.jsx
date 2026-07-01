'use client';

import { useState } from 'react';
import ImageUploader from './ImageUploader';
import { todayDhakaDateString } from '@/lib/dateUtils';

const WALLETS = ['Pocket', 'Drawer'];
const today = () => todayDhakaDateString();

const TITLES = {
  rent: 'Bike Rent Collection',
  income: 'Log Income',
  expense: 'Log Expense',
  transfer: 'Wallet Transfer',
  loan: 'Loan / Liability',
};

export default function EntrySheet({ type, bikes, walletBalances = {}, onClose, onReviewSubmit }) {
  const [form, setForm] = useState({ date: today() });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (!type) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    let payload = form;

    if (type === 'rent') {
      const activeBike = bikes?.find((b) => b._id === form.bikeId);
      const shift = form.shift || 'Full Day';
      const expected = activeBike
        ? shift === 'Half Day' ? activeBike.dailyRent * 0.5 : shift === 'Off Day' ? 0 : activeBike.dailyRent
        : 0;
      payload = {
        ...form,
        shift,
        paidRent: shift === 'Off Day' ? 0 : (form.paidRent === '' || form.paidRent == null ? expected : form.paidRent),
      };
    }

    onReviewSubmit(type, payload);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#FFFDF8] rounded-t-[28px] p-6 pb-8 shadow-2xl animate-slide-up max-h-[88vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center border-b border-[#E3D9C2] pb-3 mb-4">
          <h3 className="text-base font-bold text-[#2B2620]">{TITLES[type]}</h3>
          <button type="button" onClick={onClose} className="text-xs font-bold text-[#B33B2E] px-2 py-1">
            Cancel
          </button>
        </div>

        {type === 'rent' && <RentForm form={form} set={set} bikes={bikes} />}
        {type === 'income' && <IncomeForm form={form} set={set} />}
        {type === 'expense' && <ExpenseForm form={form} set={set} bikes={bikes} />}
        {type === 'transfer' && <TransferForm form={form} set={set} walletBalances={walletBalances} />}
        {type === 'loan' && <LoanForm form={form} set={set} />}

        <button
          type="submit"
          className="w-full mt-5 py-3.5 bg-[#2B2620] text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-transform"
        >
          Review Entry
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-[#6B5F4F] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full p-3 text-sm bg-[#F7F3EA] border border-[#E3D9C2] rounded-xl focus:outline-none focus:border-[#2B2620] text-[#2B2620]";

function RentForm({ form, set, bikes }) {
  const shift = form.shift || 'Full Day';
  const activeBike = bikes?.find((b) => b._id === form.bikeId);
  const isShajahan = activeBike?.isShajahanKaka;
  const expected = activeBike
    ? shift === 'Half Day' ? activeBike.dailyRent * 0.5 : shift === 'Off Day' ? 0 : activeBike.dailyRent
    : 0;

  return (
    <div className="space-y-4">
      <Field label="Select Vehicle / Driver">
        <select
          required
          value={form.bikeId || ''}
          onChange={(e) => {
            const selectedId = e.target.value;
            set('bikeId', selectedId);
            const selBike = bikes?.find(b => b._id === selectedId);
            if (selBike?.isShajahanKaka && shift === 'Half Day') {
              set('shift', 'Full Day');
            }
          }}
          className={inputCls}
        >
          <option value="">Choose bike</option>
          {bikes?.filter(b => !b.isShajahanKaka).map((b) => (
            <option key={b._id} value={b._id}>
              {`Bike ${b.name} — ${b.driver}`}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date">
        <input type="date" required max={today()} value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
      </Field>

      <Field label="Shift">
        <div className={`grid ${isShajahan ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5 bg-[#F7F3EA] p-1 rounded-xl`}>
          {['Full Day', 'Half Day', 'Off Day']
            .filter((s) => !(isShajahan && s === 'Half Day'))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('shift', s)}
                className={`py-2.5 text-xs font-bold rounded-lg transition-colors ${
                  shift === s ? 'bg-[#1F7A4D] text-white' : 'text-[#6B5F4F]'
                }`}
              >
                {s}
              </button>
            ))}
        </div>
      </Field>

      {shift === 'Off Day' ? (
        <Field label="Reason for Off-Day">
          <select required value={form.offDayReason || 'Driver Unavailable'} onChange={(e) => set('offDayReason', e.target.value)} className={inputCls}>
            <option value="Driver Unavailable">Driver Unavailable</option>
            <option value="Mechanical Issue">Mechanical Issue</option>
            <option value="Police/Others">Police/Others</option>
          </select>
        </Field>
      ) : (
        <Field label={`Rent Paid (৳) — Expected: ৳${expected}`}>
          <input
            type="number" min="0" placeholder={`Leave blank for ৳${expected}`}
            value={form.paidRent || ''} onChange={(e) => set('paidRent', e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}

function IncomeForm({ form, set }) {
  return (
    <div className="space-y-4">
      <Field label="Income Type">
        <div className="grid grid-cols-2 gap-1.5 bg-[#F7F3EA] p-1 rounded-xl">
          {['Daily', 'Irregular'].map((t) => (
            <button
              key={t} type="button" onClick={() => set('type', t)}
              className={`py-2.5 text-[11px] font-bold rounded-lg transition-colors ${
                form.type === t ? 'bg-[#1F7A4D] text-white' : 'text-[#6B5F4F]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Source Name">
        <input type="text" required placeholder="e.g. Tea Stall Sale, Extra Job" value={form.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Amount (৳)">
        <input type="number" required min="0" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Receive Into">
        <select required value={form.wallet || ''} onChange={(e) => set('wallet', e.target.value)} className={inputCls}>
          <option value="">Choose wallet</option>
          {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" max={today()} value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
      </Field>
    </div>
  );
}

function ExpenseForm({ form, set, bikes }) {
  const isCredit = !!form.isCredit;
  return (
    <div className="space-y-4">
      <Field label="Category">
        <input type="text" required placeholder="e.g. Fuel, Parts, Food" value={form.category || ''} onChange={(e) => set('category', e.target.value)} className={inputCls} />
      </Field>
      
      <Field label="Related Bike (Optional)">
        <select value={form.bikeId || ''} onChange={(e) => set('bikeId', e.target.value)} className={inputCls}>
          <option value="">None</option>
          {bikes?.map((b) => (
            <option key={b._id} value={b._id}>Bike {b.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Amount (৳)">
        <input type="number" required min="0" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
      </Field>

      <div className="flex items-center justify-between bg-[#F7E9E5] border border-[#E3C2B8] rounded-xl p-3.5">
        <div>
          <span className="text-sm font-bold text-[#2B2620] block">Is Credit / Due?</span>
          <span className="text-[11px] text-[#6B5F4F]">Won&apos;t deduct cash now — logs as Payable</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !isCredit;
            set('isCredit', next);
            if (next) set('wallet', '');
            else set('payableToShop', '');
          }}
          className={`w-12 h-7 rounded-full p-1 transition-colors ${isCredit ? 'bg-[#B33B2E]' : 'bg-[#E3D9C2]'}`}
        >
          <span className={`block w-5 h-5 bg-[#FFFDF8] rounded-full shadow transition-transform ${isCredit ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {isCredit ? (
        <Field label="Owed To (Shop / Mechanic)">
          <input type="text" required placeholder="e.g. Karim Motors" value={form.payableToShop || ''} onChange={(e) => set('payableToShop', e.target.value)} className={inputCls} />
        </Field>
      ) : (
        <Field label="Pay From Wallet">
          <select required value={form.wallet || ''} onChange={(e) => set('wallet', e.target.value)} className={inputCls}>
            <option value="">Choose wallet</option>
            {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      )}

      <ImageUploader value={form.imageUrl || ''} onChange={(url) => set('imageUrl', url)} />

      <Field label="Note (optional)">
        <input type="text" value={form.note || ''} onChange={(e) => set('note', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Date">
        <input type="date" max={today()} value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
      </Field>
    </div>
  );
}

function TransferForm({ form, set, walletBalances = {} }) {
  const pocket = walletBalances.Pocket ?? 0;
  const drawer = walletBalances.Drawer ?? 0;

  return (
    <div className="space-y-4">
      {/* Wallet balances display */}
      <div className="grid grid-cols-2 gap-2">
        <div
          style={{
            background: 'linear-gradient(135deg, #163524 0%, #0e2318 100%)',
            border: '1px solid rgba(93,232,138,0.2)',
          }}
          className="rounded-2xl px-3.5 py-2.5"
        >
          <span style={{ color: 'rgba(93,232,138,0.6)', letterSpacing: '0.1em' }} className="text-[9px] font-bold uppercase block">Pocket</span>
          <span style={{ color: '#fff' }} className="text-sm font-extrabold block mt-0.5">৳{pocket.toLocaleString('en-IN')}</span>
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #163524 0%, #0e2318 100%)',
            border: '1px solid rgba(93,232,138,0.2)',
          }}
          className="rounded-2xl px-3.5 py-2.5"
        >
          <span style={{ color: 'rgba(93,232,138,0.6)', letterSpacing: '0.1em' }} className="text-[9px] font-bold uppercase block">Drawer</span>
          <span style={{ color: '#fff' }} className="text-sm font-extrabold block mt-0.5">৳{drawer.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <Field label="From Wallet">
        <select
          required value={form.fromWallet || ''}
          onChange={(e) => {
            set('fromWallet', e.target.value);
            if (e.target.value === form.toWallet) set('toWallet', '');
          }}
          className={inputCls}
        >
          <option value="">Choose wallet</option>
          {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="To Wallet">
        <select required value={form.toWallet || ''} onChange={(e) => set('toWallet', e.target.value)} className={inputCls}>
          <option value="">Choose wallet</option>
          {WALLETS.filter((w) => w !== form.fromWallet).map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="Amount (৳)">
        <input type="number" required min="0" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
      </Field>
    </div>
  );
}

function LoanForm({ form, set }) {
  const type = form.type || 'Receivable';
  return (
    <div className="space-y-4">
      <Field label="Loan Direction">
        <div className="grid grid-cols-2 gap-1.5 bg-[#F7F3EA] p-1 rounded-xl">
          <button
            type="button" onClick={() => set('type', 'Receivable')}
            className={`py-2.5 text-xs font-bold rounded-lg transition-colors ${type === 'Receivable' ? 'bg-[#2E5C8A] text-white' : 'text-[#6B5F4F]'}`}
          >
            Given (Receivable)
          </button>
          <button
            type="button" onClick={() => set('type', 'Payable')}
            className={`py-2.5 text-xs font-bold rounded-lg transition-colors ${type === 'Payable' ? 'bg-[#2E5C8A] text-white' : 'text-[#6B5F4F]'}`}
          >
            Taken (Payable)
          </button>
        </div>
      </Field>
      <Field label="Person">
        <input type="text" required placeholder="e.g. Driver name, Mechanic" value={form.person || ''} onChange={(e) => set('person', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Amount (৳)">
        <input type="number" required min="0" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
      </Field>
      <Field label="Date">
        <input type="date" required max={today()} value={form.date || today()} onChange={(e) => set('date', e.target.value)} className={inputCls} />
      </Field>
      <Field label={type === 'Receivable' ? 'Pay Out From Wallet' : 'Receive Into Wallet'}>
        <select required value={form.wallet || ''} onChange={(e) => set('wallet', e.target.value)} className={inputCls}>
          <option value="">Choose wallet</option>
          {WALLETS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Field>
      <Field label="Note (optional)">
        <input type="text" value={form.note || ''} onChange={(e) => set('note', e.target.value)} className={inputCls} />
      </Field>
    </div>
  );
}
