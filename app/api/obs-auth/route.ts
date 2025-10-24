import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: string }
  const pass = (body.password ?? '').toString()

  if (pass === 'cazzo') {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('obsAuth', '1', { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 60 * 60 * 12 }) // 12h
    return res
  }
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
