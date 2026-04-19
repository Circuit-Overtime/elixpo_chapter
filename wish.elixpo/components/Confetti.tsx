'use client';

import { useEffect, useRef } from 'react';
import './Confetti.css';

interface ConfettiProps {
  isVisible: boolean;
}

export default function Confetti({ isVisible }: ConfettiProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const confettiCount = 600;
    const container = containerRef.current;

    if (!isVisible) {
      container.innerHTML = '';
      return;
    }

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';

      const randomLeft = Math.random() * 100;
      const randomDelay = Math.random() * 0.5;
      const randomDuration = Math.random() * 2 + 2;
      const randomColor = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA502', '#FF69B4'][
        Math.floor(Math.random() * 5)
      ];

      confetti.style.left = randomLeft + '%';
      confetti.style.backgroundColor = randomColor;
      confetti.style.animation = `fall ${randomDuration}s linear ${randomDelay}s forwards`;

      container.appendChild(confetti);
    }
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      className={`confetti fixed inset-0 pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}
