/* eslint-disable @typescript-eslint/no-require-imports */
// Custom Next.js server with Socket.IO (CommonJS for robust Windows support)
const http = require('http')
const { parse } = require('url')
const next = require('next')
const prisma = (function() {
  try { return require('./src/lib/prisma').default } catch { try { return require('./dist/src/lib/prisma').default } catch { return null } }
})()

// Decide dev mode: honor NODE_ENV when set, else fall back to dev
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

async function main() {
  await app.prepare()

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true)
    return handle(req, res, parsedUrl)
  })

  // Socket.IO
  let io
  try {
    const { Server } = require('socket.io')
    io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } })
  } catch {
    io = null
  }

  if (io) {
    const sb = require('./src/lib/scoreboardState.js')
    // Load persistent snapshot from DB at startup
    if (prisma && typeof prisma.scoreboardSnapshot?.findUnique === 'function') {
      (async () => {
        try {
          const snap = await prisma.scoreboardSnapshot.findUnique({ where: { id: 1 } })
          if (snap) {
            const initial = {
              homeGoals: Number(snap.homeGoals ?? 0),
              awayGoals: Number(snap.awayGoals ?? 0),
              period: Number(snap.period ?? 1),
              timeSeconds: Number(snap.timeSeconds ?? 1200),
              timerRunning: Boolean(snap.timerRunning ?? false),
              teamHome: String(snap.teamHome ?? 'HOME'),
              teamGuest: String(snap.teamGuest ?? 'GUEST'),
              sirenEveryMinute: Boolean(snap.sirenEveryMinute ?? false),
              homePenalties: Array.isArray(snap.homePenalties) ? snap.homePenalties : [{ player: '--', remaining: null }, { player: '--', remaining: null }],
              guestPenalties: Array.isArray(snap.guestPenalties) ? snap.guestPenalties : [{ player: '--', remaining: null }, { player: '--', remaining: null }],
            }
            sb.setScoreboardState(initial)
            try { io.emit('scoreboard:update', initial) } catch {}
          }
        } catch { /* ignore */ }
      })()
    }

    // Debounced persistence to DB
    let saveTimer = null
    const scheduleSave = () => {
      if (!prisma || typeof prisma.scoreboardSnapshot?.upsert !== 'function') return
      if (saveTimer) return
      saveTimer = setTimeout(async () => {
        saveTimer = null
        try {
          const cur = sb.getScoreboardState()
          await prisma.scoreboardSnapshot.upsert({
            where: { id: 1 },
            update: {
              homeGoals: cur.homeGoals,
              awayGoals: cur.awayGoals,
              period: cur.period,
              timeSeconds: cur.timeSeconds,
              timerRunning: cur.timerRunning,
              teamHome: cur.teamHome,
              teamGuest: cur.teamGuest,
              sirenEveryMinute: !!cur.sirenEveryMinute,
              homePenalties: cur.homePenalties,
              guestPenalties: cur.guestPenalties,
            },
            create: {
              id: 1,
              homeGoals: cur.homeGoals ?? 0,
              awayGoals: cur.awayGoals ?? 0,
              period: cur.period ?? 1,
              timeSeconds: cur.timeSeconds ?? 1200,
              timerRunning: !!cur.timerRunning,
              teamHome: cur.teamHome ?? 'HOME',
              teamGuest: cur.teamGuest ?? 'GUEST',
              sirenEveryMinute: !!cur.sirenEveryMinute,
              homePenalties: Array.isArray(cur.homePenalties) ? cur.homePenalties : [{ player: '--', remaining: null }, { player: '--', remaining: null }],
              guestPenalties: Array.isArray(cur.guestPenalties) ? cur.guestPenalties : [{ player: '--', remaining: null }, { player: '--', remaining: null }],
            }
          })
        } catch { /* ignore */ }
      }, 1000)
    }
    // Server-authoritative clock tick to keep all admins/displays in sync
    let lastMinuteSirenAtSec = null
    setInterval(() => {
      try {
        const cur = sb.getScoreboardState()
        if (!cur.timerRunning) return
        const nextSec = Math.max(0, Number(cur.timeSeconds || 0) - 1)
        // Decrement penalties when clock is running
        const decSlots = (slots) => (Array.isArray(slots) ? slots.map((sl) => {
          const player = (sl && typeof sl.player !== 'undefined') ? String(sl.player) : '--'
          const rem = (sl && typeof sl.remaining === 'number') ? sl.remaining : null
          if (rem == null) return { player, remaining: null }
          const nextR = Math.max(0, rem - 1)
          if (nextR === 0) return { player: '--', remaining: null }
          return { player, remaining: nextR }
        }) : [{ player: '--', remaining: null }, { player: '--', remaining: null }])

        const next = {
          ...cur,
          timeSeconds: nextSec,
          timerRunning: nextSec === 0 ? false : cur.timerRunning,
          homePenalties: decSlots(cur.homePenalties),
          guestPenalties: decSlots(cur.guestPenalties)
        }
        sb.setScoreboardState(next)
        io.emit('scoreboard:update', next)
  scheduleSave()

        // Emit minute siren at mm:00 when enabled, without spamming
        if (next.sirenEveryMinute === true && nextSec > 0 && nextSec % 60 === 0) {
          if (lastMinuteSirenAtSec !== nextSec) {
            lastMinuteSirenAtSec = nextSec
            try { io.emit('scoreboard:cmd', { cmd: 'siren', payload: {} }) } catch {}
          }
        }
      } catch {}
    }, 1000)
    io.on('connection', (socket) => {
      socket.on('join', (room) => {
        if (typeof room === 'string') socket.join(room)
        // When a display joins, immediately send the latest state
        if (room === 'displays') {
          try { socket.emit('scoreboard:update', sb.getScoreboardState()) } catch {}
        }
      })

      // Forward admin -> display commands
      socket.on('scoreboard:cmd', (payload) => {
        try { io.to('displays').emit('scoreboard:cmd', payload) } catch {}
        // Maintain server-side state for commands that affect persistent view (names, siren flag, reset/clock/period)
        try {
          if (payload && typeof payload === 'object') {
            const p = payload.payload || {}
            switch (payload.cmd) {
              case 'setNames':
                sb.setScoreboardState({ teamHome: String(p.home || 'HOME'), teamGuest: String(p.guest || 'GUEST') })
                break
              case 'sirenEveryMinute':
                sb.setScoreboardState({ sirenEveryMinute: !!p.enabled })
                break
              case 'setClock':
                if (typeof p.secs === 'number') sb.setScoreboardState({ timeSeconds: p.secs })
                break
              case 'setPeriod':
                if (typeof p.period === 'number' || typeof p.period === 'string') sb.setScoreboardState({ period: Number(p.period) })
                break
              case 'assignPenalty': {
                const team = (p && typeof p.team === 'string') ? p.team : null
                const player = (p && (typeof p.player === 'string' || typeof p.player === 'number')) ? String(p.player) : '--'
                const duration = (p && typeof p.durationSec === 'number') ? p.durationSec : (typeof p?.duration === 'number' ? p.duration : 120)
                const cur = sb.getScoreboardState()
                if (team === 'home' || team === 'guest') {
                  const slots = team === 'home' ? [...cur.homePenalties] : [...cur.guestPenalties]
                  for (let i = 0; i < slots.length; i++) {
                    if (slots[i].remaining == null) { slots[i] = { player, remaining: duration }; break }
                  }
                  sb.setScoreboardState(team === 'home' ? { homePenalties: slots } : { guestPenalties: slots })
                }
                break
              }
              case 'clearPenalty': {
                const team = (p && typeof p.team === 'string') ? p.team : null
                const slot = (p && typeof p.slot === 'number') ? p.slot : null
                if ((team === 'home' || team === 'guest') && slot && slot >= 1 && slot <= 2) {
                  const cur = sb.getScoreboardState()
                  if (team === 'home') {
                    const slots = [...cur.homePenalties]; slots[slot - 1] = { player: '--', remaining: null }
                    sb.setScoreboardState({ homePenalties: slots })
                  } else {
                    const slots = [...cur.guestPenalties]; slots[slot - 1] = { player: '--', remaining: null }
                    sb.setScoreboardState({ guestPenalties: slots })
                  }
                }
                break
              }
              case 'reset':
                sb.resetScoreboardState()
                break
              default:
                break
            }
          }
        } catch {}
      })
      // Forward state updates to ALL clients (admins + displays) and persist snapshot
      socket.on('scoreboard:update', (payload) => {
        try { io.emit('scoreboard:update', payload) } catch {}
        // Update server-side snapshot
        try {
          if (payload && typeof payload === 'object') sb.setScoreboardState(payload)
          scheduleSave()
        } catch {}
      })
    })
  }

  const port = parseInt(process.env.PORT || '3000', 10)
  server.listen(port, '0.0.0.0', () => {
    // Print helpful LAN addresses
    try {
      const os = require('os')
      const nets = os.networkInterfaces()
      const addrs = []
      for (const name of Object.keys(nets)) {
        for (const n of nets[name] || []) {
          if (n.family === 'IPv4' && !n.internal) addrs.push(n.address)
        }
      }
      const lanList = addrs.map(a => `http://${a}:${port}`).join(', ')
      console.log(`> Ready on http://localhost:${port} (dev=${dev})`)
      if (lanList) console.log(`> LAN access: ${lanList}`)
    } catch {
      console.log(`> Ready on http://localhost:${port} (dev=${dev})`)
    }

    // Ensure OBS stays connected across restarts: poll status and auto-connect
    try {
      const baseUrl = process.env.SELF_BASE_URL || `http://localhost:${port}`
      const pollObs = async () => {
        try {
          const r = await fetch(`${baseUrl}/api/obs/status`)
          const d = await r.json().catch(() => ({}))
          const connected = Boolean(d && d.connected)
          if (!connected) {
            try {
              await fetch(`${baseUrl}/api/obs/connect`, { method: 'POST' })
            } catch {}
          }
        } catch {}
      }
      // initial attempt soon after boot, then periodic
      setTimeout(pollObs, 1500)
      setInterval(pollObs, 5000)
    } catch {}
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
