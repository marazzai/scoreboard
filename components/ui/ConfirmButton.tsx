"use client";

import React, { useEffect, useState } from 'react';
import Button from './Button';

export default function ConfirmButton({ onConfirm, children, className }: { onConfirm: () => void; children: React.ReactNode; className?: string }) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const id = setTimeout(() => setPending(false), 5000);
    return () => clearTimeout(id);
  }, [pending]);

  function handleClick() {
    if (!pending) {
      setPending(true);
      return;
    }
    setPending(false);
    onConfirm();
  }

  return (
    <Button className={className} style={pending ? { backgroundColor: '#ff8c00' } : undefined} onClick={handleClick}>
      {pending ? 'Conferma?' : children}
    </Button>
  );
}
