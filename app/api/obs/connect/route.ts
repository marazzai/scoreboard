import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import obsController from '@/src/lib/obs';
// auth removed: public API

export async function POST() {
  // previously required session; now public

  const settings = await prisma.obsSetting.findFirst();
  if (!settings) return NextResponse.json({ error: 'No settings' }, { status: 400 });

  const ok = await obsController.connectOBS({ host: settings.host, port: settings.port, password: settings.password ?? undefined });
  return NextResponse.json({ connected: ok });
}
