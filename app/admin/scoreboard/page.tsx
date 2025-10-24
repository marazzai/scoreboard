import HockeyControlPanel from '@/components/admin/HockeyControlPanel';

export default async function Page() {
  return (
    <div className="min-h-screen bg-primary text-primary">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-12" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3.5rem)' }}>
        <HockeyControlPanel />
        {/* Mobile bottom spacer to avoid hidden buttons behind browser UI */}
        <div className="h-8 md:h-0" />
      </div>
    </div>
  );
}
