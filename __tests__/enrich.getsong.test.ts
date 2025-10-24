import { enrichKeyTempoGetSong } from '@/lib/enrich';

describe('enrichKeyTempoGetSong (integration)', () => {
  const apiKey = process.env.GETSONG_API_KEY || process.env.GETSONG_APIKEY;
  if (!apiKey) {
    test.skip('skipped: GETSONG_API_KEY not set', () => {});
    return;
  }

  test('fetches tempo/key for a known track when provider reachable', async () => {
    const r = await enrichKeyTempoGetSong({ title: 'Believer', artist: 'Imagine Dragons' });
    // At least one of tempo/key should be present on success
    expect(r.tempo || r.key).toBeDefined();
  }, 20000);
});
