import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
// Public mode: no auth checks
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(id) },
    include: { author: true, assignedTo: true }
  });

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const { title, description, status, priority, assignedToId } = body;

  // Validate enums
  const validStatuses = ['APERTO', 'IN_CORSO', 'CHIUSO'];
  const validPriorities = ['BASSA', 'MEDIA', 'ALTA'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

  try {
    const ticket = await prisma.ticket.update({ where: { id: Number(id) }, data: updateData });
    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.ticket.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
