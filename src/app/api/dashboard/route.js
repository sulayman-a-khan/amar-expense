import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Wallet, Bike, DailyCollection, Expense, WalletTransfer } from '@/models/model'; // আপনার ফাইলের পাথ অনুযায়ী চেক করবেন

export async function GET() {
  try {
    await connectToDatabase();

    // ১. ডিফল্ট ৩টি বাইক ডাটাবেজে না থাকলে পুশ করার ইন্টেলিজেন্ট চেক
    let bikes = await Bike.find({});
    if (bikes.length === 0) {
      bikes = await Bike.create([
        { name: 'Bike 01', driverName: 'রহিম মিয়া', dailyRent: 500 },
        { name: 'Bike 02', driverName: 'করিম আলী', dailyRent: 500 },
        { name: 'Bike 03', driverName: 'সফিজ উদ্দিন', dailyRent: 500 },
      ]);
    }

    // ২. ডিফল্ট ওয়ালেট ব্যালেন্স চেক ও তৈরি
    let businessWallet = await Wallet.findOne({ name: 'Business' });
    if (!businessWallet) await Wallet.create({ name: 'Business', balance: 12400 });
    let pocketWallet = await Wallet.findOne({ name: 'Pocket' });
    if (!pocketWallet) await Wallet.create({ name: 'Pocket', balance: 1200 });
    let drawerWallet = await Wallet.findOne({ name: 'Drawer' });
    if (!drawerWallet) await Wallet.create({ name: 'Drawer', balance: 25000 });

    const allWallets = await Wallet.find({});
    const walletsObj = {};
    allWallets.forEach(w => { walletsObj[w.name] = w.balance; });

    // ৩. আজকের ট্রানজেকশন ফিল্টার (Timezone Independent)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCollections = await DailyCollection.find({ createdAt: { $gte: startOfDay } }).populate('bikeId');
    const todayExpenses = await Expense.find({ createdAt: { $gte: startOfDay } });

    let totalIncome = 0;
    todayCollections.forEach(c => { totalIncome += c.paidRent; });

    let totalExpense = 0;
    todayExpenses.forEach(e => { totalExpense += e.amount; });

    const netProfit = totalIncome - totalExpense;

    // ৪. আপনার রিয়েল ডাটা থেকে টাইমলাইন লগ জেনারেশন
    const activities = [];

    todayCollections.forEach(c => {
      activities.push({
        id: c._id,
        time: new Date(c.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'income',
        text: `Bike ${c.bikeId?.name || ''} (${c.shift}): ৳${c.paidRent} Rent In.`
      });
    });

    todayExpenses.forEach(e => {
      activities.push({
        id: e._id,
        time: new Date(e.createdAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        type: 'expense',
        text: `Expense [${e.category}]: ৳${e.amount} from ${e.wallet}. ${e.note ? `(${e.note})` : ''}`
      });
    });

    // সর্টিং (সর্বশেষ অ্যাক্টিভিটি সবার ওপরে)
    activities.sort((a, b) => b.time.localeCompare(a.time));

    return NextResponse.json({
      wallets: walletsObj,
      summary: { netProfit, totalIncome, totalExpense },
      bikes: bikes.map(b => ({ _id: b._id, name: b.name.replace('Bike ', ''), driver: b.driverName })),
      activities: activities.slice(0, 10)
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}