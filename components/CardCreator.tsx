'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Globe, Lock } from 'lucide-react';
import Link from 'next/link';

export default function CardCreator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    message: '',
    customSlug: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.age.trim()) {
      setError('Name and Age are required!');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          message: formData.message,
          slug: formData.customSlug || undefined,
          public: isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create card');
      }

      const card = await response.json();
      router.push(`/${card.slug}/${card.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4 relative">
      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition"
      >
        <ArrowLeft size={20} />
        Back Home
      </Link>

      <div className="relative max-w-md w-full">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg blur-3xl opacity-20 -z-10 animate-pulse"></div>

        <div className="bg-black/50 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <Sparkles className="text-purple-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Create Birthday Card</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Birthday Person's Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="Enter name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="Enter age"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition resize-none"
                placeholder="Write a birthday message..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom URL Slug (Optional)
              </label>
              <input
                type="text"
                name="customSlug"
                value={formData.customSlug}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="e.g., john-birthday"
              />
            </div>

            {/* Public/Private Toggle */}
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    {isPublic ? (
                      <>
                        <Globe className="w-4 h-4 text-blue-400" />
                        Public Gallery
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-400" />
                        Private
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    {isPublic
                      ? 'Card will appear in the public gallery'
                      : 'Only accessible via direct link'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex w-12 h-6 rounded-full transition ${
                    isPublic
                      ? 'bg-blue-600'
                      : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block w-5 h-5 bg-white rounded-full transition transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
            >
              {loading ? 'Creating Card...' : 'Create Birthday Card'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
