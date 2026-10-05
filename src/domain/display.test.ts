import { describe, expect, it } from 'vitest';
import { distinct } from './display.ts';

describe('distinct', () => {
  it('keeps the first occurrence order', () => {
    expect(distinct(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });
});
