'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CardViewer from '@/components/CardViewer';
import { Loader2 } from 'lucide-react';

interface CardData {
  id: string;
  name: string;
  age: number;
  message?: string;
}

export default function CardDetailPage() {
  const params = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const slug = decodeURIComponent(params.name as string);
        const cardId = decodeURIComponent(params.id as string);

        const response = await fetch(
          `/api/cards/${slug}?id=${cardId}`
        );

        if (!response.ok) {
          throw new Error('Card not found');
        }

        const data = await response.json();
        setCard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [params.id, params.name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-purple-900 to-black">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-purple-900 to-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Oops!</h1>
          <p className="text-gray-400 mb-8">{error || 'Card not found'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
          >
            Go Back Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <CardViewer
      name={card.name}
      age={card.age}
      message={card.message}
    />
  );
}
