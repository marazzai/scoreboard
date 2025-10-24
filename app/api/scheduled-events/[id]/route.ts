import { NextResponse } from 'next/server';
// auth removed: public API
import { cancelScheduledEvent, forceTriggerScheduledEvent } from '@/src/lib/icalScheduler';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // previously required session; now public

  const { id } = await params;
  const ok = await cancelScheduledEvent(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // POST will force trigger immediately
  // previously required session; now public
  const { id } = await params;
  const ok = await forceTriggerScheduledEvent(id);
  if (!ok) return NextResponse.json({ error: 'Not found or failed' }, { status: 400 });
  return NextResponse.json({ success: true });
}
