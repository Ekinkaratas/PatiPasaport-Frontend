import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './hooks';

describe('safeRedirectPath', () => {
  it.each([
    [null, '/panel'],
    ['', '/panel'],
    ['/panel/pets?x=1', '/panel/pets?x=1'],
    ['https://evil.com', '/panel'],
    ['//evil.com', '/panel'],
    ['/\\evil.com', '/panel'],
    ['panel', '/panel'],
  ])('%s -> %s', (next, expected) => {
    expect(safeRedirectPath(next)).toBe(expected);
  });
});
