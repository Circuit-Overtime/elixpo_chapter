import { Metadata } from 'next';
import Link from 'next/link';
import { Gift, Sparkles, Zap, Github, Image as ImageIcon, Wand2, Share2, PartyPopper } from 'lucide-react';

export const metadata: Metadata = {
  title: 'LixWish - Birthday Card Generator',
  description: 'Create beautiful, interactive birthday cards with special effects',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-black overflow-hidden">
      {/* Animated background blobs - more contrast */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animation-delay-2000 animate-blob"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animation-delay-4000 animate-blob"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mr-4">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-6xl md:text-7xl font-bold text-white">
                Lix<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Wish</span>
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl font-medium">
              Create magical, interactive birthday cards with animated effects
            </p>
            <p className="text-gray-400 mt-3 max-w-xl">Experience personalized celebration with unique access keys and microphone-powered interactions</p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mb-20">
            <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/40 backdrop-blur-md border border-purple-500/50 rounded-2xl p-8 hover:border-purple-400 transition hover:shadow-lg hover:shadow-purple-500/20">
              <div className="p-3 bg-purple-600/30 rounded-lg w-fit mb-4">
                <Sparkles className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Interactive Cards</h3>
              <p className="text-gray-300">Personalized cards with animated cakes and real candles to blow out using your microphone</p>
            </div>

            <div className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 backdrop-blur-md border border-blue-500/50 rounded-2xl p-8 hover:border-blue-400 transition hover:shadow-lg hover:shadow-blue-500/20">
              <div className="p-3 bg-blue-600/30 rounded-lg w-fit mb-4">
                <Zap className="w-6 h-6 text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Unique Access Keys</h3>
              <p className="text-gray-300">6-digit alphanumeric keys protect cards while making them easy to share with loved ones</p>
            </div>

            <div className="bg-gradient-to-br from-pink-900/60 to-pink-800/40 backdrop-blur-md border border-pink-500/50 rounded-2xl p-8 hover:border-pink-400 transition hover:shadow-lg hover:shadow-pink-500/20">
              <div className="p-3 bg-pink-600/30 rounded-lg w-fit mb-4">
                <Share2 className="w-6 h-6 text-pink-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Share Easily</h3>
              <p className="text-gray-300">URL slugs make sharing simple, with support for multiple cards per person</p>
            </div>
          </div>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-24">
            <Link
              href="/create"
              className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition transform hover:scale-105 shadow-xl shadow-purple-600/50 active:scale-95"
            >
              Create a Card
            </Link>

            <Link
              href="/gallery"
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition transform hover:scale-105 shadow-xl shadow-blue-600/50 active:scale-95 flex items-center justify-center gap-2"
            >
              <ImageIcon size={20} />
              Gallery
            </Link>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition border border-gray-600 hover:border-gray-500 flex items-center justify-center gap-2"
            >
              <Github size={20} />
              View on GitHub
            </a>
          </div>

          {/* How It Works Section */}
          <div className="w-full max-w-5xl mb-20">
            <h2 className="text-4xl font-bold text-white text-center mb-4">How It Works</h2>
            <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">Simple three-step process to create and share your magical birthday card</p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-900/70 to-purple-800/50 backdrop-blur-md border border-purple-500/60 rounded-2xl p-8 h-full">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-500 rounded-full mb-6">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Step 1: Create</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Fill in the birthday person's name, age, and add a personalized message. Your card is instantly generated with a unique 6-digit access key.
                  </p>
                </div>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full border-4 border-gray-950">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-900/70 to-blue-800/50 backdrop-blur-md border border-blue-500/60 rounded-2xl p-8 h-full">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full mb-6">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Step 2: Share</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Get a unique shareable link with your generated access key. Share directly or use the slug-only link and let recipients enter the key.
                  </p>
                </div>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full border-4 border-gray-950">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div className="bg-gradient-to-br from-pink-900/70 to-pink-800/50 backdrop-blur-md border border-pink-500/60 rounded-2xl p-8 h-full">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-500 rounded-full mb-6">
                    <PartyPopper className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Step 3: Celebrate</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Blow on your microphone to extinguish the animated candles one by one and trigger a spectacular confetti celebration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl w-full mb-20">
            <div className="bg-gradient-to-br from-purple-900/60 to-purple-800/40 backdrop-blur-md border border-purple-500/40 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">Unlimited</div>
              <p className="text-gray-300 font-medium">Cards to Create</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 backdrop-blur-md border border-blue-500/40 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">Secure</div>
              <p className="text-gray-300 font-medium">Access Protected</p>
            </div>
            <div className="bg-gradient-to-br from-pink-900/60 to-pink-800/40 backdrop-blur-md border border-pink-500/40 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">Instant</div>
              <p className="text-gray-300 font-medium">Sharing Ready</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 bg-gradient-to-r from-gray-950/50 to-gray-900/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-3 gap-12 mb-8">
              {/* Brand */}
              <div>
                <h3 className="text-white font-bold text-lg mb-4">LixWish</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Create magical, interactive birthday cards with personalized celebrations powered by modern web technology.
                </p>
              </div>

              {/* Links */}
              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/create" className="text-gray-400 hover:text-white transition">Create Card</a></li>
                  <li><a href="/gallery" className="text-gray-400 hover:text-white transition">Gallery</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition">Documentation</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition">Support</a></li>
                </ul>
              </div>

              {/* Connect */}
              <div>
                <h4 className="text-white font-semibold mb-4">Connect</h4>
                <div className="flex gap-4">
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition"
                    title="GitHub"
                  >
                    <Github size={20} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-0.5 7-0.5"/></svg>
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
              <p className="text-gray-500 text-sm mb-4 md:mb-0">
                Copyright 2024 LixWish. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-white transition">Privacy Policy</a>
                <a href="#" className="hover:text-white transition">Terms of Service</a>
                <a href="#" className="hover:text-white transition">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
