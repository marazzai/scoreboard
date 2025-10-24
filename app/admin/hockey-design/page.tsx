import HockeyControlPanel from '@/components/admin/HockeyControlPanel'

export const metadata = { title: 'Hockey Control - Design Preview' }

export default function Page() {
  return (
    <div className="min-h-screen bg-primary text-primary">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Pannello Hockey – Design Preview</h1>
        <p className="text-secondary mb-6">Questa è una preview solo UI (tema scuro, mobile-first). I pulsanti non sono collegati alla logica di gioco.</p>
        <HockeyControlPanel />
      </div>
    </div>
  )
}
