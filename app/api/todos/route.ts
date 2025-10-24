import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
export async function GET() {
  const todos = await prisma.todoItem.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, completed } = body;
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todo = await prisma.todoItem.create({ data: { title, completed: !!completed } as any });
    return NextResponse.json(todo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}
