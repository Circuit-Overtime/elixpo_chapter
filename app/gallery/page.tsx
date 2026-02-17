'use client';

import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Cake, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';

// Note: This is a client component for interactivity
// Metadata export won't work here, but we'll export it from a parent layout if needed

export default function Gallery() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cards?public=true');
        if (!response.ok) throw new Error('Failed to fetch cards');
        const data = await response.json();
        setCards(data || []);
      } catch (err) {
        console.error('Error fetching cards:', err);
        setError('Failed to load gallery');
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animation-delay-2000 animate-blob"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animation-delay-4000 animate-blob"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800/50 bg-gradient-to-r from-gray-950/50 to-gray-900/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition p-2 -ml-2"
                title="Back to Home"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Card Gallery</h1>
                <p className="text-gray-400 text-sm">Explore publicly shared birthday cards</p>
              </div>
            </div>
            <Link
              href="/create"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition transform hover:scale-105 shadow-lg shadow-purple-600/50"
            >
              Create Card
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-6xl mx-auto px-4 py-16 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-96">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-spin" style={{ borderRadius: '50%', width: '100%' }}></div>
                <div className="absolute inset-2 bg-gray-950 rounded-full"></div>
              </div>
              <p className="text-gray-300 font-medium">Loading cards...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-96 text-center">
              <Cake className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-4">{error}</p>
              <Link href="/" className="text-purple-400 hover:text-purple-300 transition">
                Back to Home
              </Link>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-96 text-center">
              <Cake className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Cards Yet</h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Be the first to create and share a public birthday card in the gallery!
              </p>
              <Link
                href="/create"
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition transform hover:scale-105 shadow-lg shadow-purple-600/50"
              >
                Create Your Card
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-gray-300 mb-8 text-center">
                Showing {cards.length} public card{cards.length !== 1 ? 's' : ''}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <Link
                    key={card.id}
                    href={`/${card.slug}/${card.id}`}
                    className="group relative bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-md border border-gray-700/50 hover:border-purple-500/50 rounded-2xl overflow-hidden transition hover:shadow-xl hover:shadow-purple-600/20"
                  >
                    {/* Card Preview Content Area */}
                    <div className="aspect-square bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                      {/* Decorative background */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600 rounded-full blur-3xl"></div>
                      </div>

                      {/* Content */}
                      <div className="relative z-10 text-center">
                        <Cake className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{card.slug}</h3>
                        <p className="text-sm text-gray-400 mb-4">Age: {card.age}</p>
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 bg-gray-900/50 px-3 py-1 rounded-full w-fit mx-auto">
                          <Lock size={14} />
                          Content Protected
                        </div>
                      </div>
                    </div>

                    {/* Card Info Footer */}
                    <div className="p-4 border-t border-gray-700/50">
                      <p className="text-xs text-gray-500 mb-2">
                        Created: {new Date(card.created_at).toLocaleDateString()}
                      </p>
                      <button className="w-full py-2 px-3 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-purple-200 font-semibold rounded-lg transition text-sm">
                        View Card
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 bg-gradient-to-r from-gray-950/50 to-gray-900/50 backdrop-blur-md mt-20">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-500 text-sm mb-4 md:mb-0">
                Copyright 2024 LixWish. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <Link href="/" className="hover:text-white transition">Home</Link>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a>
                <Link href="#" className="hover:text-white transition">Privacy</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
