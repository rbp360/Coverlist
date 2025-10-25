import { readableKeyFromSpotify } from '@/lib/spotifyAudio';

describe('readableKeyFromSpotify', () => {
  test('maps major and minor correctly', () => {
    expect(readableKeyFromSpotify(9, 0)).toBe('A Minor'); // A minor
    expect(readableKeyFromSpotify(9, 1)).toBe('A Major'); // A major
    expect(readableKeyFromSpotify(0, 1)).toBe('C Major'); // C major
    expect(readableKeyFromSpotify(11, 0)).toBe('B Minor'); // B minor
  });

  test('handles invalid inputs', () => {
    expect(readableKeyFromSpotify(-1, 1)).toBeUndefined();
    expect(readableKeyFromSpotify(12, 0)).toBeUndefined();
    expect(readableKeyFromSpotify(undefined as any, 1)).toBeUndefined();
  });
});
