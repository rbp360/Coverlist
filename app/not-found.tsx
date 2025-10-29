export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="mb-4">Sorry, the page you are looking for does not exist.</p>
      <a href="/" className="rounded bg-brand-500 px-4 py-2 text-black font-semibold">
        Go Home
      </a>
    </div>
  );
}
