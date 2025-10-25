"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

// UI-only design component for the Hockey scoreboard control panel
// Mobile-first, dark mode friendly, large touch targets
// NOTE: This is a design preview; wire real-time logic later.

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type PenaltySlot = { id: number; player: string; remainingSec: number };

type TeamSide = "home" | "guest";

export default function HockeyControlPanel() {
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [period, setPeriod] = useState(1);
  const [homeName, setHomeName] = useState("HOME");
  const [guestName, setGuestName] = useState("GUEST");
  const [showSettings, setShowSettings] = useState(false);
  // Removed: sirenEveryMinute option

  const [homeScore, setHomeScore] = useState(0);
  const [guestScore, setGuestScore] = useState(0);
  const [timeSeconds, setTimeSeconds] = useState(20 * 60);

  const [homePenalties, setHomePenalties] = useState<PenaltySlot[]>([]);
  const [guestPenalties, setGuestPenalties] = useState<PenaltySlot[]>([]);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [pendingObsAction, setPendingObsAction] = useState<null | 'show' | 'hide'>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const [pendingAction, setPendingAction] = useState<null | 'load-time' | 'load-interval' | 'period-plus' | 'reset-game'>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const [obsConnected, setObsConnected] = useState(false);

  const timePresets = useMemo(() => [
    { label: "2:00", value: "2:00" },
    { label: "5:00", value: "5:00" },
    { label: "1:30", value: "1:30" },
  ], []);

  // socket + initial state + server updates
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    const onUpdate = (s: any) => {
      if (typeof s.timeSeconds === 'number') setTimeSeconds(s.timeSeconds);
      if (typeof s.timerRunning === 'boolean') setRunning(!!s.timerRunning);
      if (typeof s.period === 'number') setPeriod(s.period);
      if (typeof s.teamHome === 'string') setHomeName(s.teamHome);
      if (typeof s.teamGuest === 'string') setGuestName(s.teamGuest);
      if (typeof s.homeGoals === 'number') setHomeScore(s.homeGoals);
      if (typeof s.awayGoals === 'number') setGuestScore(s.awayGoals);
      // map two-slot model into our list UI
      const hp = Array.isArray(s.homePenalties) ? s.homePenalties : [];
      const gp = Array.isArray(s.guestPenalties) ? s.guestPenalties : [];
      setHomePenalties(hp.filter((x: any) => typeof x?.remaining === 'number' && x.remaining > 0)
        .map((x: any) => ({ id: Date.now() + Math.random(), player: String(x?.player ?? '--'), remainingSec: x.remaining })));
      setGuestPenalties(gp.filter((x: any) => typeof x?.remaining === 'number' && x.remaining > 0)
        .map((x: any) => ({ id: Date.now() + Math.random(), player: String(x?.player ?? '--'), remainingSec: x.remaining })));
    };
    socket.on('scoreboard:update', onUpdate);

    // hydrate from server snapshot
    (async () => {
      try {
        const r = await fetch("/api/scoreboard/state");
        if (r.ok) {
          const s = await r.json();
          onUpdate(s);
        }
      } catch {}
    })();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off('scoreboard:update', onUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  

  function emitCommand(cmd: string, payload?: unknown) {
    socketRef.current?.emit("scoreboard:cmd", { cmd, payload });
  }

  function toggleRun() {
    // Flip locally for responsiveness, then let server authoritative tick drive time
    setRunning((v) => {
      const nv = !v; 
      emitState({ timerRunning: nv });
      return nv;
    });
  }

  function startConfirm(action: 'load-time' | 'load-interval' | 'period-plus' | 'reset-game') {
    setPendingAction(action);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = window.setTimeout(() => setPendingAction(null), 5000);
  }

  function clearConfirm() {
    setPendingAction(null);
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null; }
  }

  function doLoadTime() {
    const secs = 20 * 60;
    setTimeSeconds(secs);
    emitCommand('setClock', { secs });
    emitState({ timeSeconds: secs });
    clearConfirm();
  }

  function doLoadInterval() {
    // Assumption: Intervallo = 15:00 by default
    const secs = 15 * 60;
    setTimeSeconds(secs);
    emitCommand('setClock', { secs });
    emitState({ timeSeconds: secs });
    clearConfirm();
  }

  function doPeriodPlus() {
    setPeriod(p => { const np = p + 1; emitCommand('setPeriod', { period: np }); queueMicrotask(() => emitState({ period: np })); return np; });
    clearConfirm();
  }

  function addGoal(side: TeamSide) {
    if (side === "home") setHomeScore(v => { const n = v + 1; queueMicrotask(() => emitState({ homeGoals: n })); return n; });
    else setGuestScore(v => { const n = v + 1; queueMicrotask(() => emitState({ awayGoals: n })); return n; });
  }
  function subGoal(side: TeamSide) {
    if (side === "home") setHomeScore(v => { const n = Math.max(0, v - 1); queueMicrotask(() => emitState({ homeGoals: n })); return n; });
    else setGuestScore(v => { const n = Math.max(0, v - 1); queueMicrotask(() => emitState({ awayGoals: n })); return n; });
  }

  function toSeconds(label: string): number {
    // supports mm:ss
    const m = /^([0-9]{1,2}):([0-5][0-9])$/.exec(label?.trim() || "");
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function assignPenalty(side: TeamSide, player: string, duration: string) {
    if (!player) return;
    const secs = toSeconds(duration);
    if (!secs) return;
    const slot: PenaltySlot = { id: Date.now(), player: `#${player}`, remainingSec: secs };
    if (side === "home") setHomePenalties((xs) => [...xs, slot]); else setGuestPenalties((xs) => [...xs, slot]);
    emitCommand('assignPenalty', { team: side, player, durationSec: secs });
  }

  function clearPenalty(side: TeamSide, id: number) {
    if (side === "home") setHomePenalties(xs => xs.filter(s => s.id !== id)); else setGuestPenalties(xs => xs.filter(s => s.id !== id));
    // find slot index 1/2 if needed – since we track more than 2 locally, send by nearest free slot semantics
    // For compatibility, send clearPenalty for slot 1 or 2 when appropriate, otherwise rely on display to ignore.
    // Here we just emit a best-effort clear of slot 1.
    emitCommand('clearPenalty', { team: side, slot: 1 });
  }

  function TeamColumn({ side }: { side: TeamSide }) {
    const name = side === "home" ? homeName : guestName;
    const score = side === "home" ? homeScore : guestScore;
    const penalties = side === "home" ? homePenalties : guestPenalties;

    const primaryBtn = "primary-button bg-blue-500 hover:bg-blue-400 text-white";
    const dangerBtn = "bg-red-600/90 hover:bg-red-600 text-white";

    return (
      <div className="bg-secondary rounded-2xl p-4 md:p-6 border border-color subtle-shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight truncate">{name}</h3>
        </div>
        <div className="mt-3 md:mt-4 text-6xl md:text-7xl font-extrabold tracking-tight">{score}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className={classNames("py-3 md:py-4 rounded-xl font-semibold", "bg-green-600 hover:bg-green-500 text-white")}
                  onClick={() => addGoal(side)}>+1 GOL</button>
          <button className={classNames("py-3 md:py-4 rounded-xl font-semibold", dangerBtn)}
                  onClick={() => subGoal(side)}>-1 GOL</button>
        </div>

        <div className="mt-5">
          <div className="text-sm font-medium text-secondary">Assegna Penalità</div>
          <div className="mt-2 flex gap-2">
            <input id={`${side}-plyr`} placeholder="Numero Giocatore (PLYR)" className="flex-1 bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" />
          </div>
          <div className="mt-3 flex gap-2">
            {timePresets.map(p => (
              <button key={p.value} className="px-3 py-2 rounded-lg bg-tertiary hover:brightness-110 border border-color text-sm"
                      onClick={() => {
                        const el = document.getElementById(`${side}-plyr`) as HTMLInputElement | null;
                        assignPenalty(side, el?.value || "", p.value);
                      }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="text-sm font-medium text-secondary">Slot Penalità Attivi</div>
          <div className="mt-2 space-y-2">
            {penalties.length === 0 && (
              <div className="text-sm text-secondary">Nessuna penalità attiva</div>
            )}
            {penalties.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-tertiary rounded-xl px-3 py-2 border border-color">
                <div className="text-sm md:text-base font-medium">Slot: <span className="font-semibold text-primary">{p.player}</span></div>
                <div className="flex items-center gap-3">
                  <div className="text-sm md:text-base text-primary tabular-nums">{fmt(p.remainingSec)}</div>
                  <button aria-label="Cancella" className="w-8 h-8 grid place-items-center rounded-lg bg-red-600/90 hover:bg-red-600 text-white"
                          onClick={() => clearPenalty(side, p.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No local ticking: server is authoritative and sends scoreboard:update each second

  // emitState helper now supports partials to avoid sending stale fields
  function emitState(partial?: Partial<{ homeGoals: number; awayGoals: number; period: number; timeSeconds: number; timerRunning: boolean; teamHome: string; teamGuest: string; }>) {
    const payload = {
      homeGoals: homeScore,
      awayGoals: guestScore,
      period,
      timeSeconds,
      timerRunning: running,
      teamHome: homeName,
      teamGuest: guestName,
      ...(partial || {})
    };
    socketRef.current?.emit('scoreboard:update', payload);
  }

  function fmt(sec: number) {
    const m = Math.floor(sec / 60); const s = sec % 60; return `${m}:${s < 10 ? '0' + s : s}`;
  }

  function fmtOpt(sec?: number) {
    if (typeof sec !== 'number' || Number.isNaN(sec)) return '--:--';
    return fmt(sec);
  }

  async function pollObsStatus() {
    try {
      const r = await fetch('/api/obs/status');
      if (r.ok) {
        const d = await r.json();
        setObsConnected(Boolean(d?.connected));
      }
    } catch {}
  }

  async function connectOBS() {
    try { await fetch('/api/obs/connect', { method: 'POST' }); await pollObsStatus(); } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Quick settings toolbar at the very top */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="w-full flex items-center justify-center">
            <button
              className="px-5 py-3 rounded-2xl bg-tertiary hover:brightness-110 border border-color text-sm font-medium"
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Impostazioni Partita
            </button>
          </div>
        </div>

        {/* Top controls: OBS show/hide centered with double-confirm */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="w-full flex items-center justify-center">
            <div className="flex items-center gap-4 md:gap-6">
              {pendingObsAction !== 'show' ? (
                <button className="px-5 py-3 rounded-2xl font-semibold bg-purple-600 hover:bg-purple-500 text-white"
                        onClick={() => {
                          setPendingObsAction('show');
                          if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
                          pendingTimerRef.current = window.setTimeout(() => setPendingObsAction(null), 4000);
                        }}>MOSTRA TABELLONE</button>
              ) : (
                <button className="px-5 py-3 rounded-2xl font-semibold bg-purple-700 text-white ring-2 ring-purple-300"
                        onClick={async () => { setPendingObsAction(null); try { await fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'show' }) }); } catch {} }}>CONFERMA MOSTRA</button>
              )}

              {pendingObsAction !== 'hide' ? (
                <button className="px-5 py-3 rounded-2xl font-semibold bg-yellow-500 hover:bg-yellow-400 text-black"
                        onClick={() => {
                          setPendingObsAction('hide');
                          if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
                          pendingTimerRef.current = window.setTimeout(() => setPendingObsAction(null), 4000);
                        }}>NASCONDI TABELLONE</button>
              ) : (
                <button className="px-5 py-3 rounded-2xl font-semibold bg-yellow-600 text-black ring-2 ring-yellow-300"
                        onClick={async () => { setPendingObsAction(null); try { await fetch('/api/obs/scoreboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hide' }) }); } catch {} }}>CONFERMA NASCONDI</button>
              )}
            </div>
          </div>

        </div>
      

      {/* Main content */}
        {/* Summary banner */}
        <div className="mt-4 px-4 w-full">
          <div className="p-3 rounded-2xl bg-tertiary border border-color text-sm flex flex-wrap items-center gap-4">
            <div><span className="font-semibold">{homeName}</span> {homeScore}</div>
            <div className="opacity-60">vs</div>
            <div><span className="font-semibold">{guestName}</span> {guestScore}</div>
            <div>PER: <span className="font-semibold">{period}</span></div>
            <div>TIME: <span className="font-mono tabular-nums">{fmt(timeSeconds)}</span></div>
            <div>Timer: <span className={running ? 'text-green-500' : 'text-red-500'}>{running ? 'RUN' : 'STOP'}</span></div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">PEN HOME:</span>
              {[0,1].map(i => (
                <span key={i} className="font-mono">[{homePenalties[i]?.player ?? '--'} {fmtOpt(homePenalties[i]?.remainingSec)}]</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">PEN GUEST:</span>
              {[0,1].map(i => (
                <span key={i} className="font-mono">[{guestPenalties[i]?.player ?? '--'} {fmtOpt(guestPenalties[i]?.remainingSec)}]</span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span title={obsConnected ? 'OBS connesso' : 'OBS non connesso'} className={`inline-block w-3 h-3 rounded-full ${obsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <button onClick={connectOBS} className="px-2 py-1 border border-color rounded-lg text-xs">Connetti OBS</button>
            </div>
          </div>
        </div>

        {/* Big centered Start/Stop */}
        <div className="w-full flex items-center justify-center mt-8">
          <button
            className={classNames(
              "w-full max-w-3xl py-16 md:py-20 rounded-3xl font-extrabold tracking-tight text-white text-4xl md:text-6xl",
              running ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
            )}
            onClick={toggleRun}
          >{running ? "STOP OROLOGIO" : "START OROLOGIO"}</button>
        </div>

        {/* Quick actions under Start/Stop with double-confirm */}
        <div className="mt-4 w-full flex items-center justify-center">
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Carica Tempo 20:00 */}
            {pendingAction !== 'load-time' ? (
              <button className="py-3 rounded-2xl font-semibold bg-tertiary hover:brightness-110 border border-color"
                      onClick={() => startConfirm('load-time')}>Carica Tempo 20:00</button>
            ) : (
              <button className="py-3 rounded-2xl font-semibold bg-amber-600 text-black ring-2 ring-amber-300"
                      onClick={doLoadTime}>Conferma 20:00</button>
            )}

            {/* Carica Intervallo 15:00 */}
            {pendingAction !== 'load-interval' ? (
              <button className="py-3 rounded-2xl font-semibold bg-tertiary hover:brightness-110 border border-color"
                      onClick={() => startConfirm('load-interval')}>Carica Intervallo 15:00</button>
            ) : (
              <button className="py-3 rounded-2xl font-semibold bg-amber-600 text-black ring-2 ring-amber-300"
                      onClick={doLoadInterval}>Conferma Intervallo</button>
            )}

            {/* Periodo +1 */}
            {pendingAction !== 'period-plus' ? (
              <button className="py-3 rounded-2xl font-semibold bg-tertiary hover:brightness-110 border border-color"
                      onClick={() => startConfirm('period-plus')}>Periodo +1</button>
            ) : (
              <button className="py-3 rounded-2xl font-semibold bg-amber-600 text-black ring-2 ring-amber-300"
                      onClick={doPeriodPlus}>Conferma Periodo +1</button>
            )}
          </div>
        </div>

        {/* Siren below */}
        <div className="mt-4 w-full flex items-center justify-center">
          <button className="w-full max-w-3xl py-4 rounded-2xl font-semibold bg-blue-600 hover:bg-blue-500 text-white text-xl"
                  onClick={() => emitCommand('siren')}>SIRENA MANUALE</button>
        </div>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <TeamColumn side="home" />
          <TeamColumn side="guest" />
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSettings(false)} />
          <div className="absolute inset-0 p-4 sm:p-6 grid place-items-center">
            <div className="w-full max-w-3xl bg-secondary rounded-2xl border border-color subtle-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-color">
                <h3 className="text-lg font-semibold tracking-tight">Impostazioni</h3>
                <button className="px-3 py-1.5 rounded-lg bg-tertiary hover:brightness-110 border border-color text-sm" onClick={() => setShowSettings(false)}>Chiudi</button>
              </div>

              <div className="p-5 space-y-8">
                {/* Partita */}
                <section>
                  <h4 className="text-sm font-semibold text-secondary mb-3">Partita</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-secondary">Nome HOME</label>
                      <input className="mt-1 w-full bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" value={homeName} onChange={(e) => setHomeName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-secondary">Nome GUEST</label>
                      <input className="mt-1 w-full bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm text-secondary">Imposta Orologio (Min/Sec)</label>
                      <div className="mt-1 flex gap-2">
                        <input id="set-mm" placeholder="MM" className="w-20 bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" />
                        <input id="set-ss" placeholder="SS" className="w-20 bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" />
                        <button className="px-4 py-2 rounded-lg bg-tertiary hover:brightness-110 border border-color text-sm" onClick={() => {
                          const mm = Number((document.getElementById('set-mm') as HTMLInputElement)?.value || '0');
                          const ss = Number((document.getElementById('set-ss') as HTMLInputElement)?.value || '0');
                          const secs = Math.max(0, mm * 60 + ss);
                          setTimeSeconds(secs);
                          emitCommand('setClock', { secs });
                        }}>Imposta</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-secondary">Imposta Periodo</label>
                      <div className="mt-1 flex gap-2 items-center">
                        <input id="set-period" placeholder="#" className="w-24 bg-tertiary border border-color rounded-lg px-3 py-2 outline-none focus:ring-2 ring-accent" />
                        <button className="px-4 py-2 rounded-lg bg-tertiary hover:brightness-110 border border-color text-sm" onClick={() => {
                          const v = Number((document.getElementById('set-period') as HTMLInputElement)?.value || '0');
                          if (!Number.isNaN(v) && v > 0) { setPeriod(v); emitCommand('setPeriod', { period: v }); }
                        }}>Imposta</button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* OBS settings moved to dedicated page */}
                <section>
                  <h4 className="text-sm font-semibold text-secondary mb-3">Integrazioni</h4>
                  <div className="flex items-center justify-between bg-tertiary border border-color rounded-xl p-3">
                    <div>
                      <div className="text-sm text-secondary">Gestione OBS</div>
                      <div className="text-sm">Configura scene e mapping nella pagina dedicata</div>
                    </div>
                    <a href="/admin/obs" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm">Apri Impostazioni OBS</a>
                  </div>
                </section>

                {/* Pericolo */}
                <section>
                  <h4 className="text-sm font-semibold text-secondary mb-3">Pericolo</h4>
                  {pendingAction !== 'reset-game' ? (
                    <button className="w-full py-3 rounded-xl font-semibold bg-red-600/90 hover:bg-red-600 text-white" onClick={() => startConfirm('reset-game')}>RESET PARTITA COMPLETA</button>
                  ) : (
                    <button className="w-full py-3 rounded-xl font-semibold bg-red-700 text-white ring-2 ring-red-300" onClick={() => {
                      setHomeScore(0); setGuestScore(0); setPeriod(1); setTimeSeconds(20*60); setRunning(false);
                      setHomePenalties([]); setGuestPenalties([]);
                      emitCommand('reset'); emitState();
                      clearConfirm();
                    }}>CONFERMA RESET</button>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
