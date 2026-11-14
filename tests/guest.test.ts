import { describe, expect, it } from 'vitest';
import { GUEST_COOKIE, getGuestId } from '../lib/guest';

const req = (value?: string) => ({
  cookies: { get: (n: string) => (n === GUEST_COOKIE && value !== undefined ? { value } : undefined) },
});

describe('getGuestId', () => {
  it('returns the cookie id when present', () => {
    const id = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
    expect(getGuestId(req(id))).toBe(id);
  });
  it('returns a new uuid v4 when absent', () => {
    const a = getGuestId(req());
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(getGuestId(req())).not.toBe(a);
  });
  it('replaces a malformed cookie', () => {
    expect(getGuestId(req('not-a-uuid'))).not.toBe('not-a-uuid');
  });
});
