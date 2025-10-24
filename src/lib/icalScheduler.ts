import ical from 'node-ical';
import prisma from '@/src/lib/prisma';
import { RRule } from 'rrule';
import { errorToString } from '@/src/lib/errorUtils';

type Scheduled = {
  id: string;
  summary: string;
  start: Date;
  timer?: NodeJS.Timeout;
};

const scheduled: Scheduled[] = [];

function emitMusicAction(action: string, value?: unknown) {
  try {
    const g = globalThis as unknown as { __io?: { emit?: (event: string, payload?: unknown) => void } };
    const io = g.__io;
    if (io?.emit) {
      io.emit('music:update', { action, value });
    } else {
      console.warn('No Socket.io instance available to emit music action');
    }
  } catch (e) {
    const msg = errorToString(e);
    console.error('Error emitting music action', msg);
  }
}

function handleEvent(summary: string) {
  // look for triggers in summary like MUSIC:PLAY or MUSIC:PAUSE or MUSIC:VOLUME=0.5
  if (!summary) return;
  const s = summary.toUpperCase();
  if (s.includes('MUSIC:PLAY')) {
    emitMusicAction('play');
  } else if (s.includes('MUSIC:PAUSE')) {
    emitMusicAction('pause');
  } else if (s.includes('MUSIC:VOLUME=')) {
    const m = s.match(/MUSIC:VOLUME=([0-9\.]+)/);
    if (m) emitMusicAction('volume', Number(m[1]));
  } else if (s.includes('MUSIC:PLAYLIST=')) {
    const m = summary.match(/MUSIC:PLAYLIST=([^\s]+)/i);
    if (m) emitMusicAction('playlist', m[1]);
  }
}

export function clearAll() {
  for (const s of scheduled) {
    if (s.timer) clearTimeout(s.timer);
  }
  scheduled.length = 0;
}

export async function expandIcsOccurrences(icsString: string, windowHours = 24) {
  // parse ICS and return list of occurrences (uid, summary, start) expanded by RRULEs within window
  const parsed = ical.sync.parseICS(icsString);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const occurrences: Array<{ uid: string; summary: string; start: Date }> = [];

  for (const k of Object.keys(parsed)) {
    const ev = parsed[k] as Record<string, unknown> | undefined;
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;

  const summary = String(ev.summary ?? '');
  const uidBase = String(ev.uid ?? k);

    // If there's an RRULE, expand it
    if (ev.rrule) {
      try {
        // node-ical gives an rrule object (from rrule library). Treat it as RRule.
        const rule = (ev.rrule as unknown) as RRule;
        const between = rule.between(now, windowEnd, true);
        for (const occ of between) {
          occurrences.push({ uid: `${uidBase}::${occ.toISOString()}`, summary, start: occ as Date });
        }
      } catch (err: unknown) {
        const msg = errorToString(err);
        console.warn('RRULE expansion failed for', uidBase, msg);
      }
    } else if (ev.recurrences) {
      // node-ical may provide recurrences map
      for (const rkey of Object.keys((ev.recurrences ?? {}) as Record<string, unknown>)) {
        const r = (ev.recurrences as Record<string, unknown>)[rkey] as Record<string, unknown> | undefined;
        const start = new Date(String(r?.start));
        if (start >= now && start <= windowEnd) {
          occurrences.push({ uid: `${uidBase}::${start.toISOString()}`, summary, start });
        }
      }
    } else {
      const start = new Date(String(ev.start));
      if (start >= now && start <= windowEnd) {
        occurrences.push({ uid: uidBase, summary, start });
      } else if (start <= now && (now.getTime() - start.getTime()) < 1000 * 60 * 5) {
        // recent past: trigger immediately
        occurrences.push({ uid: uidBase, summary, start: now });
      }
    }
  }

  return occurrences;
}

export async function scheduleFromICS(icsString: string, windowHours = 24) {
  const occ = await expandIcsOccurrences(icsString, windowHours);

  const created: Array<{ uid: string; summary: string; start: Date }> = [];
  for (const o of occ) {
    try {
      // upsert by unique uid (which now may include timestamp suffix for occurrences)
      await prisma.scheduledEvent.upsert({
        where: { uid: o.uid },
        update: { summary: o.summary, start: o.start },
        create: { uid: o.uid, summary: o.summary, start: o.start }
      });
      created.push(o);
    } catch (e: unknown) {
      const msg = errorToString(e);
      console.error('Error persisting scheduled event', msg);
    }
  }

  // schedule timers for not-fired events within window
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const notFired = await prisma.scheduledEvent.findMany({ where: { fired: false, start: { gte: now, lte: windowEnd } } });
  for (const e of notFired) {
    const delay = Math.max(0, e.start.getTime() - now.getTime());
    const timer = setTimeout(async () => {
      try {
        handleEvent(e.summary);
        await prisma.scheduledEvent.update({ where: { id: e.id }, data: { fired: true } });
      } catch (err: unknown) {
        const msg = errorToString(err);
        console.error('Error handling scheduled event', msg);
      }
    }, delay);
    scheduled.push({ id: String(e.id), summary: e.summary, start: e.start, timer });
  }

  return created;
}

export async function restoreScheduledFromDB(windowHours = 24) {
  // called at startup to schedule pending events
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const notFired = await prisma.scheduledEvent.findMany({ where: { fired: false, start: { gte: now, lte: windowEnd } } });
  for (const e of notFired) {
    const delay = e.start.getTime() - now.getTime();
    const timer = setTimeout(async () => {
      try {
        handleEvent(e.summary);
        await prisma.scheduledEvent.update({ where: { id: e.id }, data: { fired: true } });
      } catch (err: unknown) {
        const msg = errorToString(err);
        console.error('Error handling scheduled event', msg);
      }
    }, delay);
    scheduled.push({ id: String(e.id), summary: e.summary, start: e.start, timer });
  }
  return notFired.length;
}

export async function listScheduledEvents(limit = 100) {
  return prisma.scheduledEvent.findMany({ orderBy: { start: 'asc' }, take: limit });
}

export async function cancelScheduledEvent(uidOrId: string) {
  // try id first then uid
  const maybeId = Number(uidOrId);
  let byId = null;
  if (!Number.isNaN(maybeId)) {
    byId = await prisma.scheduledEvent.findUnique({ where: { id: maybeId } }).catch(() => null);
  }
  if (byId) {
    await prisma.scheduledEvent.delete({ where: { id: byId.id } });
    // clear timers
    const idx = scheduled.findIndex(s => s.id === String(byId.id));
    if (idx >= 0) {
      const s = scheduled.splice(idx, 1)[0];
      if (s.timer) clearTimeout(s.timer);
    }
    return true;
  }
  const byUid = await prisma.scheduledEvent.findUnique({ where: { uid: uidOrId } }).catch(() => null);
  if (byUid) {
    await prisma.scheduledEvent.delete({ where: { id: byUid.id } });
    const idx = scheduled.findIndex(s => s.id === String(byUid.id));
    if (idx >= 0) {
      const s = scheduled.splice(idx, 1)[0];
      if (s.timer) clearTimeout(s.timer);
    }
    return true;
  }
  return false;
}

export async function forceTriggerScheduledEvent(uidOrId: string) {
  const byUid = await prisma.scheduledEvent.findUnique({ where: { uid: uidOrId } }).catch(() => null);
  const maybeId2 = Number(uidOrId);
  const byId = (!Number.isNaN(maybeId2)) ? await prisma.scheduledEvent.findUnique({ where: { id: maybeId2 } }).catch(() => null) : null;
  const ev = byUid ?? byId ?? null;
  if (!ev) return false;
  try {
    handleEvent(ev.summary);
    await prisma.scheduledEvent.update({ where: { id: ev.id }, data: { fired: true } });
    // clear any in-memory timers
    const idx = scheduled.findIndex(s => s.id === String(ev.id));
    if (idx >= 0) {
      const s = scheduled.splice(idx, 1)[0];
      if (s.timer) clearTimeout(s.timer);
    }
    return true;
  } catch (err: unknown) {
    const msg = errorToString(err);
    console.error('Error forcing scheduled event', msg);
    return false;
  }
}
