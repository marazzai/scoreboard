import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
// Public mode: no auth checks
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const list = await prisma.checkList.findUnique({ where: { id: Number(id) }, include: { author: true } });
  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(list);
}
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const { title, content } = body;

  try {
    const updated = await prisma.checkList.update({ where: { id: Number(id) }, data: { ...(title !== undefined ? { title } : {}), ...(content !== undefined ? { content } : {}) } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.checkList.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
