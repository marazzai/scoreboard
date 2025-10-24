import { describe, it, expect } from 'vitest';
import { expandIcsOccurrences } from '../src/lib/icalScheduler';

describe('icalScheduler expand', () => {
  it('expands single VEVENT', async () => {
    const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:1\nDTSTART:20251022T120000Z\nSUMMARY:Music:Play\nEND:VEVENT\nEND:VCALENDAR`;
    const occ = await expandIcsOccurrences(ics, 48);
    expect(occ.length).toBeGreaterThanOrEqual(1);
    expect(occ[0].summary).toContain('Music');
  });
});
