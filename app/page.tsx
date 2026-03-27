"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Search, Car, ShieldCheck, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  
  // 1. Logic to prevent "Time Travel" (Validation)
  const today = new Date().toISOString().split('T')[0];
  const [dropoffDate, setDropoffDate] = useState(today);
  const [pickupDate, setPickupDate] = useState(today);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Create the search URL with all our parameters
    const params = new URLSearchParams({
      dropoffDate: formData.get('dropoffDate') as string,
      dropoffTime: formData.get('dropoffTime') as string,
      pickupDate: formData.get('pickupDate') as string,
      pickupTime: formData.get('pickupTime') as string,
    });

    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <div className="relative bg-blue-900 pt-20 pb-40 px-4 overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
          >
            Smarter Airport <span className="text-blue-400">Parking.</span>
          </motion.h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12">
            Premium Meet & Greet services. Drop your car at the terminal and fly away. Secure, fast, and reliable.
          </p>

          {/* THE SEARCH BOX */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl mx-auto"
          >
            <form onSubmit={handleSearch} className="bg-white p-4 md:p-8 rounded-[32px] shadow-2xl border border-blue-100/50 flex flex-col lg:flex-row items-end gap-4">
              
              {/* DROP OFF GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-