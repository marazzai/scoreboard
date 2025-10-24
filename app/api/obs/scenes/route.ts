import { NextResponse } from 'next/server';
import obsController from '@/src/lib/obs';

export async function GET() {
  try {
    const scenes = await obsController.listScenes();
    // if empty and not connected, respond with 503 so client can show a helpful message
    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ scenes: [] }, { status: 503 });
    }
    return NextResponse.json({ scenes });
  } catch {
    return NextResponse.json({ scenes: [] }, { status: 500 });
  }
}
