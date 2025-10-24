import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';

// GET: return all tickets
export async function GET() {
  const tickets = await prisma.ticket.findMany({ include: { author: true, assignedTo: true } });
  return NextResponse.json(tickets);
}

// POST: create a ticket (author from session)
export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, priority } = body;
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const data = {
    title,
    description: description ?? null,
    priority: priority ?? 'MEDIA'
  } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = await prisma.ticket.create({ data: data as any });
  return NextResponse.json(ticket, { status: 201 });
}
