export const dynamic = 'force-dynamic';

export default function ScoreboardLayout({ children }: { children: React.ReactNode }) {
  // No nav, full-bleed content only
  return (
    <html>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
