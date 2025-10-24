import { NextResponse } from 'next/server';
// auth removed: public API

export async function GET() {
  // previously required Admin session; now public
  // return obsController's connected state
  const obsController = (await import('@/src/lib/obs')).default;
  const connected = Boolean(obsController.isConnected?.());
  return NextResponse.json({ connected });
}
