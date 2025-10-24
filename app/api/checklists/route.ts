import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
export async function GET() {
  const lists = await prisma.checkList.findMany({ include: { author: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(lists);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, content } = body;
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = await prisma.checkList.create({ data: { title, content: content ?? '' } as any });
    return NextResponse.json(list, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}
