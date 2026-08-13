'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRentCycleRange, startOfTodayDhaka } from '@/lib/dateUtils';
import MonthlyRentCountdown from './MonthlyRentCountdown';

const SHOP_STATUS_STYLE = {
  Completed: 'text-[#5DE88A]',
  Pending: 'text-[#FF6B5B]',
  Advance: 'text-[#8FC2E8]',
};

function daysRemainingInCycle(year, month) {
  const { end } = getRentCycleRange(year, month);
  const today = startOfTodayDhaka();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / msPerDay));
}

export default function MonthlyIncomeGrid({ monthlyBikes, onEditBike, onViewBike }) {
  const router = useRouter();
  const [shopRecord, setShopRecord] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shop-rent')
      .then((res) => res.json())
      .then((data) => setShopRecord(data.record || null))
      .catch(() => {})
      .finally(() => setShopLoading(false));
  }, []);

  const totalItems = 1 + (monthlyBikes?.length || 0); // 1 for Shop Rent + N monthly bikes
  const gridColsClass = totalItems === 1
    ? 'grid-cols-1'
    : totalItems === 2
      ? 'grid-cols-2'
      : totalItems === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4';

  const daysLeftShop = shopRecord ? daysRemainingInCycle(shopRecord.year, shopRecord.month) : null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span
          style={{ background: 'rgba(138,109,34,0.15)', color: '#8A6D22' }}
          className="inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest"
        >
          📅 Monthly Income
        </span>
        <span className="text-[10px] font-bold text-[#7D7156]">
          {totalItems} item{totalItems !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={`grid ${gridColsClass} gap-2.5`}>
        {/* Card 1: Shop Rent (Same box size & height as bike cards, no icon) */}
        {(() => {
          const isShopPaid = shopRecord && shopRecord.remainingBalance <= 0;
          return (
            <div className="relative group">
              <button
                onClick={() => router.push('/shop-rent')}
                style={
                  isShopPaid
                    ? {
                        background: 'linear-gradient(150deg, #163524 0%, #0e2318 60%, #0a1d10 100%)',
                        boxShadow: '0 8px 20px rgba(15,40,25,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                      }
                    : {
                        background: 'linear-gradient(150deg, #1E293B 0%, #0F172A 60%, #020617 100%)',
                        boxShadow: '0 8px 20px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                      }
                }
                className="w-full h-[104px] rounded-2xl p-2.5 active:scale-[0.97] transition-transform flex flex-col items-center justify-center text-center relative overflow-hidden"
              >
                {/* Glow */}
                <div
                  style={{
                    background: isShopPaid
                      ? 'radial-gradient(circle, rgba(52,199,89,0.22) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)',
                    width: 90, height: 90, top: -30, right: -30,
                  }}
                  className="absolute rounded-full pointer-events-none"
                />

                {/* Paid Badge indicator */}
                {isShopPaid && (
                  <div
                    style={{ background: 'rgba(52,199,89,0.25)', border: '1px solid rgba(52,199,89,0.4)' }}
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10"
                  >
                    <span className="text-[9px] font-black text-white leading-none">✓</span>
                  </div>
                )}

                <p className="relative w-full text-[11px] font-extrabold text-white leading-tight truncate">
                  Shop Rent
                </p>

                {shopLoading ? (
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="relative text-[10px] font-bold mt-1">
                    Loading...
                  </p>
                ) : shopRecord ? (
                  shopRecord.remainingBalance > 0 ? (
                    <p style={{ color: '#FFB84D' }} className="relative text-[10px] font-bold mt-1 animate-pulse">
                      ৳{shopRecord.remainingBalance.toLocaleString('en-IN')} due
                    </p>
                  ) : shopRecord.remainingBalance < 0 ? (
                    <p style={{ color: '#8FC2E8' }} className="relative text-[10px] font-bold mt-1">
                      ৳{Math.abs(shopRecord.remainingBalance).toLocaleString('en-IN')} adv
                    </p>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.85)' }} className="relative text-[10px] font-bold mt-1">
                      Paid ✓
                    </p>
                  )
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="relative text-[10px] font-semibold mt-1">
                    Not started
                  </p>
                )}

                {!isShopPaid && daysLeftShop !== null && (
                  <span
                    style={{
                      color: daysLeftShop <= 1 ? '#FF6B5B' : daysLeftShop <= 3 ? '#FFB84D' : 'rgba(255,255,255,0.6)',
                    }}
                    className="relative text-[9px] font-bold mt-0.5 block truncate"
                  >
                    {daysLeftShop === 0 ? 'Due today' : `${daysLeftShop} days left`}
                  </span>
                )}
              </button>
            </div>
          );
        })()}

        {/* Monthly Bike Cards (Same box size & height) */}
        {monthlyBikes?.map((bike) => {
          const isPaid = bike.monthlyStatus?.status === 'Paid';
          const isPartial = bike.monthlyStatus?.status === 'Partial' || (bike.monthlyStatus?.totalReceived > 0 && bike.monthlyStatus?.remainingBalance > 0);
          const isOverdue = bike.monthlyStatus?.status === 'Overdue';

          const remainingDue = bike.monthlyStatus?.remainingBalance ?? Math.max(0, (bike.monthlyRentAmount || 9000) - (bike.monthlyStatus?.totalReceived || 0));

          const cardStyle = isPaid
            ? {
                background: 'linear-gradient(150deg, #163524 0%, #0e2318 60%, #0a1d10 100%)',
                boxShadow: '0 8px 20px rgba(15,40,25,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
              }
            : {
                background: 'linear-gradient(150deg, #1E293B 0%, #0F172A 60%, #020617 100%)',
                boxShadow: '0 8px 20px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
              };

          return (
            <div key={bike._id} className="relative group">
              <button
                onClick={() => onViewBike && onViewBike(bike)}
                style={cardStyle}
                className={`w-full h-[104px] rounded-2xl py-2.5 px-2 active:scale-[0.97] transition-transform flex ${
                  bike.driverImage ? 'flex-row items-center justify-center text-left gap-2' : 'flex-col items-center justify-center text-center'
                } relative overflow-hidden`}
              >


                {/* Glow */}
                <div
                  style={{
                    background: isPaid
                      ? 'radial-gradient(circle, rgba(52,199,89,0.22) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)',
                    width: 90, height: 90, top: -30, right: -30,
                  }}
                  className="absolute rounded-full pointer-events-none"
                />

                {/* Paid Badge indicator */}
                {isPaid && (
                  <div
                    style={{ background: 'rgba(52,199,89,0.25)', border: '1px solid rgba(52,199,89,0.4)' }}
                    className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center z-10"
                  >
                    <span className="text-[9px] font-black text-white leading-none">✓</span>
                  </div>
                )}

                {bike.driverImage ? (
                  <img
                    src={bike.driverImage}
                    alt={bike.driver}
                    className="relative w-10 h-10 rounded-full object-cover shrink-0"
                    style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }}
                  />
                ) : null}

                <div className={bike.driverImage ? 'relative min-w-0' : 'contents'}>
                  <p className="relative w-full text-[11px] font-extrabold text-white leading-tight truncate">
                    {bike.driver}
                  </p>

                  {isPaid ? (
                    <p style={{ color: 'rgba(255,255,255,0.85)' }} className="relative text-[10px] font-bold mt-1">
                      Paid ✓ ৳{bike.monthlyRentAmount}
                    </p>
                  ) : isPartial ? (
                    <p style={{ color: '#FFB84D' }} className="relative text-[10px] font-bold mt-1 animate-pulse">
                      ৳{remainingDue.toLocaleString('en-IN')} due
                    </p>
                  ) : isOverdue ? (
                    <p style={{ color: '#FF6B5B' }} className="relative text-[10px] font-bold mt-1 animate-pulse">
                      Overdue
                    </p>
                  ) : (
                    <MonthlyRentCountdown deadline={bike.monthlyStatus?.deadlineDate} />
                  )}
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onEditBike(bike); }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
