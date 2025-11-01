import Image from 'next/image';

import AnimatedDashboardDemo from '@/components/AnimatedDashboardDemo';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white">
      <h1 className="sr-only">SongDeck</h1>
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-20 px-4 sm:px-8">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/hero-band-bg.jpg"
            alt="Live band background"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">
          SongDeck — The Ultimate Setlist & Rehearsal Companion for Gigging Musicians
        </h1>
        <p className="text-lg sm:text-2xl max-w-2xl mx-auto mb-6 text-gray-200 drop-shadow">
          Built by musicians, for musicians. SongDeck takes the chaos out of rehearsals, setlists,
          and performance prep — so you can focus on what matters most: playing great music.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <button className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-full text-lg shadow-lg transition">
            🎧 Try SongDeck Free
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-full text-lg border border-white/20 shadow-lg transition">
            📱 Learn More
          </button>
        </div>
        <div className="mt-2 text-base italic text-green-300 font-medium">
          &quot;Play Smarter. Rehearse Better. Perform Flawlessly.&quot;
        </div>
        {/* Animated dashboard mockup */}
        <div className="mt-10 flex justify-center">
          <AnimatedDashboardDemo />
        </div>
      </section>

      {/* Introduction / Overview Section */}
      <section className="max-w-4xl mx-auto py-16 px-4 sm:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-green-400">
          Everything You Need to Run a Tight Band, All in One App
        </h2>
        <p className="text-lg text-gray-200 mb-6">
          SongDeck is an all-in-one rehearsal manager, setlist builder, and performance assistant
          designed for cover bands and gigging artists. Whether you’re rehearsing at home or on
          stage, SongDeck keeps your music organised, your band in sync, and your gigs stress-free.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base text-left text-white/90 mb-4">
          <li>🎸 Build and manage full song libraries with BPM, key, and duration info</li>
          <li>🎧 Auto-generate Spotify playlists for rehearsals (Apple Music coming soon)</li>
          <li>🗂️ Organise setlists and rate your band’s readiness</li>
          <li>📝 Log rehearsal progress and get automated performance reports</li>
          <li>🕺 Share setlists with venues, sound engineers, and fans</li>
          <li>📜 Real-time lyric scroller for singers and performers</li>
          <li>🔌 Works fully offline — perfect for outdoor gigs and low-signal venues</li>
        </ul>
      </section>

      {/* Feature Blocks */}
      <section className="max-w-6xl mx-auto py-12 px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-900/80 rounded-xl p-6 shadow-lg border border-green-700 flex flex-col items-center">
            <div className="text-4xl mb-2">🎶</div>
            <h3 className="text-xl font-bold mb-2">Rehearsal Mode</h3>
            <p className="text-gray-300 text-base mb-2">
              Rate, log, and organise every song in your repertoire. Track rehearsal progress, spot
              weak spots, and sync with Spotify for a seamless band practice experience.
            </p>
          </div>
          <div className="bg-gray-900/80 rounded-xl p-6 shadow-lg border border-green-700 flex flex-col items-center">
            <div className="text-4xl mb-2">🎤</div>
            <h3 className="text-xl font-bold mb-2">Live Mode</h3>
            <p className="text-gray-300 text-base mb-2">
              Build, edit, and share professional setlists in seconds. Add venue notes, print your
              sets, and share links with your crew and engineers.
            </p>
          </div>
          <div className="bg-gray-900/80 rounded-xl p-6 shadow-lg border border-green-700 flex flex-col items-center">
            <div className="text-4xl mb-2">📜</div>
            <h3 className="text-xl font-bold mb-2">Lyric Scroller</h3>
            <p className="text-gray-300 text-base mb-2">
              Never miss a line again. Display lyrics in real-time with notes and cues, tailored for
              singers and front performers.
            </p>
          </div>
        </div>
      </section>

      {/* Why Musicians Love SongDeck */}
      <section className="max-w-4xl mx-auto py-12 px-4 sm:px-8">
        <h2 className="text-2xl font-bold mb-4 text-green-300">Why Musicians Love SongDeck</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔁</span>Integrated Spotify playlists
            <span className="ml-auto text-green-400">
              Practice and perform with synced playback
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>Song metadata
            <span className="ml-auto text-green-400">
              Automatically fetch key, BPM, and duration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>Shareable setlists
            <span className="ml-auto text-green-400">Send to venues, engineers, or fans</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>Rehearsal analytics
            <span className="ml-auto text-green-400">
              Track “road-readiness” and song freshness
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪶</span>Offline functionality
            <span className="ml-auto text-green-400">Always ready, even without Wi-Fi</span>
          </div>
        </div>
      </section>

      {/* For Bands, Artists, and Solo Performers */}
      <section className="max-w-3xl mx-auto py-12 px-4 sm:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-green-400">
          One App, Every Stage of Your Musical Journey
        </h2>
        <p className="text-lg text-gray-200 mb-4">
          From first rehearsal to encore, SongDeck grows with your music. Keep your performances
          tight, your setlists tidy, and your practice productive.
        </p>
      </section>

      {/* Call-to-Action (End of Page) */}
      <section className="max-w-2xl mx-auto py-16 px-4 sm:px-8 text-center">
        <h2 className="text-3xl font-bold mb-4 text-green-400">
          Ready to Simplify Your Rehearsals and Rock Your Next Gig?
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-full text-lg shadow-lg transition">
            👉 Get Started with SongDeck
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-full text-lg border border-white/20 shadow-lg transition">
            👉 Watch Demo Video
          </button>
        </div>
        <div className="text-lg italic text-green-300 font-medium mb-2">
          SongDeck — More Music. Less Admin.
        </div>
      </section>
    </main>
  );
}
