'use client';

import { useEffect, useState } from 'react';

type CatState = 'sleeping' | 'excited' | 'stretching' | 'grumpy';

interface CatMascotProps {
  state?: CatState;
  onStateChange?: (state: CatState) => void;
}

export function CatMascot({ state: externalState, onStateChange }: CatMascotProps) {
  const [internalState, setInternalState] = useState<CatState>('sleeping');
  const [isVisible, setIsVisible] = useState(true);

  const currentState = externalState ?? internalState;

  useEffect(() => {
    // Listen for custom events from throughout the app
    const handleJobStart = () => {
      setInternalState('excited');
      setTimeout(() => setInternalState('sleeping'), 3000);
    };

    const handleSuccess = () => {
      setInternalState('stretching');
      setTimeout(() => setInternalState('sleeping'), 4000);
    };

    const handleError = () => {
      setInternalState('grumpy');
      setTimeout(() => setInternalState('sleeping'), 5000);
    };

    window.addEventListener('cat:job-start', handleJobStart);
    window.addEventListener('cat:success', handleSuccess);
    window.addEventListener('cat:error', handleError);

    return () => {
      window.removeEventListener('cat:job-start', handleJobStart);
      window.removeEventListener('cat:success', handleSuccess);
      window.removeEventListener('cat:error', handleError);
    };
  }, []);

  useEffect(() => {
    if (onStateChange && externalState !== currentState) {
      onStateChange(currentState);
    }
  }, [currentState, externalState, onStateChange]);

  // Check localStorage for user preference
  useEffect(() => {
    const hidden = localStorage.getItem('cat-mascot-hidden') === 'true';
    setIsVisible(!hidden);
  }, []);

  if (!isVisible) return null;

  const getCatEmoji = () => {
    switch (currentState) {
      case 'sleeping':
        return '😴';
      case 'excited':
        return '😺';
      case 'stretching':
        return '😸';
      case 'grumpy':
        return '😾';
      default:
        return '🐱';
    }
  };

  const getCatAnimation = () => {
    switch (currentState) {
      case 'sleeping':
        return 'animate-cat-sleep';
      case 'excited':
        return 'animate-cat-excited';
      case 'stretching':
        return 'animate-cat-stretch';
      case 'grumpy':
        return 'animate-cat-grumpy';
      default:
        return '';
    }
  };

  const getMessage = () => {
    switch (currentState) {
      case 'sleeping':
        return 'Zzz...';
      case 'excited':
        return 'Meow!';
      case 'stretching':
        return 'Purrfect!';
      case 'grumpy':
        return 'Hiss!';
      default:
        return '';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {/* Speech bubble */}
      {currentState !== 'sleeping' && (
        <div className="bg-surface border border-border rounded-lg px-3 py-1.5 shadow-lg animate-fade-in">
          <p className="text-xs text-foreground font-medium">{getMessage()}</p>
        </div>
      )}

      {/* Cat mascot */}
      <div
        className={`text-6xl ${getCatAnimation()} transition-all duration-300 cursor-pointer pointer-events-auto`}
        onClick={() => {
          // Fun interaction: click to wake up or change state
          if (currentState === 'sleeping') {
            setInternalState('excited');
            setTimeout(() => setInternalState('sleeping'), 2000);
          }
        }}
        title="Click me!"
      >
        {getCatEmoji()}
      </div>
    </div>
  );
}
