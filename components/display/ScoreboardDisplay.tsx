"use client";

import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

type PenaltySlot = { player: string; remaining: number | null };

const socket = (typeof window !== 'undefined') ? io() : null;

export default function ScoreboardDisplay() {
  const [homeScore, setHomeScore] = useState<number>(0);
  const [guestScore, setGuestScore] = useState<number>(0);
  const [period, setPeriod] = useState<number>(1);
  const [timeSeconds, setTimeSeconds] = useState<number>(20 * 60);

  // two penalty slots per team
  const [homePenalties, setHomePenalties] = useState<PenaltySlot[]>([
    { player: '--', remaining: null },
    { player: '--', remaining: null },
  ]);
  const [guestPenalties, setGuestPenalties] = useState<PenaltySlot[]>([
    { player: '--', remaining: null },
    { player: '--', remaining: null },
  ]);

  // timersRef unused in current implementation; removed to satisfy linter

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => {
      console.log('display socket connected');
      socket.emit('join', 'displays');
    });
    socket.on('scoreboard:update', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const d = data as Record<string, unknown>;
      if (typeof d.homeGoals === 'number') setHomeScore(d.homeGoals);
      if (typeof d.awayGoals === 'number') setGuestScore(d.awayGoals);
      if (typeof d.period === 'number') setPeriod(d.period);
      if (typeof d.timeSeconds === 'number') setTimeSeconds(d.timeSeconds);
    });

    socket.on('scoreboard:cmd', (m: unknown) => {
      if (!m || typeof m !== 'object') return;
      const msg = m as Record<string, unknown>;
      const cmd = msg.cmd as string | undefined;
      const p = msg.payload as Record<string, unknown> | undefined;
      if (!cmd) return;
      switch (cmd) {
        case 'reset':
          setHomeScore(0); setGuestScore(0); setPeriod(1); setTimeSeconds(20*60);
          setHomePenalties([{ player: '--', remaining: null }, { player: '--', remaining: null }]);
          setGuestPenalties([{ player: '--', remaining: null }, { player: '--', remaining: null }]);
          break;
        case 'siren':
          playSiren();
          break;
        case 'setClock':
          if (p && typeof p.secs === 'number') setTimeSeconds(p.secs);
          break;
        case 'setPeriod':
          if (p && (typeof p.period === 'number' || typeof p.period === 'string')) setPeriod(Number(p.period));
          break;
        case 'assignPenalty':
          if (p && typeof p.team === 'string' && (typeof p.player === 'string' || typeof p.player === 'number')) {
            const duration = typeof p.durationSec === 'number' ? p.durationSec : (typeof p.duration === 'number' ? p.duration : 120);
            assignPenalty(p.team as 'home' | 'guest', String(p.player), Number(duration));
          }
          break;
        case 'clearPenalty':
          if (p && p.team && typeof p.slot === 'number') {
            const team = p.team as 'home'|'guest';
            const slot = p.slot as number;
            if (team === 'home') {
              setHomePenalties((s) => { const copy = [...s]; copy[slot-1] = { player: '--', remaining: null }; return copy; });
            } else {
              setGuestPenalties((s) => { const copy = [...s]; copy[slot-1] = { player: '--', remaining: null }; return copy; });
            }
          }
          break;
        case 'setNames':
          if (p && typeof p.home === 'string') { /* update header text visually */ /* not stored currently */ }
          break;
        case 'sirenEveryMinute':
          if (p && typeof p.enabled === 'boolean') setSirenEveryMinute(Boolean(p.enabled));
          break;
        default:
          break;
      }
    });

    return () => {
      socket.off('scoreboard:update');
      socket.off('connect');
    };
  }, []);

  // main clock interval
  useEffect(() => {
    const id = setInterval(() => {
      setTimeSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // siren every minute
  const [sirenEveryMinute, setSirenEveryMinute] = useState(false);
  useEffect(() => {
    if (!sirenEveryMinute) return;
    const id = setInterval(() => {
      if (timeSeconds % 60 === 0) playSiren();
    }, 1000);
    return () => clearInterval(id);
  }, [sirenEveryMinute, timeSeconds]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  function playSiren() {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/siren.mp3');
      audioRef.current.load();
    }
    try { audioRef.current.currentTime = 0; audioRef.current.play(); } catch {}
  }

  // penalty countdown handler
  useEffect(() => {
    // setInterval to tick penalty timers every second and clear finished timers
    const id = setInterval(() => {
      setHomePenalties((slots) => slots.map((slot) => {
        if (slot.remaining == null) return slot;
        const next = Math.max(0, slot.remaining - 1);
        return { player: slot.player, remaining: next === 0 ? null : next };
      }));
      setGuestPenalties((slots) => slots.map((slot) => {
        if (slot.remaining == null) return slot;
        const next = Math.max(0, slot.remaining - 1);
        return { player: slot.player, remaining: next === 0 ? null : next };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function formatTimer(sec: number | null) {
    if (sec == null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}${s < 10 ? ':0' : ':'}${s}`;
  }

  function assignPenalty(team: 'home' | 'guest', playerNumber: string, durationSec: number) {
    if (team === 'home') {
      setHomePenalties((slots) => {
        const idx = slots.findIndex(s => s.player === '--' || s.remaining == null);
        if (idx === -1) return slots; // no free slot
        const copy = [...slots];
        copy[idx] = { player: playerNumber, remaining: durationSec };
        return copy;
      });
    } else {
      setGuestPenalties((slots) => {
        const idx = slots.findIndex(s => s.player === '--' || s.remaining == null);
        if (idx === -1) return slots;
        const copy = [...slots];
        copy[idx] = { player: playerNumber, remaining: durationSec };
        return copy;
      });
    }
  }

  // Expose some debug functions on window for ad-hoc control from admin or console
  useEffect(() => {
    if (typeof window === 'undefined') return;
    type ScoreboardDebug = {
      setHome?: (n: number) => void;
      setGuest?: (n: number) => void;
      setPeriod?: (p: number) => void;
      setTime?: (s: number) => void;
      penalty?: (team: 'home'|'guest', player: string, duration: number) => void;
    }
    ;(window as unknown as Record<string, unknown>).__scoreboard = {
      setHome: (n: number) => setHomeScore(n),
      setGuest: (n: number) => setGuestScore(n),
      setPeriod: (p: number) => setPeriod(p),
      setTime: (s: number) => setTimeSeconds(s),
      penalty: (team: 'home'|'guest', player: string, duration: number) => assignPenalty(team, player, duration),
    } as unknown as ScoreboardDebug;
  }, []);

  return (
    <div style={{ backgroundColor: '#000', width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', overflow: 'hidden', fontFamily: "'Teko', sans-serif'" }}>
      <div className="scoreboard-container" style={{ width: '95vw', maxWidth: 1800, aspectRatio: '16 / 9', backgroundColor: '#080808', border: '4px solid #333', borderRadius: 10, padding: '2%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gridTemplateRows: 'auto 1fr auto', gap: '2% 3%', gridTemplateAreas: `"header-home header-clock header-guest" "score-home info-period score-guest" "penalties-home info-bottom penalties-guest"` }}>

        <div className="header-home" style={{ gridArea: 'header-home', display: 'grid', placeItems: 'center' }}>
          <h2 style={{ fontSize: 'clamp(2.5rem, 7vw, 8rem)', color: '#fff', textTransform: 'uppercase', margin: 0 }}>HOME</h2>
        </div>

        <div id="main-clock" style={{ gridArea: 'header-clock', display: 'grid', placeItems: 'center', fontWeight: 700, textAlign: 'center', lineHeight: 1, fontSize: 'clamp(4rem, 12vw, 14rem)', color: '#FF4136' }}>{`${Math.floor(timeSeconds/60)}:${String(timeSeconds%60).padStart(2,'0')}`}</div>

        <div className="header-guest" style={{ gridArea: 'header-guest', display: 'grid', placeItems: 'center' }}>
          <h2 style={{ fontSize: 'clamp(2.5rem, 7vw, 8rem)', color: '#fff', textTransform: 'uppercase', margin: 0 }}>GUEST</h2>
        </div>

        <div className="score-home" style={{ gridArea: 'score-home', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 'clamp(10rem, 30vw, 28rem)', color: '#FFD700' }}>{homeScore}</div>

        <div className="info-period" style={{ gridArea: 'info-period', display: 'grid', placeItems: 'center', textAlign: 'center', color: '#FFD700' }}>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)', color: '#fff' }}>PER</div>
            <div id="period-display" style={{ fontSize: 'clamp(3rem, 10vw, 10rem)', color: '#FFD700' }}>{period}</div>
          </div>
        </div>

        <div className="score-guest" style={{ gridArea: 'score-guest', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 'clamp(10rem, 30vw, 28rem)', color: '#FFD700' }}>{guestScore}</div>

        <div className="penalties-home" style={{ gridArea: 'penalties-home', display: 'grid', width: '100%', height: '100%', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: '8%', alignItems: 'center' }}>
          <div style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: '#fff', textAlign: 'center' }}>PLYR</div>
          <div style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: '#fff', textAlign: 'center' }}>PENALTY</div>

          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FF4136' }}>{homePenalties[0]?.player ?? '--'}</div>
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FFD700' }}>{formatTimer(homePenalties[0]?.remaining ?? null)}</div>

          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FF4136' }}>{homePenalties[1]?.player ?? '--'}</div>
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FFD700' }}>{formatTimer(homePenalties[1]?.remaining ?? null)}</div>
        </div>

        <div className="info-bottom" style={{ gridArea: 'info-bottom' }} />

        <div className="penalties-guest" style={{ gridArea: 'penalties-guest', display: 'grid', width: '100%', height: '100%', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr 1fr', gap: '8%' }}>
          <div style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: '#fff', textAlign: 'center' }}>PLYR</div>
          <div style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: '#fff', textAlign: 'center' }}>PENALTY</div>

          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FF4136' }}>{guestPenalties[0]?.player ?? '--'}</div>
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FFD700' }}>{formatTimer(guestPenalties[0]?.remaining ?? null)}</div>

          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FF4136' }}>{guestPenalties[1]?.player ?? '--'}</div>
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 'clamp(2.5rem, 7vw, 6rem)', color: '#FFD700' }}>{formatTimer(guestPenalties[1]?.remaining ?? null)}</div>
        </div>

      </div>
    </div>
  );
}
