import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c1017] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="h-14 w-14 mx-auto rounded-full bg-[url('/logo.png')] bg-cover mb-6 opacity-40" />
        <h1 className="text-7xl font-extrabold text-[#232d3f] mb-2">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-[#9ca3af] text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#9b7bf7] text-white font-semibold rounded-full text-sm hover:bg-[#b69aff] transition-colors"
          >
            Go to Feed
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-2.5 bg-[#141a26] border border-[#232d3f] text-[#888] font-medium rounded-full text-sm hover:text-white hover:border-[#333] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
