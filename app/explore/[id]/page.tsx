'use client';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function PublicSetlistPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/public/setlists/${id}/full`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, [id]);

  const items = useMemo(() => {
    const sl = data?.setlist;
    if (!sl) return [] as any[];
    return [...(sl.items || [])].sort((a: any, b: any) => a.order - b.order);
  }, [data]);

  const totalDurationSec = useMemo(() => {
    if (!data?.setlist || !data?.songsById) return 0;
    const { setlist, songsById } = data;
    return (setlist.items || []).reduce((acc: number, it: any) => {
      if (it.type === 'song') {
        const s = it.songId ? songsById[it.songId] : undefined;
        return acc + (s?.durationSec || 0);
      }
      if (it.type === 'break') return acc + (it.durationSec || 0);
      return acc;
    }, 0);
  }, [data]);

  if (loading) return <div>Loading…</div>;
  if (!data) return <div>Not found</div>;

  const { setlist, project, songsById } = data;

  function displayTitle(item: any): string {
    if (item.type === 'song') {
      const song = item.songId ? songsById[item.songId] : undefined;
      const title = song?.title || item.title || '';
      const baseKey = item.transposedKey || song?.transposedKey || song?.key;
      const keySuffix = setlist.showTransposedKey && baseKey ? ` (${baseKey})` : '';
      return `${title}${keySuffix}`;
    }
    if (item.type === 'note') return item.note || '';
    if (item.type === 'break') return item.title || 'Break';
    if (item.type === 'section') return item.title || 'Section';
    return '';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <div className="text-xl font-semibold">{setlist.name}</div>
          <div className="text-xs text-neutral-500">
            {project.name}
            {setlist.venue ? ` • ${setlist.venue}` : ''}
            {setlist.date ? ` • ${setlist.date}` : ''}
            {setlist.time ? ` • ${setlist.time}` : ''}
            {totalDurationSec > 0 ? ` • ${formatTotal(totalDurationSec)}` : ''}
          </div>
        </div>
        <div>
          <a
            href={`/api/public/setlists/${setlist.id}/print`}
            className="rounded bg-brand-500 px-3 py-2 text-black"
          >
            Print PDF
          </a>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-start justify-between">
            <div className="max-w-[80%]">
              {it.type === 'section' ? (
                <div className="font-semibold text-sm">{displayTitle(it)}</div>
              ) : it.type === 'note' ? (
                <div className="text-xs text-right text-neutral-400">{displayTitle(it)}</div>
              ) : (
                <div>
                  <div className="text-2xl">{displayTitle(it)}</div>
                  {setlist.showArtist !== false && it.type === 'song' && songsById[it.songId] && (
                    <div className="text-xs text-neutral-500">{songsById[it.songId].artist}</div>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              {it.type !== 'song' && it.durationSec
                ? `${Math.floor(it.durationSec / 60)}:${String(it.durationSec % 60).padStart(2, '0')}`
                : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTotal(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const hLabel = h === 1 ? 'hour' : 'hours';
  const mLabel = m === 1 ? 'minute' : 'minutes';
  if (h > 0 && m > 0) return `${h} ${hLabel} ${m} ${mLabel}`;
  if (h > 0) return `${h} ${hLabel}`;
  return `${m} ${mLabel}`;
}
