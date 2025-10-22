// Simple mapping for instruments to emoji and optional local gif path.
// Place instrument GIFs under public/instruments/<slug>.gif if available.

export function instrumentSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function instrumentEmoji(name: string): string {
  const map: Record<string, string> = {
    Vocals: '🎤',
    'Acoustic Guitar': '🎸',
    'Electric Guitar': '🎸',
    'Bass Guitar': '🎸',
    Keyboard: '🎹',
    Piano: '🎹',
    Synthesizer: '🎛️',
    Drums: '🥁',
    Percussion: '🥁',
    Violin: '🎻',
    Viola: '🎻',
    Cello: '🎻',
    'Double Bass': '🎻',
    Saxophone: '🎷',
    Trumpet: '🎺',
    Trombone: '🎺',
    Clarinet: '🎼',
    Flute: '🎼',
    Harmonica: '🎼',
    Ukulele: '🎸',
    Banjo: '🎸',
    Mandolin: '🎸',
    Harp: '🎼',
    Accordion: '🪗',
    'DJ / Turntables': '🎧',
    Producer: '🎚️',
    Other: '🎶',
  };
  return map[name] || '🎶';
}

export function instrumentGifPath(name: string): string {
  return `/instruments/${instrumentSlug(name)}.gif`;
}
