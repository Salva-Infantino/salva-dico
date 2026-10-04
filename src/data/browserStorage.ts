import type { CursorStorage } from './entriesSync.ts';

/**
 * localStorage, or an in-memory fallback when it is unavailable (private mode,
 * blocked storage). Losing the sync cursor only costs a full resync.
 */
export function browserStorage(): CursorStorage {
  try {
    const probe = '__salva-dico-probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const values = new Map<string, string>();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    };
  }
}
