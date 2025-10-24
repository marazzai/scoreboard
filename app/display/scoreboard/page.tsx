"use client"

import React, { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

type PenSlot = { player: string; remaining: number | null }

export default function DisplayScoreboardPage() {
  const [homeScore, setHomeScore] = useState<number>(0)
  const [guestScore, setGuestScore] = useState<number>(0)
  const [period, setPeriod] = useState<number>(1)
  const [timeSeconds, setTimeSeconds] = useState<number>(20 * 60)
  const [teamHome, setTeamHome] = useState<string>('HOME')
  const [teamGuest, setTeamGuest] = useState<string>('GUEST')
  const [timerRunning, setTimerRunning] = useState<boolean>(false)

  const [homePenalties, setHomePenalties] = useState<PenSlot[]>([
    { player: '--', remaining: null },
    { player: '--', remaining: null },
  ])
  const [guestPenalties, setGuestPenalties] = useState<PenSlot[]>([
    { player: '--', remaining: null },
    { player: '--', remaining: null },
  ])

  const socketRef = useRef<Socket | null>(null)
  const sirenRef = useRef<HTMLAudioElement | null>(null)
  const lastTimeRef = useRef<number>(timeSeconds)
  const lastMinuteRef = useRef<number>(Math.floor(timeSeconds / 60))
  // minute siren removed
  const [audioReady, setAudioReady] = useState<boolean>(false)
  const [debugOn, setDebugOn] = useState<boolean>(false)
  const [lastPlayError, setLastPlayError] = useState<string | null>(null)
  const [lastSirenEventAt, setLastSirenEventAt] = useState<number | null>(null)
  const [audioCanMp3, setAudioCanMp3] = useState<boolean | null>(null)
  const [audioHeadStatus, setAudioHeadStatus] = useState<number | string | null>(null)
  const [audioReadyState, setAudioReadyState] = useState<number | null>(null)
  const [audioNetworkState, setAudioNetworkState] = useState<number | null>(null)
  const [audioSrc, setAudioSrc] = useState<string>('/sounds/siren.mp3')
  const [audioAltHeadStatus, setAudioAltHeadStatus] = useState<number | string | null>(null)

  // removed: sirenEveryMinute state

  useEffect(() => {
    // connect to socket.io on mount
    const socket = io()
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('join', 'displays')
    })

    socket.on('scoreboard:update', (d: unknown) => {
      if (d && typeof d === 'object') {
        const data = d as Record<string, unknown>
        if (typeof data.homeGoals === 'number') setHomeScore(data.homeGoals)
        if (typeof data.awayGoals === 'number') setGuestScore(data.awayGoals)
        if (typeof data.period === 'number') setPeriod(data.period)
        if (typeof data.timeSeconds === 'number') {
          const nextTime = data.timeSeconds
          const prev = lastTimeRef.current
          setTimeSeconds(nextTime)
          lastTimeRef.current = nextTime
        }
        if (typeof data.timerRunning === 'boolean') setTimerRunning(Boolean(data.timerRunning))
        if (typeof data.teamHome === 'string') setTeamHome(data.teamHome as string)
        if (typeof data.teamGuest === 'string') setTeamGuest(data.teamGuest as string)
        const hp = (data as Record<string, unknown>).homePenalties as unknown
        const gp = (data as Record<string, unknown>).guestPenalties as unknown
        const parsePenSlots = (val: unknown): PenSlot[] | null => {
          if (!Array.isArray(val)) return null
          return val.map((raw: unknown) => {
            const r = (raw ?? {}) as Record<string, unknown>
            const playerVal = r.player
            const remainingVal = r.remaining
            const player = typeof playerVal === 'string' || typeof playerVal === 'number' ? String(playerVal) : '--'
            const remaining = typeof remainingVal === 'number' ? remainingVal : null
            return { player, remaining }
          })
        }
        const parsedHP = parsePenSlots(hp)
        if (parsedHP) setHomePenalties(parsedHP)
        const parsedGP = parsePenSlots(gp)
        if (parsedGP) setGuestPenalties(parsedGP)
      }
    })

    socket.on('scoreboard:cmd', (m: unknown) => {
      const msg = (m && typeof m === 'object') ? (m as Record<string, unknown>) : null
      const cmd = msg?.cmd as string | undefined
      const p = msg?.payload as Record<string, unknown> | undefined
      switch (cmd) {
        case 'reset':
          setHomeScore(0)
          setGuestScore(0)
          setPeriod(1)
          setTimeSeconds(20 * 60)
          setHomePenalties([{ player: '--', remaining: null }, { player: '--', remaining: null }])
          setGuestPenalties([{ player: '--', remaining: null }, { player: '--', remaining: null }])
          break
        case 'siren':
          try { console.log('[display] received siren cmd; audioReady=', audioReady) } catch {}
          setLastSirenEventAt(Date.now())
          playSiren()
          break
        case 'setClock':
          if (p && typeof p.secs === 'number') setTimeSeconds(p.secs as number)
          break
        case 'setPeriod':
          if (p && (typeof p.period === 'number' || typeof p.period === 'string')) setPeriod(Number(p.period))
          break
        case 'assignPenalty':
          if (p && typeof p.team === 'string' && (typeof p.player === 'string' || typeof p.player === 'number')) {
            const duration = typeof p.durationSec === 'number' ? p.durationSec : (typeof p.duration === 'number' ? p.duration : 120)
            assignPenalty(p.team as 'home' | 'guest', String(p.player), Number(duration))
          }
          break
        case 'clearPenalty':
          if (p && typeof p.team === 'string' && typeof p.slot === 'number') clearPenalty(p.team as 'home' | 'guest', p.slot as number)
          break
        case 'setNames':
          if (p) {
            if (typeof p.home === 'string') setTeamHome(p.home)
            if (typeof p.guest === 'string') setTeamGuest(p.guest)
          }
          break
        case 'sirenEveryMinute':
          if (p && typeof p.enabled === 'boolean') setSirenEveryMinute(Boolean(p.enabled))
          break
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // try to prime audio automatically (useful in OBS Browser Source or desktop where autoplay is allowed)
  useEffect(() => {
    const a = sirenRef.current
    if (!a) return
    try {
      a.volume = 1.0
      a.muted = true
      const p = a.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          a.pause()
          a.currentTime = 0
          a.muted = false
          setAudioReady(true)
          setLastPlayError(null)
        }).catch(() => {
          // remain not ready; require manual click
          setAudioReady(false)
          setLastPlayError('Autoplay blocked until user gesture')
        })
      }
    } catch {
      // ignore; manual unlock button will remain
    }
  }, [])

  // enable debug overlay with ?debug=1
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setDebugOn(params.get('debug') === '1' || params.get('dbg') === '1')
    } catch {}
  }, [])

  // probe support and availability
  useEffect(() => {
    const a = sirenRef.current
    if (!a) return
    try {
      const can = typeof a.canPlayType === 'function' ? a.canPlayType('audio/mpeg') : ''
      setAudioCanMp3(can === 'probably' || can === 'maybe')
    } catch {}
    // HEAD preflight to detect 404 or CORS
    try {
      fetch('/sounds/siren.mp3', { method: 'HEAD' }).then((r) => {
        setAudioHeadStatus(r.status)
        const ok = r.ok
        // If mp3 not OK or not supported, try wav fallback
        if (!ok || (typeof a.canPlayType === 'function' && !a.canPlayType('audio/mpeg'))) {
          fetch('/sounds/siren.wav', { method: 'HEAD' }).then((rw) => {
            setAudioAltHeadStatus(rw.status)
            if (rw.ok) setAudioSrc('/sounds/siren.wav')
          }).catch(() => setAudioAltHeadStatus('ERR'))
        }
      }).catch(() => {
        setAudioHeadStatus('ERR')
        // try wav as alternative
        fetch('/sounds/siren.wav', { method: 'HEAD' }).then((rw) => {
          setAudioAltHeadStatus(rw.status)
          if (rw.ok) setAudioSrc('/sounds/siren.wav')
        }).catch(() => setAudioAltHeadStatus('ERR'))
      })
    } catch {
      setAudioHeadStatus('ERR')
    }
  }, [])

  // tick penalties every second ONLY when timerRunning
  useEffect(() => {
    const id = setInterval(() => {
      if (!timerRunning) return
      setHomePenalties((slots) =>
        slots.map((sl) => {
          if (sl.remaining == null) return sl
          const next = Math.max(0, sl.remaining - 1)
          if (next === 0) return { player: '--', remaining: null }
          return { player: sl.player, remaining: next }
        })
      )
      setGuestPenalties((slots) =>
        slots.map((sl) => {
          if (sl.remaining == null) return sl
          const next = Math.max(0, sl.remaining - 1)
          if (next === 0) return { player: '--', remaining: null }
          return { player: sl.player, remaining: next }
        })
      )
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  // minute siren removed

  function playSiren() {
    try {
      if (!sirenRef.current) return
      // ensure latest source is loaded
      try { sirenRef.current.load() } catch {}
      sirenRef.current.currentTime = 0
      const p = sirenRef.current.play()
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          // Keep non-blocking unlock button visible; do not show overlay
          setAudioReady(false)
          try { console.warn('[display] siren play() failed', err) } catch {}
          setLastPlayError(String((err as any)?.message || err || 'unknown'))
        })
      }
    } catch {
      // ignore
    }
  }

  // user gesture to unlock audio on mobile
  function unlockAudio() {
    try {
      if (!sirenRef.current) return
      sirenRef.current.muted = true
      try { sirenRef.current.load() } catch {}
      sirenRef.current.play().then(() => {
        sirenRef.current!.pause()
        sirenRef.current!.muted = false
        setAudioReady(true)
        setLastPlayError(null)
      }).catch(() => setAudioReady(false))
    } catch {
      setAudioReady(false)
    }
  }

  function assignPenalty(team: 'home' | 'guest', player: string, durationSec = 120) {
    if (team === 'home') {
      setHomePenalties((slots) => {
        const copy = [...slots]
        for (let i = 0; i < copy.length; i++) {
          if (copy[i].remaining == null) {
            copy[i] = { player, remaining: durationSec }
            break
          }
        }
        return copy
      })
    } else {
      setGuestPenalties((slots) => {
        const copy = [...slots]
        for (let i = 0; i < copy.length; i++) {
          if (copy[i].remaining == null) {
            copy[i] = { player, remaining: durationSec }
            break
          }
        }
        return copy
      })
    }
  }

  function clearPenalty(team: 'home' | 'guest', slot: number) {
    if (team === 'home') {
      setHomePenalties((slots) => {
        const copy = [...slots]
        copy[slot - 1] = { player: '--', remaining: null }
        return copy
      })
    } else {
      setGuestPenalties((slots) => {
        const copy = [...slots]
        copy[slot - 1] = { player: '--', remaining: null }
        return copy
      })
    }
  }

  function fmtSec(sec: number | null) {
    if (sec == null) return '--:--'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' + s : s}`
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: '1920px', height: '1080px', boxSizing: 'border-box' }}>
        <style>{`
          .container { background: transparent; border:none; border-radius:0; width:100%; height:100%; display:grid; padding:0 0 12px 0;
            grid-template-columns: 520px 792px 520px;
            grid-template-rows: 288px 448px 288px;
            row-gap: 24px; column-gap: 40px;
            grid-template-areas: "header-home header-clock header-guest" "score-home info-period score-guest" "penalties-home info-bottom penalties-guest"; 
            font-family: 'Teko', sans-serif; }
          .digit-font{ font-weight:700; text-align:center; line-height:1 }
          .grid-cell{ display:grid; place-items:center; overflow:hidden }
          .header-text{ font-size:96px; color:#fff; text-transform:uppercase; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
          #main-clock{ font-size:168px; color:#FF4136 }
          .score{ font-size:280px; color:#FFD700 }
          .period-label{ font-size:64px; color:#fff }
          .penalties-section{ display:grid; width:100%; height:100%; grid-template-columns:1fr 1fr; grid-template-rows:56px 1fr 1fr; gap:20px; padding-bottom:8px }
          .penalty-header{ font-size:40px; color:#fff; text-align:center }
          .penalty-player{ font-size:96px; color:#FF4136; line-height:1 }
          .penalty-time{ font-size:96px; color:#FFD700; line-height:1 }
          .period-wrap{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px }
          .period-number{ font-size:140px; color:#ffffff }
        `}</style>

        <div className="container">
          <div style={{ gridArea: 'header-home' }} className="grid-cell"><h2 className="header-text">{teamHome}</h2></div>
          <div style={{ gridArea: 'header-clock' }} className="grid-cell"><div id="main-clock" className="digit-font">{Math.floor(timeSeconds / 60)}:{String(timeSeconds % 60).padStart(2, '0')}</div></div>
          <div style={{ gridArea: 'header-guest' }} className="grid-cell"><h2 className="header-text">{teamGuest}</h2></div>

          <div style={{ gridArea: 'score-home' }} className="grid-cell"><div className="digit-font score">{homeScore}</div></div>
          <div style={{ gridArea: 'info-period' }} className="grid-cell">
            <div className="period-wrap">
              <div className="period-label">PER</div>
              <div className="digit-font period-number">{period}</div>
            </div>
          </div>
          <div style={{ gridArea: 'score-guest' }} className="grid-cell"><div className="digit-font score">{guestScore}</div></div>

          <div style={{ gridArea: 'penalties-home' }}>
            <div className="penalties-section">
              <div className="penalty-header">PLYR</div>
              <div className="penalty-header">PENALTY</div>
              <div className="penalty-player digit-font">{homePenalties[0].player}</div>
              <div className="penalty-time digit-font">{fmtSec(homePenalties[0].remaining)}</div>
              <div className="penalty-player digit-font">{homePenalties[1].player}</div>
              <div className="penalty-time digit-font">{fmtSec(homePenalties[1].remaining)}</div>
            </div>
          </div>

          <div style={{ gridArea: 'info-bottom' }} />

          <div style={{ gridArea: 'penalties-guest' }}>
            <div className="penalties-section">
              <div className="penalty-header">PLYR</div>
              <div className="penalty-header">PENALTY</div>
              <div className="penalty-player digit-font">{guestPenalties[0].player}</div>
              <div className="penalty-time digit-font">{fmtSec(guestPenalties[0].remaining)}</div>
              <div className="penalty-player digit-font">{guestPenalties[1].player}</div>
              <div className="penalty-time digit-font">{fmtSec(guestPenalties[1].remaining)}</div>
            </div>
          </div>
        </div>

        <audio
          ref={sirenRef}
          preload="auto"
          playsInline
          onLoadedData={() => { try { setAudioReadyState(sirenRef.current?.readyState ?? null); setAudioNetworkState(sirenRef.current?.networkState ?? null) } catch {} }}
          onError={() => { try { setAudioReadyState(sirenRef.current?.readyState ?? null); setAudioNetworkState(sirenRef.current?.networkState ?? null); setLastPlayError('audio element error event') } catch {} }}
        >
          {audioSrc.endsWith('.wav') ? (
            <source src={audioSrc} type="audio/wav" />
          ) : (
            <source src={audioSrc} type="audio/mpeg" />
          )}
        </audio>
        {/* Manual audio unlock button (non-blocking) */}
        {!audioReady && (
          <button onClick={unlockAudio} title="Clicca per abilitare i suoni" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(127,29,29,0.9)', color: '#fff', border: '1px solid #7f1d1d', borderRadius: 8, padding: '8px 12px', zIndex: 5 }}>
            Attiva Audio
          </button>
        )}
        {/* Debug overlay */}
        {debugOn && (
          <div style={{ position: 'absolute', left: 12, top: 12, background: 'rgba(0,0,0,0.6)', color: '#0f0', border: '1px solid #0f0', borderRadius: 8, padding: '8px 12px', zIndex: 6, fontFamily: 'monospace', fontSize: 12 }}>
            <div>AudioReady: {String(audioReady)}</div>
            <div>canPlay(mp3): {audioCanMp3 === null ? 'n/a' : String(audioCanMp3)}</div>
            <div>Paused: {String(sirenRef.current?.paused)}</div>
            <div>Muted: {String(sirenRef.current?.muted)}</div>
            <div>LastError: {lastPlayError || '-'}</div>
            <div>LastSirenCmd: {lastSirenEventAt ? new Date(lastSirenEventAt).toLocaleTimeString() : '-'}</div>
            <div>HEAD /sounds/siren.mp3: {audioHeadStatus === null ? '...' : String(audioHeadStatus)}</div>
            <div>HEAD /sounds/siren.wav: {audioAltHeadStatus === null ? '...' : String(audioAltHeadStatus)}</div>
            <div>Using src: {audioSrc}</div>
            <div>readyState: {audioReadyState ?? '-'}, networkState: {audioNetworkState ?? '-'}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button onClick={() => playSiren()} style={{ padding: '4px 8px', borderRadius: 6, background: '#0f0', color: '#000' }}>Test Siren (local)</button>
              {!audioReady && (<button onClick={unlockAudio} style={{ padding: '4px 8px', borderRadius: 6, background: '#fff', color: '#000' }}>Unlock</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

