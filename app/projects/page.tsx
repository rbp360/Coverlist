'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

// Dayglo color palette (Tailwind + custom)
const PROJECT_COLORS = [
  'text-green-400',
  'text-pink-400', // more dayglo pink
  'text-orange-400', // orange
  'text-sky-400', // blue
  'text-yellow-300', // yellow
  'text-fuchsia-700', // darker purple (last)
];
function getProjectColor(projectId: string, projects: { id: string }[]): string {
  const idx = projects.findIndex((p) => p.id === projectId);
  return PROJECT_COLORS[idx % PROJECT_COLORS.length] || 'text-green-400';
}

type Project = { id: string; name: string; avatarUrl?: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/projects').then(async (r) => {
      if (r.status === 401) window.location.href = '/login';
      else setProjects(await r.json());
    });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((cur) => [p, ...cur]);
      setName('');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Projects</h2>
      <form onSubmit={onCreate} className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="rounded bg-black px-3 py-2 text-white">Create</button>
      </form>
      <ul className="divide-y rounded border bg-black text-white">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 min-w-0">
              {p.avatarUrl ? (
                <Image
                  src={p.avatarUrl}
                  alt="project gif"
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded object-cover flex-none"
                />
              ) : null}
              <span className={`truncate font-semibold ${getProjectColor(p.id, projects)}`}>
                {p.name}
              </span>
            </div>
            <a className="rounded border px-3 py-1 text-sm" href={`/projects/${p.id}`}>
              Open
            </a>
          </li>
        ))}
        {projects.length === 0 && <li className="p-4 text-sm text-gray-600">No projects yet.</li>}
      </ul>
    </div>
  );
}
