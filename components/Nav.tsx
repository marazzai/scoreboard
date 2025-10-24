"use client";
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();
  // Hide navigation entirely on admin scoreboard to prevent navigation away
  if (pathname && pathname.startsWith('/admin/scoreboard')) {
    return null;
  }
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Login' },
    { href: '/admin/scoreboard', label: 'Admin Scoreboard' },
    { href: '/admin/music', label: 'Admin Music' },
    { href: '/dashboard/tickets', label: 'Tickets' },
    { href: '/display/scoreboard', label: 'Display Scoreboard' },
    { href: '/display/music', label: 'Display Music' },
    { href: '/api/scheduled-events', label: 'Scheduled Events' }
  ];

  return (
    <>
      <nav className="bg-secondary border-b border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-6">
              <div className="text-lg font-semibold">PalaApp</div>
              <div className="hidden md:flex items-center space-x-4">
                {links.map((l) => (
                  <Link key={l.href} href={l.href} className="text-text-secondary hover:text-primary">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="md:hidden">
              <button
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className="p-2 rounded-md text-text-secondary hover:text-primary"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-secondary p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold">Menu</div>
              <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2">✕</button>
            </div>
            <div className="space-y-3">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-text-secondary hover:text-primary">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
