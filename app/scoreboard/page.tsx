import React from 'react'

export default function Page() {
  // Redirect to the standalone static file containing the full-screen scoreboard.
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0; url=/scoreboard.html" />
        <title>Redirecting...</title>
      </head>
      <body />
    </html>
  )
}

