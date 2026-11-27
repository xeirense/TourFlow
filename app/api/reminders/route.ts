import { NextRequest, NextResponse } from 'next/server';

// GET /api/reminders — alias for /api/reminders/today (backwards compat)
export async function GET(request: NextRequest) {
  const url = new URL('/api/reminders/today', request.url);
  return NextResponse.redirect(url, { status: 307 });
}
