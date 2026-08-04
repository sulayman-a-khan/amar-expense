import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// Folders Cloudinary uploads are allowed to land in. Restricted to a known
// list so the `folder` query param can't be used to write anywhere.
const ALLOWED_FOLDERS = {
  expenses: 'amar_hishab/expenses',
  drivers: 'amar_hishab/drivers',
};

// GET: returns a signature + timestamp the client uses to upload directly
// to Cloudinary (bypassing our server for the actual file bytes).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderKey = searchParams.get('folder');
    const timestamp = Math.round(Date.now() / 1000);
    const folder = ALLOWED_FOLDERS[folderKey] || ALLOWED_FOLDERS.expenses;

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
