import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import { errorToString } from '@/src/lib/errorUtils';

export async function GET() {
  // auth removed: public API
  const setting = await prisma.obsSetting.findFirst();
  return NextResponse.json({ setting });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { host, port, password } = body;

  try {
    const upsert = await prisma.obsSetting.upsert({ where: { id: 1 }, update: { host, port, password }, create: { host, port, password } });
    return NextResponse.json({ setting: upsert });
  } catch (e: unknown) {
    const msg = errorToString(e);
    console.error('obs settings save error', msg);
    return NextResponse.json({ error: 'Failed to save settings', details: msg }, { status: 500 });
  }
}
