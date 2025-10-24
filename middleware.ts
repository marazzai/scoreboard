import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect OBS admin UI
  if (pathname.startsWith('/admin/obs') && !pathname.startsWith('/admin/obs/login')) {
    const cookie = req.cookies.get('obsAuth')?.value
    if (cookie !== '1') {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/obs/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/obs/:path*'],
}
