import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
// No auth in public mode

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const todo = await prisma.todoItem.findUnique({ where: { id: Number(id) }, include: { user: true } });
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(todo);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const { title, completed } = body;

  try {
    const todo = await prisma.todoItem.update({ where: { id: Number(id) }, data: { ...(title !== undefined ? { title } : {}), ...(completed !== undefined ? { completed } : {}) } });
    return NextResponse.json(todo);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.todoItem.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
