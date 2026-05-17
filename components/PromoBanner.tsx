'use client';

import { useState, useEffect } from 'react';

const PROMOS = [
  {
    emoji: '🚀',
    text: 'Launch Offer: Save 10% on your airport parking today!',
    code: 'LAUNCH10',
  },
  {
    emoji: '✈️',
    text: 'Returning Traveler? Get 15% off your 3rd booking!',
    code: 'AERO15',
  },
];

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setMounted(true);
    const isDismissed = sessionStorage.getItem('apd_promo_closed');
    if (isDismissed !== 'true') setIsVisible(true);

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === PROMOS.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted || !isVisible) return null;

  return (
    // Changed to 'relative' so it naturally pushes your layout down!
    <div className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white py-2 px-4 text-center relative z-[9999] flex justify-center items-center text-xs md:text-sm font-medium shadow-md h-10 transition-all duration-300">
      <div className="flex items-center gap-2 justify-center pr-6 transition-opacity duration-500">
        <span>{PROMOS[currentSlide].emoji}</span>
        <span className="tracking-wide">
          {PROMOS[currentSlide].text}
        </span>
        <span className="inline-block bg-white text-blue-700 px-2 py-0.5 rounded font-bold tracking-wider uppercase text-[10px] md:text-xs ml-1 shadow-sm">
          Code: {PROMOS[currentSlide].code}
        </span>
      </div>
      
      <button 
        onClick={() => {
          setIsVisible(false);
          sessionStorage.setItem('apd_promo_closed', 'true');
        }}
        className="absolute right-3 p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
        aria-label="Dismiss banner"
      >
        <span className="block w-4 h-4 text-center leading-3 text-lg">&times;</span>
      </button>
    </div>
  );
}