import MusicControl from '@/components/admin/MusicControl';

export default async function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Controllo Musica</h1>
      <MusicControl />
    </div>
  );
}
