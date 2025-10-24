"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

type Ticket = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  createdAt: string;
  author?: { id: string; name?: string | null } | null;
};

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      } else {
        console.error('Failed to fetch tickets', await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTickets(); }, []);

  async function createTicket() {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      if (res.ok) {
        setOpen(false);
        setTitle('');
        setDescription('');
        fetchTickets();
      } else {
        console.error('Create failed', await res.text());
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Tickets</h2>
        <Button variant="primary" onClick={() => setOpen(true)}>Pulsante Primario</Button>
      </div>

      {loading && <div>Loading...</div>}

      <div className="grid gap-4">
        {tickets.map(t => (
          <Card key={t.id}>
            <div className="p-4">
              <h3 className="text-lg font-medium">{t.title}</h3>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-2 text-xs text-gray-500">{t.status} • {t.priority}</div>
            </div>
          </Card>
        ))}
      </div>

  <Modal isOpen={open} onClose={() => setOpen(false)} title="Crea Ticket">
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm font-medium">Titolo</div>
            <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>
          <label className="block">
            <div className="text-sm font-medium">Descrizione</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="primary" onClick={createTicket}>Crea</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
