import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from './csp.ts';

describe('contentSecurityPolicy', () => {
  const production = contentSecurityPolicy({
    authDomain: 'salva-dico.netlify.app',
    useEmulators: false,
  });

  it('never allows inline scripts, eval or plugins', () => {
    expect(production).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("default-src 'self'");
  });

  it('allows the auth helper frame from the auth domain', () => {
    expect(production).toContain("frame-src 'self' https://salva-dico.netlify.app");
  });

  it('only allows the local emulators in an emulator build', () => {
    expect(production).not.toContain('127.0.0.1');
    const emulator = contentSecurityPolicy({ authDomain: 'x', useEmulators: true });
    expect(emulator).toContain('http://127.0.0.1:8080');
    expect(emulator).toContain('http://127.0.0.1:9099');
    expect(emulator).toContain("frame-src 'self' https://x http://127.0.0.1:9099");
  });
});
