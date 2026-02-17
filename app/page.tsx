import { Metadata } from 'next';
import Link from 'next/link';
import { Gift, Sparkles, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'LixWish - Birthday Card Generator',
  description: 'Create beautiful, interactive birthday cards with special effects',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-black overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-delay-2000 animate-blob"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-delay-4000 animate-blob"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Gift className="w-16 h-16 text-purple-400 mr-3" />
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Lix<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Wish</span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl">
            Create magical, interactive birthday cards with candles, confetti & microphone magic
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mb-16">
          <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition">
            <Sparkles className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Interactive Cards</h3>
            <p className="text-gray-400">Personalized cards with animated cakes and real candles to blow out</p>
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition">
            <Zap className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Unique Access Keys</h3>
            <p className="text-gray-400">6-digit alphanumeric keys protect cards while easy to share</p>
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 transition">
            <Gift className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Share Easily</h3>
            <p className="text-gray-400">URL slugs make sharing simple, multiple cards per person</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 mb-16">
          <Link
            href="/create"
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition transform hover:scale-105 shadow-lg shadow-purple-500/50"
          >
            🎉 Create a Card
          </Link>

          <Link
            href="/#features"
            className="px-8 py-4 bg-black/40 border border-purple-500/50 hover:border-purple-500 text-white font-semibold rounded-lg transition backdrop-blur-md"
          >
            Learn More
          </Link>
        </div>

        {/* Demo Section */}
        <div className="max-w-2xl w-full bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-4">
              <div className="text-purple-400 font-bold text-lg flex-shrink-0">1️⃣</div>
              <div>
                <h4 className="text-white font-semibold mb-1">Create</h4>
                <p>Fill in name, age, message and create your unique card</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-purple-400 font-bold text-lg flex-shrink-0">2️⃣</div>
              <div>
                <h4 className="text-white font-semibold mb-1">Share</h4>
                <p>Get a unique link with a 6-digit access key</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-purple-400 font-bold text-lg flex-shrink-0">3️⃣</div>
              <div>
                <h4 className="text-white font-semibold mb-1">Celebrate</h4>
                <p>Blow on your microphone to extinguish candles and trigger confetti</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 max-w-2xl w-full mb-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">∞</div>
            <p className="text-gray-400">Unlimited Cards</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-400 mb-2">🔐</div>
            <p className="text-gray-400">Secure & Private</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">🚀</div>
            <p className="text-gray-400">Instant Sharing</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <p className="text-gray-400 mb-6">Ready to create magic?</p>
          <Link
            href="/create"
            className="inline-block px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-lg transition transform hover:scale-105 shadow-xl shadow-purple-500/50"
          >
            Start Creating Now 🎂
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-8 px-4 border-t border-purple-500/20 mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 LixWish. Create magical birthday moments.
          </div>
          <div className="flex gap-6 text-gray-400">
            <a href="#" className="hover:text-purple-400 transition">GitHub</a>
            <a href="#" className="hover:text-purple-400 transition">Docs</a>
            <a href="#" className="hover:text-purple-400 transition">Status</a>
          </div>
        </div>
      </div>
    </div>
  );
}
