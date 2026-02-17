'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Candles from './Candles';
import Confetti from './Confetti';
import MicrophoneButton from './MicrophoneButton';
import { RefreshCw } from 'lucide-react';

interface CardViewerProps {
  name: string;
  age: number;
  slug: string;
  message?: string;
}

export default function CardViewer({
  name,
  age,
  slug,
  message,
}: CardViewerProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [candlesBlown, setCandlesBlown] = useState(0);
  const [allCandlesBlown, setAllCandlesBlown] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const flamesRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    // Type writer effect
    const text = message || `Happy Birthday ${name}!`;
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [message, name]);

  const handleBlowDetected = () => {
    if (!allCandlesBlown) {
      const newCount = candlesBlown + 1;
      setCandlesBlown(newCount);

      // Blow out one candle
      if (flamesRef.current && flamesRef.current[newCount - 1]) {
        (flamesRef.current[newCount - 1] as HTMLElement).classList.add('hidden');
      }

      if (newCount >= age) {
        setAllCandlesBlown(true);
        setShowConfetti(true);

        // Blow all remaining candles
        if (flamesRef.current) {
          flamesRef.current.forEach((flame) => {
            (flame as HTMLElement).classList.add('hidden');
          });
        }

        setTimeout(() => {
          setShowConfetti(false);
        }, 2200);
      }
    }
  };

  useEffect(() => {
    // Update flame references when candles are rendered
    flamesRef.current = document.querySelectorAll('.flame');
  }, []); 

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-black overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen z-10">
        <div className="absolute top-8 right-8 flex gap-4">
          <button
            onClick={() => router.refresh()}
            className="p-3 bg-purple-500/20 hover:bg-purple-500/40 rounded-full transition border border-purple-500/50"
            title="Refresh page"
          >
            <RefreshCw className="w-6 h-6 text-purple-400" />
          </button>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-center px-4">
          Hello, <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">{name}</span>
        </h1>

        <div className="text-center mb-12 h-8">
          <p className="text-lg text-gray-300 min-h-6">{displayText}</p>
        </div>

        {/* Cake and Candles */}
        <div className="relative w-full max-w-xl h-64 mb-8 flex items-center justify-center">
          <Candles count={age} onBlow={handleBlowDetected} />
        </div>

        {/* Candles blown info */}
        {candlesBlown > 0 && !allCandlesBlown && (
          <p className="text-sm text-gray-400 mb-4">
            Candles blown: {candlesBlown}/{age}
          </p>
        )}

        {/* Microphone Button */}
        <MicrophoneButton onBlowDetected={handleBlowDetected} />

        {/* Confetti */}
        <Confetti isVisible={showConfetti} />

      </div>
    </div>
  );
}
