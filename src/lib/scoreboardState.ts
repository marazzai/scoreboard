export type ScoreboardState = {
  homeGoals: number
  awayGoals: number
  period: number
  timeSeconds: number
  timerRunning: boolean
  teamHome: string
  teamGuest: string
  sirenEveryMinute: boolean
  homePenalties: { player: string; remaining: number | null }[]
  guestPenalties: { player: string; remaining: number | null }[]
}

const defaultState: ScoreboardState = {
  homeGoals: 0,
  awayGoals: 0,
  period: 1,
  timeSeconds: 20 * 60,
  timerRunning: false,
  teamHome: 'HOME',
  teamGuest: 'GUEST',
  sirenEveryMinute: false,
  homePenalties: [ { player: '--', remaining: null }, { player: '--', remaining: null } ],
  guestPenalties: [ { player: '--', remaining: null }, { player: '--', remaining: null } ],
}

let state: ScoreboardState = { ...defaultState }

export function getScoreboardState(): ScoreboardState {
  return state
}

export function setScoreboardState(next: Partial<ScoreboardState>) {
  state = { ...state, ...next }
  return state
}

export function resetScoreboardState() {
  state = { ...defaultState }
  return state
}
