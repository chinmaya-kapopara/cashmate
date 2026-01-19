'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LandingPageProps {
  onComplete: () => void;
}

export default function LandingPage({ onComplete }: LandingPageProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Show landing page for 2 seconds, then fade out
    const timer = setTimeout(() => {
      setIsAnimating(false);
      // Wait for fade out animation to complete before calling onComplete
      setTimeout(() => {
        onComplete();
      }, 500); // Match the fade-out duration
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-950 dark:to-pink-950 transition-opacity duration-500 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex items-center justify-center">
          <Image
            src="/cashmate_wallet_logo.png"
            alt="CashMate Logo"
            width={192}
            height={192}
            className="w-full h-full object-contain drop-shadow-2xl"
            priority
          />
        </div>

        {/* App Name */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            CashMate
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track your family expenses together
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
