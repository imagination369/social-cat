/**
 * Confetti celebration effects using canvas-confetti
 *
 * Lightweight wrapper for success celebrations across the app
 */

import confetti from 'canvas-confetti';

/**
 * Fire basic confetti celebration
 */
export function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}

/**
 * Fire success confetti (cat-themed! 🐱)
 */
export function fireSuccessConfetti() {
  window.dispatchEvent(new CustomEvent('cat:success'));

  const catFaces = ['🐱', '😺', '😸', '😻', '🐾'];

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7'],
    shapes: ['circle'],
    scalar: 1.2,
  });

  // Add cat emoji confetti
  confetti({
    particleCount: 15,
    spread: 50,
    origin: { y: 0.6 },
    scalar: 2,
    shapes: catFaces.map(() => confetti.shapeFromText({ text: catFaces[Math.floor(Math.random() * catFaces.length)], scalar: 2 })),
  });
}

/**
 * Fire platform-specific colored confetti (with cats!)
 */
export function firePlatformConfetti(platform: 'twitter' | 'youtube' | 'instagram') {
  const colorMap = {
    twitter: ['#1DA1F2', '#56bff3', '#8cd4f7'],
    youtube: ['#FF0000', '#ff4d4d', '#ff8080'],
    instagram: ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888'],
  };

  const catFaces = ['🐱', '😺', '😸', '😻', '🐾'];

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: colorMap[platform],
  });

  // Add cat emoji confetti
  confetti({
    particleCount: 12,
    spread: 60,
    origin: { y: 0.6 },
    scalar: 2,
    shapes: catFaces.map(() => confetti.shapeFromText({ text: catFaces[Math.floor(Math.random() * catFaces.length)], scalar: 2 })),
  });
}

/**
 * Fire milestone confetti (big celebration with CATS! 🎉🐱)
 */
export function fireMilestoneConfetti() {
  window.dispatchEvent(new CustomEvent('cat:success'));

  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  const catFaces = ['🐱', '😺', '😸', '😻', '🐾', '😼', '😽'];

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: ReturnType<typeof setInterval> = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Regular confetti
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });

    // Cat emoji confetti
    confetti({
      ...defaults,
      particleCount: 8,
      scalar: 2.5,
      shapes: catFaces.map(() => confetti.shapeFromText({ text: catFaces[Math.floor(Math.random() * catFaces.length)], scalar: 2 })),
      origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 }
    });
  }, 250);
}

/**
 * Check if a number is a milestone (100, 500, 1000, etc.)
 */
export function isMilestone(num: number): boolean {
  const milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  return milestones.includes(num);
}
