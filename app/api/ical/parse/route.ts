import { NextResponse } from 'next/server';
import { scheduleFromICS } from '@/src/lib/icalScheduler';
import { errorToString } from '@/src/lib/errorUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ics } = body;
    if (!ics) return NextResponse.json({ error: 'ics required' }, { status: 400 });

    const scheduled = scheduleFromICS(ics, 24);
    return NextResponse.json({ scheduled });
  } catch (e: unknown) {
    const msg = errorToString(e);
    console.error('ical parse error', msg);
    return NextResponse.json({ error: 'Failed to parse ics', details: msg }, { status: 500 });
  }
}
