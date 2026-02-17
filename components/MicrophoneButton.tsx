'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Mic } from 'lucide-react';

interface MicrophoneButtonProps {
  onBlowDetected: () => void;
}

export default function MicrophoneButton({
  onBlowDetected,
}: MicrophoneButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('Click Here to Unmute Mic');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const audioStream = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      audioStream.connect(analyser);
      setIsListening(true);
      setText('🎤 Blow Air on the Screen');

      const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Lower frequency spectrum for blow detection
        const lowFreqRange = dataArray.slice(0, bufferLength / 4);
        const threshold = 100;
        
        let isBlowDetected = false;
        let blowStrength = 0;

        // Check for sustained low-frequency activity (characteristic of blowing)
        let highValueCount = 0;
        for (let i = 0; i < lowFreqRange.length; i++) {
          if (lowFreqRange[i] > threshold) {
            highValueCount++;
            blowStrength += lowFreqRange[i];
          }
        }

        // Require 20% of low frequencies to be above threshold for at least 2 frames
        if (highValueCount > lowFreqRange.length * 0.2 && blowStrength > 500) {
          isBlowDetected = true;
        }

        if (isBlowDetected) {
          console.log('Blow sound detected!');
          onBlowDetected();
        }

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();
    } catch (error: any) {
      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        setText('❌ Please Allow Mic - Click Here');
        setTimeout(() => {
          setText('🎤 Click Here to Unmute Mic');
        }, 5200);
      } else if (error.name === 'NotFoundError') {
        setText('🔇 No microphone found');
      } else {
        console.error('Error accessing microphone:', error);
        setText('⚠️ Microphone error');
      }
    }
  };

  const stopListening = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsListening(false);
    setText('🎤 Click Here to Unmute Mic');
  };

  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening]);

  return (
    <button
      onClick={isListening ? stopListening : handleMicrophoneAccess}
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full font-semibold flex items-center gap-2 transition-all z-40 ${
        isListening
          ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/50'
          : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/50'
      }`}
      aria-label="Microphone access button"
    >
      {isListening ? (
        <Mic size={20} className="animate-pulse" />
      ) : (
        <Volume2 size={20} />
      )}
      <span id="mictext">{text}</span>
    </button>
  );
}
