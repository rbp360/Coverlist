// Simple deterministic stub enrichment for key and tempo based on title/artist
export type EnrichInput = { title: string; artist: string; mbid?: string };
export type EnrichResult = { key?: string; tempo?: number };

const KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Am',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export function enrichKeyTempoStub(input: EnrichInput): EnrichResult {
  const seed = hash(`${input.title}|${input.artist}|${input.mbid || ''}`);
  const key = KEYS[seed % KEYS.length];
  // Deterministic tempo between 80 and 160 BPM
  const tempo = 80 + (seed % 81);
  return { key, tempo };
}
// External enrichment providers have been removed; only the stub is available.
