"use client";

import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Toast from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import ConfirmButton from '@/components/ui/ConfirmButton';

type ScoreState = {
  homeGoals: number;
  awayGoals: number;
  period: number;
  timeSeconds: number;
  timerRunning: boolean;
  teamHome: string;
  teamGuest: string;
  sirenEveryMinute: boolean;
};

const socket = io();

export default function ScoreboardControl() {
  const [state, setState] = useState<ScoreState>({ homeGoals: 0, awayGoals: 0, period: 1, timeSeconds: 20 * 60, timerRunning: false, teamHome: 'HOME', teamGuest: 'GUEST', sirenEveryMinute: false });
  const timerRef = useRef<number | null>(null);
  const [homeName, setHomeName] = useState('HOME');
  const [guestName, setGuestName] = useState('GUEST');
  const [sirenEveryMinute, setSirenEveryMinute] = useState(false);
  const [connected, setConnected] = useState<boolean>(socket.connected);

  const [toast, setToast] = useState<{ msg: string; type?: 'info'|'success'|'error' } | null>(null);

  useEffect(() => {
    // socket lifecycle
    const onConnect = () => { setConnected(true); };
    const onDisconnect = () => { setConnected(false); };
    const onConnectError = (err: unknown) => { setConnected(false); setToast({ msg: String(err), type: 'error' }); };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('scoreboard:update', (data: ScoreState) => setState(data));
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('scoreboard:update');
    };
  }, []);

  useEffect(() => {
    if (state.timerRunning) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          const nextSeconds = Math.max(0, prev.timeSeconds - 1);
          const next = { ...prev, timeSeconds: nextSeconds };
          socket.emit('scoreboard:update', next);
          // auto-stop when reaches 0
          if (nextSeconds === 0) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            const stopped = { ...next, timerRunning: false };
            setState(stopped);
            socket.emit('scoreboard:update', stopped);
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [state.timerRunning]);

  function emitState(next: ScoreState) {
    socket.emit('scoreboard:update', next);
  }

  // no-op: Confirm handled by ConfirmButton components

  function emitCommand(name: string, payload?: unknown) {
    socket.emit('scoreboard:cmd', { cmd: name, payload });
  }

  const incHome = () => {
    setState(prev => { const next = { ...prev, homeGoals: prev.homeGoals + 1 }; emitState(next); return next });
  };
  const decHome = () => {
    setState(prev => { const next = { ...prev, homeGoals: Math.max(0, prev.homeGoals - 1) }; emitState(next); return next });
  };
  const incAway = () => {
    setState(prev => { const next = { ...prev, awayGoals: prev.awayGoals + 1 }; emitState(next); return next });
  };
  const decAway = () => {
    setState(prev => { const next = { ...prev, awayGoals: Math.max(0, prev.awayGoals - 1) }; emitState(next); return next });
  };
  const incPeriod = () => {
    setState(prev => { const next = { ...prev, period: prev.period + 1 }; emitState(next); return next });
  };
  const setPeriod = (p: number) => { setState(prev => { const next = { ...prev, period: p }; emitState(next); return next }); };
  const toggleTimer = () => {
    setState(prev => { const next = { ...prev, timerRunning: !prev.timerRunning }; emitState(next); return next });
  };

  const resetMatch = () => {
    const next: ScoreState = { homeGoals: 0, awayGoals: 0, period: 1, timeSeconds: 20 * 60, timerRunning: false, teamHome: state.teamHome, teamGuest: state.teamGuest, sirenEveryMinute };
    setState(next);
    emitState(next);
    emitCommand('reset');
  };

  const playSiren = () => {
    emitCommand('siren');
  };

  const setClock = (m: number, s: number) => {
    const secs = Math.max(0, m * 60 + s);
    setState(prev => { const next = { ...prev, timeSeconds: secs }; emitState(next); return next });
  };

  function assignPenalty(team: 'home'|'guest', player: string, durationSec: number) {
    emitCommand('assignPenalty', { team, player, durationSec });
  }

  function clearPenalty(team: 'home'|'guest', slot: number) {
    emitCommand('clearPenalty', { team, slot });
  }

  function updateNames() {
    const next = { ...state, teamHome: homeName, teamGuest: guestName };
    setState(next);
    emitState(next);
    emitCommand('setNames', { home: homeName, guest: guestName });
  }

  function setSirenEveryMinuteToggle(v: boolean) {
    setSirenEveryMinute(v);
    const next = { ...state, sirenEveryMinute: v };
    setState(next);
    emitState(next);
    emitCommand('sirenEveryMinute', { enabled: v });
  }

  // show toast UI

  return (
    <div className="space-y-4 p-6 relative">
      <div title={connected ? 'Online' : 'Offline'} className={`absolute top-2 left-2 w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={toggleTimer}>{state.timerRunning ? 'STOP OROLOGIO' : 'START OROLOGIO'}</Button>
  <ConfirmButton onConfirm={playSiren}>SIRENA MANUALE</ConfirmButton>
  <ConfirmButton onConfirm={resetMatch}>RESET PARTITA</ConfirmButton>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 border">
          <div className="font-semibold">Cronometro</div>
          <div className="mt-2">Tempo attuale: {Math.floor(state.timeSeconds / 60)}:{String(state.timeSeconds % 60).padStart(2, '0')}</div>
          <div className="mt-2 flex gap-2">
            <input placeholder="Minuti" id="clk-min" className="border p-1 w-20" />
            <input placeholder="Secondi" id="clk-sec" className="border p-1 w-20" />
            <ConfirmButton onConfirm={() => {
              const m = Number((document.getElementById('clk-min') as HTMLInputElement)?.value || '0');
              const s = Number((document.getElementById('clk-sec') as HTMLInputElement)?.value || '0');
              setClock(m, s);
            }}>Imposta Orologio</ConfirmButton>
          </div>
        </div>

        <div className="p-3 border">
          <div className="font-semibold">Periodo</div>
          <div className="mt-2">Attuale: {state.period}</div>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={incPeriod}>+1 Periodo</Button>
            <input id="period-input" placeholder="Periodo" className="border p-1 w-24" />
            <ConfirmButton onConfirm={() => {
              const v = (document.getElementById('period-input') as HTMLInputElement)?.value || '';
              const n = Number(v);
              if (!Number.isNaN(n)) setPeriod(n);
            }}>Imposta Periodo</ConfirmButton>
          </div>
        </div>

        <div className="p-3 border">
          <div className="font-semibold">Nomi Squadre</div>
          <input className="border p-1 mt-2 w-full" value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder="Nome HOME" />
          <input className="border p-1 mt-2 w-full" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Nome GUEST" />
          <div className="mt-2"><ConfirmButton onConfirm={updateNames}>Aggiorna Nomi</ConfirmButton></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border">
          <div className="font-semibold">HOME - Punteggio</div>
          <div className="mt-2 text-3xl font-bold">{state.homeGoals}</div>
          <div className="mt-2 flex gap-2">
            <Button onClick={incHome}>+1 GOL</Button>
            <Button onClick={decHome}>-1 GOL</Button>
            <input id="home-set-score" className="border p-1 w-24" placeholder="Imposta" />
            <ConfirmButton onConfirm={() => { const v = Number((document.getElementById('home-set-score') as HTMLInputElement)?.value || '0'); setState(prev => { const next = { ...prev, homeGoals: v }; emitState(next); return next }); }}>Imposta</ConfirmButton>
          </div>
          <div className="mt-3 font-semibold">Penalità</div>
          <div className="mt-2 flex gap-2">
            <input id="home-plyr" placeholder="PLYR" className="border p-1 w-24" />
            <select id="home-dur" className="border p-1">
              <option value="120">2:00</option>
              <option value="300">5:00</option>
              <option value="600">10:00</option>
              <option value="90">1:30</option>
            </select>
            <Button onClick={() => {
              const player = (document.getElementById('home-plyr') as HTMLInputElement)?.value || '--';
              const dur = Number((document.getElementById('home-dur') as HTMLSelectElement)?.value || '120');
              assignPenalty('home', player, dur);
            }}>Assegna Penalità</Button>
          </div>
          <div className="mt-2 flex gap-2">
            <ConfirmButton onConfirm={() => clearPenalty('home', 1)}>Cancella Penalità Slot 1</ConfirmButton>
            <ConfirmButton onConfirm={() => clearPenalty('home', 2)}>Cancella Penalità Slot 2</ConfirmButton>
          </div>
        </div>

        <div className="p-3 border">
          <div className="font-semibold">GUEST - Punteggio</div>
          <div className="mt-2 text-3xl font-bold">{state.awayGoals}</div>
          <div className="mt-2 flex gap-2">
            <Button onClick={incAway}>+1 GOL</Button>
            <Button onClick={decAway}>-1 GOL</Button>
            <input id="guest-set-score" className="border p-1 w-24" placeholder="Imposta" />
            <ConfirmButton onConfirm={() => { const v = Number((document.getElementById('guest-set-score') as HTMLInputElement)?.value || '0'); setState(prev => { const next = { ...prev, awayGoals: v }; emitState(next); return next }); }}>Imposta</ConfirmButton>
          </div>
          <div className="mt-3 font-semibold">Penalità</div>
          <div className="mt-2 flex gap-2">
            <input id="guest-plyr" placeholder="PLYR" className="border p-1 w-24" />
            <select id="guest-dur" className="border p-1">
              <option value="120">2:00</option>
              <option value="300">5:00</option>
              <option value="600">10:00</option>
              <option value="90">1:30</option>
            </select>
            <Button onClick={() => {
              const player = (document.getElementById('guest-plyr') as HTMLInputElement)?.value || '--';
              const dur = Number((document.getElementById('guest-dur') as HTMLSelectElement)?.value || '120');
              assignPenalty('guest', player, dur);
            }}>Assegna Penalità</Button>
          </div>
          <div className="mt-2 flex gap-2">
            <ConfirmButton onConfirm={() => clearPenalty('guest', 1)}>Cancella Penalità Slot 1</ConfirmButton>
            <ConfirmButton onConfirm={() => clearPenalty('guest', 2)}>Cancella Penalità Slot 2</ConfirmButton>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 border flex items-center justify-between">
        <div>
          <label className="mr-2">Sirena ogni minuto (quando i secondi sono 00)</label>
          <input type="checkbox" checked={sirenEveryMinute} onChange={(e) => setSirenEveryMinuteToggle(e.target.checked)} />
        </div>
        <div>
          <Button variant="primary" onClick={() => fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'show' }) })}>Mostra Scoreboard</Button>
          <Button variant="secondary" onClick={() => fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hide' }) })}>Nascondi Scoreboard</Button>
        </div>
      </div>

      {toast && <div className="mt-2"><Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} /></div>}
    </div>
  );
}
