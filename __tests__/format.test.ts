import {
  titleCaseWords,
  shortMonthYY,
  buildRehearsalPlaylistName,
  buildSetlistPlaylistName,
} from '@/lib/format';

describe('titleCaseWords', () => {
  it('capitalizes the first letter of each word and segment', () => {
    expect(titleCaseWords('test project')).toBe('Test Project');
    expect(titleCaseWords('test-project name')).toBe('Test-Project Name');
    expect(titleCaseWords('already Proper')).toBe('Already Proper');
  });
});

describe('shortMonthYY', () => {
  it('formats ISO date to short month and 2-digit year (UTC)', () => {
    expect(shortMonthYY('2025-10-24')).toBe('Oct 25');
    expect(shortMonthYY('2020-01-01')).toBe('Jan 20');
  });
});

describe('playlist name builders', () => {
  it('builds rehearsal name', () => {
    expect(buildRehearsalPlaylistName('my band', '2025-10-24')).toBe(
      'My Band - Rehearsal - Oct 25',
    );
  });
  it('builds setlist name', () => {
    expect(buildSetlistPlaylistName('my band', 'summer vibes', '2020-01-01')).toBe(
      'My Band - Summer Vibes - Jan 20',
    );
  });
});
