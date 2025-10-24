import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const MAPPING_PATH = path.join(DATA_DIR, 'obs-mapping.json');

function readMapping() {
  try {
    if (!fs.existsSync(MAPPING_PATH)) return {};
    const raw = fs.readFileSync(MAPPING_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeMapping(obj: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

export async function GET() {
  const m = readMapping();
  return NextResponse.json({ mapping: m });
}

export async function PUT(request: Request) {
  const body = await request.json();
  writeMapping(body);
  return NextResponse.json({ ok: true, mapping: body });
}
