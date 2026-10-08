import { NextRequest, NextResponse } from 'next/server';
import { expectedAuthToken } from '@/lib/auth-token';

const APP_PASSWORD = process.env.APP_PASSWORD;

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (APP_PASSWORD && password === APP_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('cognition-auth', (await expectedAuthToken()) as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
