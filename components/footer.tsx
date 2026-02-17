import { Github } from 'lucide-react';

function Footer() {
    return (
        <footer className="border-t border-gray-800/50 bg-gradient-to-r from-gray-950/50 to-gray-900/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-3 gap-12 mb-8">
              <div>
                <h3 className="text-white font-bold text-lg mb-4">LixWish</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Create magical, interactive birthday cards with personalized celebrations powered by modern web technology.
                </p>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/create" className="text-gray-400 hover:text-white transition">Create Card</a></li>
                  <li><a href="/gallery" className="text-gray-400 hover:text-white transition">Gallery</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition">Documentation</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition">Support</a></li>
                </ul>
              </div>

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
    )
}

export default Footer;