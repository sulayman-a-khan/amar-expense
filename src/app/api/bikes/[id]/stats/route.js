import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike, DailyCollection, Expense, DriverDue, DriverDueEntry } from '@/models/models';
import { startOfTodayDhaka } from '@/lib/dateUtils';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'week', 'month', 'year', 'all'

    const bike = await Bike.findById(id);
    if (!bike) return NextResponse.json({ error: 'Bike not found' }, { status: 404 });

    let startDate = startOfTodayDhaka();
    if (period === 'week') {
      startDate.setUTCDate(startDate.getUTCDate() - 7);
    } else if (period === 'month') {
      startDate.setUTCDate(1); // 1st day of the current calendar month
    } else if (period === 'year') {
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
    } else {
      startDate = new Date(0); // 'alltime' / 'all'
    }

    const [collectionsAsc, expenses, driverDue, dueEntries] = await Promise.all([
      DailyCollection.find({ bikeId: id }).sort({ date: 1 }), // ascending, needed to carry the running balance forward correctly
      Expense.find({ bikeId: id }).sort({ date: -1 }),
      DriverDue.findOne({ bikeId: id }),
      DriverDueEntry.find({ bikeId: id }),
    ]);

    // Filter collections and expenses by startDate
    const filteredCollections = collectionsAsc.filter((c) => c.date >= startDate);
    const filteredExpenses = expenses.filter((e) => e.date >= startDate);

    const totalEarning = filteredCollections.reduce((sum, c) => sum + c.paidRent, 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDue = driverDue?.balance || 0; // Lifetime due amount (will not filter)

    const offDaysCount = filteredCollections.filter(
      (c) => c.shift === 'Off Day'
    ).length;

    // Map each DailyCollection -> the DriverDueEntry created from it (if any)
    const entryByCollectionId = {};
    dueEntries.forEach((e) => {
      if (e.dailyCollectionId) entryByCollectionId[e.dailyCollectionId.toString()] = e;
    });

    // Build the [Date | Credit | Due] rows: walk collections oldest-to-newest,
    // carrying forward the running due balance so every day shows the
    // balance as it stood right after that day, even on days where
    // nothing changed (full payment, no shortfall or clearance).
    let runningBalance = 0;
    const earningDetailsAsc = collectionsAsc.map((c) => {
      const matchingEntry = entryByCollectionId[c._id.toString()];
      if (matchingEntry) runningBalance = matchingEntry.balanceAfter;
      return {
        _id: c._id,
        date: c.date,
        shift: c.shift,
        credit: c.paidRent,
        due: runningBalance,
      };
    });

    // Filter list items by startDate
    const earningDetails = [...earningDetailsAsc]
      .filter((row) => row.date >= startDate)
      .reverse(); // newest first for display

    const offDays = collectionsAsc
      .filter((c) => c.shift === 'Off Day' && c.date >= startDate)
      .map((c) => ({ _id: c._id, date: c.date, reason: c.offDayReason }))
      .reverse();

    const expenseList = expenses
      .filter((e) => e.date >= startDate)
      .map((e) => ({
        _id: e._id,
        date: e.date,
        amount: e.amount,
        category: e.category,
        note: e.note,
        isCredit: e.isCredit,
        payableToShop: e.payableToShop,
      }));

    return NextResponse.json({
      bike: { _id: bike._id, name: bike.name, driver: bike.driverName, dailyRent: bike.dailyRent },
      stats: {
        totalEarning,
        totalExpense,
        totalDue,
        offDaysCount,
      },
      earningDetails,
      offDays,
      expenses: expenseList,
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
