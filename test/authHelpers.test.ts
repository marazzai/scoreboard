import { describe, it, expect } from 'vitest';
import { enrichTokenWithPermissions } from '../src/lib/authHelpers';

describe('authHelpers', () => {
  it('returns role/permissions shape', async () => {
    const res = await enrichTokenWithPermissions('non-existent-id');
    expect(res).toHaveProperty('role');
    expect(Array.isArray(res.permissions)).toBe(true);
  });
});
