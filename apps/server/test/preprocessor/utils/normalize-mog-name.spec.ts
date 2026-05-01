import { normalizeMogName } from '@/preprocessor/utils/normalize-mog-name';

const vocab = new Map<string, string>([
  ['potato', 'aloo'],
  ['spinach', 'palak'],
  ['chilled', 'fresh'],
  ['lamb', 'mutton'],
]);

describe('normalizeMogName', () => {
  it('replaces a known vocab token (whole word, case-insensitive)', () => {
    expect(normalizeMogName('Baby Potato Fresh', vocab)).toBe(
      'Baby aloo Fresh',
    );
    expect(normalizeMogName('Spinach Leaves Chilled', vocab)).toBe(
      'palak Leaves fresh',
    );
  });

  it('replaces multiple vocab tokens in a single name', () => {
    expect(normalizeMogName('Lamb Chilled Chunks', vocab)).toBe(
      'mutton fresh Chunks',
    );
  });

  it('returns trimmed original when no vocab match exists', () => {
    expect(normalizeMogName('  Basmati Rice  ', vocab)).toBe('Basmati Rice');
  });

  it('does not replace partial word matches', () => {
    expect(normalizeMogName('Sweet Potatoes', vocab)).toBe('Sweet Potatoes');
  });

  it('works with an empty vocab map', () => {
    expect(normalizeMogName('Chicken Curry', new Map())).toBe('Chicken Curry');
  });
});
