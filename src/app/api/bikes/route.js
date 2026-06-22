import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Bike } from '@/models/model';

export async function PUT(request) {
  try {
    await connectToDatabase();
    const { id, driver } = await request.json();

    // আপনার স্কিমার 'driverName' ফিল্ডটি আপডেট করবে
    await Bike.findByIdAndUpdate(id, { driverName: driver });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}