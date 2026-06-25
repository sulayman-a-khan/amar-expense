import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike, DailyCollection, Expense, Loan } from '@/models/models';

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // 'week', 'month', 'year', 'all'

    const bike = await Bike.findById(id);
    if (!bike) return NextResponse.json({ error: 'Bike not found' }, { status: 404 });

    // Calculate the start date for the "off days" filter
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate = new Date(0); // 'all'

    // Off days count
    const offDaysCount = await DailyCollection.countDocuments({
      bikeId: id,
      shift: 'Off Day',
      date: { $gte: startDate }
    });

    // Rent History (All time)
    const collections = await DailyCollection.find({ bikeId: id }).sort({ date: -1 });
    const totalEarning = collections.reduce((sum, c) => sum + c.paidRent, 0);

    // Expenses (All time)
    const expenses = await Expense.find({ bikeId: id }).sort({ date: -1 });
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Due History (Loans for this driver)
    const dueHistory = await Loan.find({ person: bike.driverName }).sort({ date: -1 });

    return NextResponse.json({
      bike,
      stats: {
        totalEarning,
        totalExpense,
        offDaysCount
      },
      history: {
        collections,
        expenses,
        dueHistory
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
