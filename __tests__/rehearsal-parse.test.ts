import { parseFlexibleDateToISO, formatISOToDDMMYY } from '@/lib/rehearsal';

describe('parseFlexibleDateToISO', () => {
  it('returns empty string for clearing', () => {
    expect(parseFlexibleDateToISO('')).toBe('');
    expect(parseFlexibleDateToISO('   ')).toBe('');
  });

  it('accepts DD/MM/YY and D/M/YY', () => {
    expect(parseFlexibleDateToISO('10/10/20')).toBe('2020-10-10');
    expect(parseFlexibleDateToISO('1/1/25')).toBe('2025-01-01');
  });

  it('accepts DD/MM/YYYY and D/M/YYYY', () => {
    expect(parseFlexibleDateToISO('10/10/2020')).toBe('2020-10-10');
    expect(parseFlexibleDateToISO('1/1/2025')).toBe('2025-01-01');
  });

  it('accepts without separators DDMMYY and DDMMYYYY', () => {
    expect(parseFlexibleDateToISO('101020')).toBe('2020-10-10');
    expect(parseFlexibleDateToISO('10102020')).toBe('2020-10-10');
    expect(parseFlexibleDateToISO('311224')).toBe('2024-12-31');
  });

  it('accepts other separators', () => {
    expect(parseFlexibleDateToISO('31-12-24')).toBe('2024-12-31');
    expect(parseFlexibleDateToISO('31.12.2024')).toBe('2024-12-31');
    expect(parseFlexibleDateToISO('31 12 2024')).toBe('2024-12-31');
  });

  it('validates dates properly (leap years etc.)', () => {
    expect(parseFlexibleDateToISO('29/02/24')).toBe('2024-02-29'); // leap year valid
    expect(parseFlexibleDateToISO('29/02/25')).toBeNull(); // not a leap year
    expect(parseFlexibleDateToISO('31/04/24')).toBeNull(); // April has 30 days
  });

  it('rejects malformed inputs', () => {
    expect(parseFlexibleDateToISO('abcd')).toBeNull();
    expect(parseFlexibleDateToISO('1010')).toBeNull(); // too short
    expect(parseFlexibleDateToISO('1234567')).toBeNull(); // 7 digits invalid
  });
});

describe('formatISOToDDMMYY', () => {
  it('formats ISO to DD/MM/YY', () => {
    expect(formatISOToDDMMYY('2025-01-01')).toBe('01/01/25');
    expect(formatISOToDDMMYY('2024-12-31')).toBe('31/12/24');
  });

  it('handles empty/invalid inputs', () => {
    expect(formatISOToDDMMYY(undefined)).toBe('');
    // cast through unknown to avoid ts-expect-error noise
    expect(formatISOToDDMMYY('2025/01/01' as unknown as string)).toBe('');
  });
});
