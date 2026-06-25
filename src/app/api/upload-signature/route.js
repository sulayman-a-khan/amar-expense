import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// GET: returns a signature + timestamp the client uses to upload directly
// to Cloudinary (bypassing our server for the actual file bytes).
export async function GET() {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'amar_hishab/expenses';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      timestamp,
      signature,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
