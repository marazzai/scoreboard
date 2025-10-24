"use client";

import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Toast from '@/components/ui/Toast';
import Button from '@/components/ui/Button';

const socket = io();

export default function MusicControl() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playlist, setPlaylist] = useState('default');

  const [toast, setToast] = useState<{ msg: string; type?: 'info'|'success'|'error' } | null>(null);

  useEffect(() => {
  socket.on('connect', () => console.log('music control socket connected'));
  socket.on('error', (err: unknown) => { setToast({ msg: String(err), type: 'error' }); });
    return () => { socket.off('connect'); socket.off('error'); };
  }, []);

  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    socket.emit('music:update', { action: next ? 'play' : 'pause' });
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    socket.emit('music:update', { action: 'volume', value: v });
  };

  const changePlaylist = (p: string) => {
    setPlaylist(p);
    socket.emit('music:update', { action: 'playlist', value: p });
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={togglePlay}>{playing ? 'Pausa' : 'Play'}</Button>
        <div className="flex items-center gap-2">
          <label className="text-sm">Volume</label>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Playlist</label>
          <select value={playlist} onChange={(e) => changePlaylist(e.target.value)} className="rounded border px-2 py-1">
            <option value="default">Default</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
          </select>
        </div>
      </div>
      {toast && <div className="mt-2"><Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} /></div>}
    </div>
  );
}
