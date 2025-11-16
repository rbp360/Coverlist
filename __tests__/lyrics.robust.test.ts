import { fetchLyricsLRCLibRobust } from '../lib/lyrics';

describe('fetchLyricsLRCLibRobust', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('selects a later variant that succeeds', async () => {
    const responses: { [url: string]: any } = {};
    // Will respond only for sanitized variant (simulate variant #3+)
    global.fetch = jest.fn(async (input: RequestInfo) => {
      const url = String(input);
      // Detect sanitized variant by presence of no punctuation (e.g., track_name without parentheses)
      if (/track_name=Hello%20World&artist_name=Artist/i.test(url)) {
        return {
          ok: true,
          json: async () => ({ syncedLyrics: '[00:00.00] Hello\n[00:01.00] World' }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any; // empty result
    });

    const result = await fetchLyricsLRCLibRobust({
      title: 'Hello World (Live)',
      artist: 'Artist feat. Someone',
      durationMs: 120000,
      maxAttempts: 6,
    });
    expect(result.lines.length).toBe(2);
    expect(result.usedVariantIndex).not.toBeNull();
    expect(result.warning).toBeUndefined();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('produces warning when no variants return lyrics', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }) as any);
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
