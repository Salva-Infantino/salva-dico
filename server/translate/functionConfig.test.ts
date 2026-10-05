// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { config } from '../../netlify/functions/translate.ts';
import { TRANSLATE_PATH } from '../../src/domain/translateApi.ts';

describe('translate function config', () => {
  it('serves the path the client calls (written as a literal for Netlify)', () => {
    expect(config.path).toBe(TRANSLATE_PATH);
  });
});
