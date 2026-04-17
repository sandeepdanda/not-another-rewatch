import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="text-center pt-20">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-zinc-400 mb-6">This movie doesn't exist. Yet.</p>
      <Link to="/" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition">
        Back to Home
      </Link>
    </div>
  );
}
