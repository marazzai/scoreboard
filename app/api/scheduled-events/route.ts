import { NextResponse } from 'next/server';
import { listScheduledEvents } from '@/src/lib/icalScheduler';

export async function GET() {
  // auth removed: public API
  // previously required session; now public

  const list = await listScheduledEvents(200);
  return NextResponse.json({ events: list });
}
