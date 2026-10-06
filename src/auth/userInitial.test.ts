import { describe, expect, it } from 'vitest';
import { userInitial } from './userInitial.ts';

describe('userInitial', () => {
  it('prefers the name, then the e-mail', () => {
    expect(userInitial({ uid: 'u', email: 'x@example.com', name: 'salva Infantino' })).toBe('S');
    expect(userInitial({ uid: 'u', email: 'x@example.com' })).toBe('X');
  });

  it('falls back to a question mark', () => {
    expect(userInitial({ uid: 'u', email: null, name: ' ' })).toBe('?');
  });
});
