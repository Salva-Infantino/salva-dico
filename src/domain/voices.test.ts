import { describe, expect, it } from 'vitest';
import { pickVoice } from './voices.ts';

const voice = (lang: string, localService = true, name = lang) => ({ lang, localService, name });

describe('pickVoice', () => {
  it('returns null when no voice speaks the language', () => {
    expect(pickVoice([voice('fr-FR'), voice('de-DE')], 'it')).toBeNull();
    expect(pickVoice([], 'fr')).toBeNull();
  });

  it('prefers the variety of the dictionary (Spain Spanish, American English)', () => {
    const voices = [voice('es-MX'), voice('es-ES'), voice('en-GB'), voice('en-US')];
    expect(pickVoice(voices, 'es')?.lang).toBe('es-ES');
    expect(pickVoice(voices, 'en')?.lang).toBe('en-US');
  });

  it('falls back to another variety of the language', () => {
    expect(pickVoice([voice('fr-CA')], 'fr')?.lang).toBe('fr-CA');
  });

  it('prefers a voice installed on the device, which also works offline', () => {
    const voices = [voice('it-IT', false, 'online'), voice('it-IT', true, 'local')];
    expect(pickVoice(voices, 'it')?.name).toBe('local');
    // The expected variety still wins over a local voice of another variety.
    expect(pickVoice([voice('en-GB', true), voice('en-US', false)], 'en')?.lang).toBe('en-US');
  });

  it('accepts the tag formats of every platform', () => {
    expect(pickVoice([voice('es_ES')], 'es')?.lang).toBe('es_ES');
    expect(pickVoice([voice('it')], 'it')?.lang).toBe('it');
    // "en" must not match "eu" or a longer language code.
    expect(pickVoice([voice('enm')], 'en')).toBeNull();
  });
});
