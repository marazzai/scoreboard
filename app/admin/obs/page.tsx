"use client";

import { useEffect, useState } from 'react';

export default function ObsAdminPage() {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [connected, setConnected] = useState(false);
  const [scenes, setScenes] = useState<string[]>([]);
  const [showScene, setShowScene] = useState<string>('');
  const [hideScene, setHideScene] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('Scoreboard Display');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // load mapping and settings
    (async () => {
      try {
        // mapping
        const r = await fetch('/api/obs/mapping');
        const j = await r.json();
        const m = j.mapping || {};
        setShowScene(m.show ?? '');
        setHideScene(m.hide ?? '');
        setSourceName(m.source ?? 'Scoreboard Display');
        // settings
        const rs = await fetch('/api/obs/settings');
        if (rs.ok) {
          const js = await rs.json();
          const s = js.setting || {};
          if (s.host) setHost(s.host);
          if (s.port) setPort(String(s.port));
          if (s.password) setPassword(s.password ?? '');
        }
        // status -> auto-refresh scenes if already connected
        const st = await fetch('/api/obs/status');
        if (st.ok) {
          const js = await st.json();
          const c = Boolean(js.connected);
          setConnected(c);
          if (c) await refreshScenes();
        }
      } catch {}
    })();
  }, []);

  async function saveSettings() {
    setStatus('Saving settings...');
    const r = await fetch('/api/obs/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, port: Number(port), password }) });
    if (r.ok) {
      setStatus('Saved settings');
    } else {
      setStatus('Failed saving settings');
    }
  }

  async function connectOBS() {
    setStatus('Connecting...');
    const r = await fetch('/api/obs/connect', { method: 'POST' });
    const j = await r.json();
    setConnected(Boolean(j.connected));
    setStatus(j.connected ? 'Connected' : 'Failed to connect');
    if (j.connected) {
      // auto-refresh scenes when connected
      await refreshScenes();
    }
  }

  async function refreshScenes() {
    setStatus('Refreshing scenes...');
    try {
      const r = await fetch('/api/obs/scenes');
      if (!r.ok) {
        // 503 if not connected, 500 for server error
        setScenes([]);
        setStatus('No scenes available (not connected to OBS)');
        return;
      }
      const j = await r.json();
      setScenes(j.scenes || []);
      setStatus('Scenes refreshed');
    } catch {
      setScenes([]);
      setStatus('Failed to refresh scenes');
    }
  }

  async function saveMapping() {
    const mapping = { show: showScene, hide: hideScene, source: sourceName };
    await fetch('/api/obs/mapping', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mapping) });
    setStatus('Mapping saved');
  }

  async function testShow() {
    await fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'show' }) });
  }

  async function testHide() {
    await fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hide' }) });
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">OBS Admin</h2>

      <div className="mb-4">
        <label className="block">Host</label>
        <input value={host} onChange={e => setHost(e.target.value)} className="border p-1" />
        <label className="block">Port</label>
        <input value={port} onChange={e => setPort(e.target.value)} className="border p-1" />
        <label className="block">Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} className="border p-1" />
        <div className="mt-2">
          <button onClick={saveSettings} className="mr-2 bg-blue-500 text-white px-3 py-1 rounded">Save Settings</button>
          <button onClick={connectOBS} className="mr-2 bg-green-500 text-white px-3 py-1 rounded">Connect</button>
          <button onClick={refreshScenes} className="bg-gray-500 text-white px-3 py-1 rounded">Refresh Scenes</button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Scene mapping</h3>
        <div>
          <label>Show (scoreboard)</label>
          <select value={showScene} onChange={e => setShowScene(e.target.value)} className="border p-1">
            <option value="">-- select scene --</option>
            {scenes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Hide (scoreboard)</label>
          <select value={hideScene} onChange={e => setHideScene(e.target.value)} className="border p-1">
            <option value="">-- select scene --</option>
            {scenes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>Source name (e.g. Scoreboard Display)</label>
          <input value={sourceName} onChange={e => setSourceName(e.target.value)} className="border p-1" />
        </div>
        <div className="mt-2">
          <button onClick={saveMapping} className="bg-blue-600 text-white px-3 py-1 rounded">Save Mapping</button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Test</h3>
        <button onClick={testShow} className="mr-2 bg-purple-600 text-white px-3 py-1 rounded">Test Show</button>
        <button onClick={testHide} className="bg-yellow-600 text-black px-3 py-1 rounded">Test Hide</button>
      </div>

      <div className="mt-4 text-sm text-gray-600">Status: {status} {connected ? '(connected)' : ''}</div>
    </div>
  );
}
