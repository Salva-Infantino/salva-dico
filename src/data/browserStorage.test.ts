import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage } from './browserStorage.ts';

afterEach(() => {
  localStorage.clear();
});

describe('browserStorage', () => {
  it('uses localStorage when available', () => {
    browserStorage().setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const storage = browserStorage();
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });
});
