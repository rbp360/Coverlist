import { parseLRC, findActiveIndex } from '../lib/lyrics';

describe('parseLRC', () => {
  it('parses single timestamps and text', () => {
    const lrc = '[00:10.50] Hello\n[00:12.000] World';
    const lines = parseLRC(lrc);
    expect(lines).toEqual([
      { time: 10500, text: 'Hello' },
      { time: 12000, text: 'World' },
    ]);
  });

  it('supports multiple time tags per line', () => {
    const lrc = '[00:01.00][00:02.00] Echo';
    const lines = parseLRC(lrc);
    expect(lines).toEqual([
      { time: 1000, text: 'Echo' },
      { time: 2000, text: 'Echo' },
    ]);
  });

  it('ignores metadata lines and deduplicates times', () => {
    const lrc = '[ar:Artist]\n[00:05.0] A\n[00:05.000] A';
    const lines = parseLRC(lrc);
    expect(lines).toEqual([{ time: 5000, text: 'A' }]);
  });
});

describe('findActiveIndex', () => {
  const lines = [
    { time: 0, text: 'start' },
    { time: 1000, text: 'one' },
    { time: 2000, text: 'two' },
  ];

  it('finds index before first tick', () => {
    expect(findActiveIndex(lines as any, 0)).toBe(0);
  });

  it('advances as time increases', () => {
    expect(findActiveIndex(lines as any, 1500)).toBe(1);
    expect(findActiveIndex(lines as any, 2500)).toBe(2);
  });
});
