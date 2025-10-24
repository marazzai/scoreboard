import { NextResponse } from 'next/server'
import { getScoreboardState } from '@/src/lib/scoreboardState'

export async function GET() {
  const state = getScoreboardState()
  return NextResponse.json(state)
}
