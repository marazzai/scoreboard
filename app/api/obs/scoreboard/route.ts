import { NextResponse } from 'next/server';
// auth removed: public API
import obsController from '@/src/lib/obs';
import { errorToString } from '@/src/lib/errorUtils';
import fs from 'fs';
import path from 'path';

type Body = { action: 'show' | 'hide' };

export async function POST(request: Request) {
  // auth removed: public API
  // previously required session; now public

  try {
    const body: Body = await request.json();
    const show = body.action === 'show';

    // ensure connected: try to connect using env settings if not connected
    // obsController exposes connected as a runtime property
  const isConnected = obsController.isConnected?.() ?? false;
  if (!isConnected) {
      const host = process.env.OBS_HOST || 'localhost';
      const port = Number(process.env.OBS_PORT || 4455);
      const password = process.env.OBS_PASSWORD || undefined;
      await obsController.connectOBS({ host, port, password });
    }

    // read mapping file for scene names
    const mapPath = path.join(process.cwd(), 'data', 'obs-mapping.json');
    type Mapping = { show?: string; hide?: string; source?: string };
    let mapping: Mapping = {};
    try {
      if (fs.existsSync(mapPath)) {
        const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8')) || {};
        if (raw && typeof raw === 'object') mapping = raw as Mapping;
      }
    } catch { mapping = {}; }

    const showScene = mapping.show ?? 'Partita';
    const hideScene = mapping.hide ?? 'Partita';
    const sourceName = mapping.source ?? 'Scoreboard Display';

    const targetScene = show ? showScene : hideScene;
    await obsController.switchScene(targetScene);
    await obsController.setSourceVisibility(targetScene, sourceName, show);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = errorToString(e);
    console.error('obs scoreboard control error', msg);
    return NextResponse.json({ error: 'Failed to control OBS', details: msg }, { status: 500 });
  }
}
