'use client';

import { useEffect, useRef } from 'react';
import './Candles.css';

interface CandlesProps {
  count: number;
  onBlow?: (callback: () => void) => void;
}

export default function Candles({ count, onBlow }: CandlesProps) {
  const candlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!candlesRef.current) return;

    const candleCount = Math.min(count || 20, 50);
    const candleWidth = 16;
    const availableSpace = 310 - 10;
    const spaceBetweenCandles = availableSpace / (candleCount - 1);

    candlesRef.current.innerHTML = '';

    for (let i = 0; i < candleCount; i++) {
      const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      const animationDelay = Math.floor(Math.random() * 3) + 1;

      const candleElement = document.createElement('div');
      candleElement.className = 'candle';
      candleElement.innerHTML = `<div class="flame" style="animation: flicker ${animationDelay}s ease-in-out alternate infinite;"></div>`;
      candleElement.style.opacity = '0';
      candleElement.style.left = 20 + i * spaceBetweenCandles + 'px';
      candleElement.style.background = randomColor;
      candleElement.style.top = Math.floor(Math.random() * 15) - 10 + 'px';

      candlesRef.current.appendChild(candleElement);

      setTimeout(() => {
        candleElement.style.opacity = '1';
      }, i * 30);
    }
  }, [count]);

  return (
    <div className="cake" ref={candlesRef}>
      <div className="plate"></div>
      <div className="layer layer-bottom"></div>
      <div className="layer layer-middle"></div>
      <div className="layer layer-top"></div>
      <div className="icing"></div>
      <div className="drip drip1"></div>
      <div className="drip drip2"></div>
      <div className="drip drip3"></div>
    </div>
  );
}
