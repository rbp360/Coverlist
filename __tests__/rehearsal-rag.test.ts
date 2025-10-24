import { ragStatusFromISO } from '@/lib/rehearsal';

describe('ragStatusFromISO', () => {
  const fixedNow = new Date(Date.UTC(2025, 0, 31)); // 2025-01-31

  it('returns null for missing/invalid input', () => {
    expect(ragStatusFromISO(undefined, fixedNow)).toBeNull();
    expect(ragStatusFromISO('not-a-date', fixedNow)).toBeNull();
  });

  it('green when within 31 days', () => {
    expect(ragStatusFromISO('2025-01-31', fixedNow)).toBe('green'); // 0 days
    expect(ragStatusFromISO('2025-01-01', fixedNow)).toBe('green'); // 30 days
    expect(ragStatusFromISO('2024-12-31', fixedNow)).toBe('green'); // 31 days
  });

  it('amber when between 32 and 90 days', () => {
    expect(ragStatusFromISO('2024-12-30', fixedNow)).toBe('amber'); // 32 days
    expect(ragStatusFromISO('2024-11-02', fixedNow)).toBe('amber'); // ~90 days
  });

  it('red when older than 90 days', () => {
    expect(ragStatusFromISO('2024-10-31', fixedNow)).toBe('red'); // 92 days
    expect(ragStatusFromISO('2020-01-01', fixedNow)).toBe('red');
  });
});
