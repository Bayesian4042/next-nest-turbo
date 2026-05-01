import { normalizeMapStatus } from '@/preprocessor/utils/normalize-map-status';

describe('normalizeMapStatus', () => {
  it('returns MAPPED for "Mapped" (case-insensitive)', () => {
    expect(normalizeMapStatus('Mapped')).toBe('MAPPED');
    expect(normalizeMapStatus('mapped')).toBe('MAPPED');
    expect(normalizeMapStatus('MAPPED')).toBe('MAPPED');
  });

  it('returns PENDING for "Pending" and any other value', () => {
    expect(normalizeMapStatus('Pending')).toBe('PENDING');
    expect(normalizeMapStatus('pending')).toBe('PENDING');
    expect(normalizeMapStatus('')).toBe('PENDING');
  });

  it('trims surrounding whitespace before matching', () => {
    expect(normalizeMapStatus('  Mapped  ')).toBe('MAPPED');
    expect(normalizeMapStatus('  Pending  ')).toBe('PENDING');
  });
});
