'use client';
import { useParams } from 'next/navigation';

export default function SetlistEditorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Setlist Editor</h1>
      <p className="mb-2">
        Setlist ID: <span className="font-mono">{id}</span>
      </p>
      <div className="mt-4 p-4 border rounded bg-white text-black">
        {/* TODO: Implement full setlist editing UI here (songs, notes, drag/drop, etc.) */}
        <p>
          This is a placeholder for the setlist editor. You can now access this page directly for
          testing.
        </p>
      </div>
    </div>
  );
}
