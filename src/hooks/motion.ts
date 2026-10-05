/**
 * True when animations should be skipped: the user asked the system to reduce motion,
 * or the environment cannot tell (no matchMedia, as in jsdom).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
