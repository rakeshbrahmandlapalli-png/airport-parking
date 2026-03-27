"use client";
import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Car, ShieldCheck, Crown, Star, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const PARKING_OPTIONS = [
  {
    id: 'budget',
    name: '1. ABC MEET & GREET',
    price: 9.99,
    originalPrice: 15.00,
    description: 'Most affordable VIP service. Secure perimeter.',
    features: ['Free Cancellation', 'Valet Service'],
    icon: <Car className="w-6 h-6 text-gray-500" />,
    tag: 'BEST VALUE',
    rating: 4
  },
  {
    id: 'silver',
    name: '2. XYZ MEET & GREET',
    price: 15.50,
    originalPrice: 25.00,
    description: 'Premium terminal drop-off with 24/7 CCTV.',
    features: ['Free Cancellation', 'Valet Service', 'Priority Return'],
    icon: <ShieldCheck className="w-6 h-6 text-blue-500" />,
    tag: 'MOST POPULAR',
    rating: 5,
    popular: true
  },
  {
    id: 'gold',
    name: '3. 123 MEET & GREET',
    price: 29.00,
    originalPrice: 45.00,
    description: 'The ultimate VIP experience. Terminal 1, 2, & 3.',
    features: ['Free Cancellation', 'Valet Service', 'Car Wash Included'],
    icon: <Crown className="w-6 h-6 text-amber-500" />,
    tag: 'ULTIMATE COMFORT',
    rating: 5
  }
];

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleBookNow = (type: string) => {
    router.push(`/checkout?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-blue-900 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">Available Meet & Greet Spots</h1>
            <p className="text-blue-200 text-sm mt-1">March 26 - March 30 • 1 Car</p>
          </div>
          <button onClick={() => router.push('/')} className="text-sm underline hover:text-white text-blue-200">
            Change Dates
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-10 px-4 space-y-6">
        {PARKING_OPTIONS.map((option, index) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            key={option.id}
            className={`bg-white rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm border-2 transition-all hover:shadow-md ${option.popular ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent'}`}
          >
            <div className="bg-gray-50 p-6 rounded-2xl">
              {option.icon}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${option.id === 'gold' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {option.tag}
                </span>
                <div className="flex text-amber-400">
                  {[...Array(option.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{option.name}</h3>
              <p className="text-gray-500 mb-4">{option.description}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                {option.features.map(feat => (
                  <div key={feat} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 size={14} /> {feat}
                  </div>
                ))}
              </div>
            </div>

            <div className="md:w-48 text-center md:text-right border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
              <p className="text-gray-400 line-through text-sm">£{option.originalPrice.toFixed(2)}</p>
              <div className="flex items-center justify-center md:justify-end gap-1 mb-4">
                <span className="text-4xl font-black text-gray-900">£{option.price.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-gray-400 mb-6 uppercase tracking-widest font-bold">Total for 4 days</p>
              
              <button 
                onClick={() => handleBookNow(option.id)}
                className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 ${option.popular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-none'} shadow-lg`}
              >
                Book Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}