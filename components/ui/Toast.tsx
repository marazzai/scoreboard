"use client";

import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }: { message: string; type?: 'info'|'success'|'error'; onClose?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose && onClose(), 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-gray-800';

  return (
    <div className={`${bg} text-white px-4 py-2 rounded`}>{message}</div>
  );
}
