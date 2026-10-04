// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ENTRY_TYPES } from '../../src/domain/languages.ts';
import { entryJsonSchema, toGeminiSchema } from './geminiSchema.ts';

/** Every key used anywhere in a JSON value. */
function keys(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((item) => keys(item, found));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      found.add(key);
      keys(value, found);
    }
  }
  return found;
}

describe('toGeminiSchema', () => {
  it('turns const into a one-value enum and drops unsupported keywords', () => {
    expect(
      toGeminiSchema({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          type: { type: 'string', const: 'noun' },
          text: { type: 'string', minLength: 1, pattern: '\\S' },
        },
        required: ['type', 'text'],
      }),
    ).toEqual({
      type: 'object',
      properties: { type: { type: 'string', enum: ['noun'] }, text: { type: 'string' } },
      required: ['type', 'text'],
    });
  });
});

describe('entryJsonSchema', () => {
  it.each(ENTRY_TYPES)('only uses keywords supported by Gemini (%s)', (type) => {
    const used = keys(entryJsonSchema(type));
    for (const unsupported of ['const', 'minLength', '$schema', 'pattern']) {
      expect(used.has(unsupported)).toBe(false);
    }
  });

  it('describes 6-person tenses as fixed-size tuples', () => {
    const verb = JSON.stringify(entryJsonSchema('verb'));
    expect(verb).toContain('"prefixItems"');
    expect(verb).toContain('"passatoProssimo"');
    expect(verb).toContain('"enum":["verb"]');
  });
});
