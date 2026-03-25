import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="h-14 w-14 mx-auto rounded-full bg-[url('/logo.png')] bg-cover mb-6 opacity-40" />
        <h1 className="text-7xl font-extrabold text-[#1a1d27] mb-2">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-[#777] text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#e8e8e8] text-[#030712] font-semibold rounded-full text-sm hover:bg-white transition-colors"
          >
            Go to Feed
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-2.5 bg-[#0d1117] border border-[#1a1d27] text-[#888] font-medium rounded-full text-sm hover:text-white hover:border-[#333] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
