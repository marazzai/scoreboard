"use client";

import { useState } from 'react';

export default function ObsLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch('/api/obs-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (r.ok) {
        window.location.href = '/admin/obs';
      } else {
        setError('Password errata');
      }
    } catch {
      setError('Errore di rete');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary text-primary p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-secondary border border-color rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Accesso Impostazioni OBS</h1>
        <div>
          <label className="block text-sm text-secondary">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" autoFocus />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white">Entra</button>
      </form>
    </div>
  );
}
