import { fetchLyricsLRCLibRobust } from '../lib/lyrics';

describe('fetchLyricsLRCLibRobust', () => {
  const originalFetch = global.fetch as any;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('selects a later variant that succeeds', async () => {
    // Will respond only for sanitized variant (simulate variant #3+)
    const fetchMock = jest.fn(async (input: any) => {
      const href = String(input);
      const u = new URL(href);
      const track = u.searchParams.get('track_name');
      const artist = u.searchParams.get('artist_name');
      // Detect sanitized variant by exact param values, regardless of encoding/order
      if (track === 'Hello World' && artist === 'Artist') {
        return {
          ok: true,
          json: async () => ({ syncedLyrics: '[00:00.00] Hello\n[00:01.00] World' }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any; // empty result
    }) as unknown as typeof fetch;
    global.fetch = fetchMock as any;

    const result = await fetchLyricsLRCLibRobust({
      title: 'Hello World (Live)',
      artist: 'Artist feat. Someone',
      durationMs: 120000,
      maxAttempts: 6,
    });
    expect(result.lines.length).toBe(2);
    expect(result.usedVariantIndex).not.toBeNull();
    expect(result.warning).toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('produces warning when no variants return lyrics', async () => {
    const fetchMock = jest.fn(
      async () => ({ ok: true, json: async () => ({}) }) as any,
    ) as unknown as typeof fetch;
    global.fetch = fetchMock as any;
    const result = await fetchLyricsLRCLibRobust({
      title: 'Unknown Song',
      artist: 'Obscure Artist',
      durationMs: 50000,
      maxAttempts: 4,
    });
    expect(result.lines.length).toBe(0);
    expect(result.warning).toBeDefined();
    expect(result.attempts.length).toBeGreaterThan(0);
  });
});
