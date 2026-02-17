'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface KeyPromptProps {
  slug: string;
}

export default function KeyPrompt({ slug }: KeyPromptProps) {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!key.trim()) {
      setError('Please enter the access key');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/cards/${slug}?id=${key.toUpperCase()}`);

      if (!response.ok) {
        throw new Error('Invalid access key');
      }

      router.push(`/${slug}/${key.toUpperCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
      <div className="relative max-w-md w-full">
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-blue-500 rounded-lg blur-3xl opacity-20 -z-10 animate-pulse"></div>

        <div className="bg-black/50 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <Search className="text-cyan-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Access Card</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Access Key (6-digit alphanumeric)
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-center text-2xl tracking-widest font-bold"
              />
              <p className="text-xs text-gray-400 mt-2">
                This key was provided to you to access the birthday card.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
            >
              {loading ? 'Verifying...' : 'Access Card'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              Don't have a card yet?{' '}
              <a href="/" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
