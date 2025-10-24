import TicketList from '@/components/tickets/TicketList';
// prisma unused here — removed to satisfy lint

export const metadata = { title: 'Dashboard - Tickets' };

export default async function Page() {
  return (
    <div className="p-8">
      <TicketList />
    </div>
  );
}
