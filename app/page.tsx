export default function HomePage() {
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">SongDeck</h2>
      <p className="text-neutral-300">
        Organize your music. Master your setlists. Every song. Every set. Every rehearsal. One
        place.
      </p>
      <ul className="list-disc pl-6 text-neutral-300">
        <li>Projects: group your band’s workspaces</li>
        <li>Import songs from MusicBrainz</li>
        <li>Build setlists and track durations</li>
        <li>Plan rehearsals and add notes</li>
      </ul>
      <div>
        <a
          href="/projects"
          className="inline-block rounded bg-brand-500 px-4 py-2 font-medium text-black"
        >
          Get started
        </a>
      </div>
    </section>
  );
}
