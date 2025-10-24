const defaultState = {
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

let state = { ...defaultState }

function getScoreboardState() {
  return state
}

function setScoreboardState(next) {
  state = { ...state, ...(next || {}) }
  return state
}

function resetScoreboardState() {
  state = { ...defaultState }
  return state
}

module.exports = { getScoreboardState, setScoreboardState, resetScoreboardState }
