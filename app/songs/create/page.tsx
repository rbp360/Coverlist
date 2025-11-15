import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateSongPage() {
  const router = useRouter();
  const [songs, setSongs] = useState([
    { title: '', durationSec: '', artist: '', key: '', tempo: '', playlist: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (idx: number, field: string, value: string) => {
    setSongs((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addSong = () => {
    setSongs((prev) => [
      ...prev,
      { title: '', durationSec: '', artist: '', key: '', tempo: '', playlist: '' },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    for (const song of songs) {
      if (!song.title || !song.durationSec || !song.artist) continue;
      await fetch('/api/repertoire/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          durationSec: Number(song.durationSec),
          artist: song.artist,
          key: song.key,
          tempo: song.tempo,
          playlist: song.playlist,
        }),
      });
    }
    setSubmitting(false);
    router.push('/songs');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Create Song(s)</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {songs.map((song, idx) => (
          <div key={idx} className="border rounded p-4 mb-2">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <input
                className="border rounded px-2 py-1"
                placeholder="Song Title"
                value={song.title}
                onChange={(e) => handleChange(idx, 'title', e.target.value)}
                required
              />
              <input
                className="border rounded px-2 py-1"
                placeholder="Duration (seconds)"
                type="number"
                min="1"
                value={song.durationSec}
                onChange={(e) => handleChange(idx, 'durationSec', e.target.value)}
                required
              />
              <input
                className="border rounded px-2 py-1"
                placeholder="Artist"
                value={song.artist}
                onChange={(e) => handleChange(idx, 'artist', e.target.value)}
                required
              />
              <input
                className="border rounded px-2 py-1"
                placeholder="Key (e.g., C, G#m)"
                value={song.key}
                onChange={(e) => handleChange(idx, 'key', e.target.value)}
              />
              <input
                className="border rounded px-2 py-1"
                placeholder="Tempo (BPM)"
                type="number"
                min="1"
                value={song.tempo}
                onChange={(e) => handleChange(idx, 'tempo', e.target.value)}
              />
              <input
                className="border rounded px-2 py-1"
                placeholder="Playlist Link (URL)"
                type="url"
                value={song.playlist}
                onChange={(e) => handleChange(idx, 'playlist', e.target.value)}
              />
            </div>
            <button
              type="button"
              className="mt-2 rounded bg-blue-600 px-3 py-1 text-white font-bold hover:bg-blue-700"
              onClick={addSong}
            >
              Add Another Song
            </button>
          </div>
        ))}
        <button
          type="submit"
          className="rounded bg-green-600 px-4 py-2 text-white font-bold hover:bg-green-700"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save All Songs'}
        </button>
      </form>
    </div>
  );
}
