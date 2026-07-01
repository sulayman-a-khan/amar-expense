import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DriverDue, DriverDueEntry, Bike } from '@/models/models';

// GET /api/driver-dues -> list every bike's current due balance (only > 0 by default)
// GET /api/driver-dues?bikeId=... -> that bike's due balance + full entry history
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const bikeId = searchParams.get('bikeId');
    const includeZero = searchParams.get('all') === 'true';

    if (bikeId) {
      const due = await DriverDue.findOne({ bikeId });
      const entries = await DriverDueEntry.find({ bikeId }).sort({ createdAt: -1 }).limit(100);
      const bike = await Bike.findById(bikeId);
      return NextResponse.json({
        due: due ? { bikeId, balance: due.balance, updatedAt: due.updatedAt } : { bikeId, balance: 0 },
        bike: bike ? { _id: bike._id, name: bike.name, driver: bike.driverName } : null,
        entries,
      });
    }

    const dues = await DriverDue.find(includeZero ? {} : { balance: { $gt: 0 } }).sort({ balance: -1 });
    const bikeIds = dues.map((d) => d.bikeId);
    const bikes = await Bike.find({ _id: { $in: bikeIds } });
    const bikeMap = {};
    bikes.forEach((b) => { bikeMap[b._id.toString()] = b; });

    const result = dues.map((d) => {
      const bike = bikeMap[d.bikeId.toString()];
      return {
        bikeId: d.bikeId,
        balance: d.balance,
        updatedAt: d.updatedAt,
        bikeName: bike?.name || '?',
        driverName: bike?.driverName || 'Unknown',
        dailyRent: bike?.dailyRent || 0,
        isShajahanKaka: bike?.isShajahanKaka || false,
      };
    });

    const totalDue = result.reduce((sum, r) => sum + r.balance, 0);

    return NextResponse.json({ dues: result, totalDue });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
