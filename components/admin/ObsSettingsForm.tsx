"use client";

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';

export default function ObsSettingsForm() {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(4455);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  async function load() {
    const res = await fetch('/api/obs/settings');
    if (res.ok) {
      const data = await res.json();
      const s = data.setting;
      if (s) { setHost(s.host); setPort(s.port); setPassword(s.password ?? ''); }
    }
    const st = await fetch('/api/obs/status');
    if (st.ok) {
      const j = await st.json();
      setStatus(j.connected ? 'connected' : 'disconnected');
    }
  }

  useEffect(() => { load(); }, []);

  const [toast, setToast] = useState<{ msg: string; type?: 'info'|'success'|'error' } | null>(null);

  async function save() {
    const res = await fetch('/api/obs/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, port, password }) });
    if (res.ok) setToast({ msg: 'Settings saved', type: 'success' }); else setToast({ msg: 'Save failed', type: 'error' });
  }

  async function connect() {
    const res = await fetch('/api/obs/connect', { method: 'POST' });
    if (res.ok) {
      const j = await res.json();
      setStatus(j.connected ? 'connected' : 'disconnected');
      setToast({ msg: j.connected ? 'Connected to OBS' : 'Connect failed', type: j.connected ? 'success' : 'error' });
    } else setToast({ msg: 'Connect failed', type: 'error' });
  }

  return (
    <div className="p-4 border rounded space-y-3">
      <h3 className="text-lg font-medium">Impostazioni OBS</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">Host<input className="w-full" value={host} onChange={e => setHost(e.target.value)} /></label>
        <label className="block">Port<input className="w-full" value={String(port)} onChange={e => setPort(Number(e.target.value))} /></label>
        <label className="block col-span-2">Password<input className="w-full" value={password} onChange={e => setPassword(e.target.value)} /></label>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={save}>Salva</Button>
        <Button variant="secondary" onClick={connect}>Connetti a OBS</Button>
        <div className="ml-auto">Stato: <strong>{status}</strong></div>
      </div>
      {toast && <div className="mt-2"><Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} /></div>}
    </div>
  );
}
