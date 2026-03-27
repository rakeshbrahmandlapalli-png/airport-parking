"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Search, ShieldCheck, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  
  const today = new Date().toISOString().split('T')[0];
  const [dropoffDate, setDropoffDate] = useState(today);
  const [pickupDate, setPickupDate] = useState(today);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
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
            <form onSubmit={handleSearch} className="bg-white p-4 md:p-8 rounded-[32px] shadow-2xl border border-blue-100/50 flex flex-col lg:flex-row items-end gap-4 text-left">
              
              {/* DROP OFF GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1 ml-1">
                    <Calendar size={14} className="text-blue-600" /> Drop-off Date
                  </label>
                  <input 
                    type="date" 
                    name="dropoffDate"
                    min={today}
                    value={dropoffDate}
                    onChange={(e) => {
                      setDropoffDate(e.target.value);
                      if (e.target.value > pickupDate) setPickupDate(e.target.value);
                    }}
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium text-gray-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1 ml-1">
                    <Clock size={14} className="text-blue-600" /> Time
                  </label>
                  <input 
                    type="time" 
                    name="dropoffTime"
                    defaultValue="10:00"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium text-gray-900" 
                  />
                </div>
              </div>

              {/* PICK UP GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1 ml-1">
                    <Calendar size={14} className="text-blue-600" /> Pick-up Date
                  </label>
                  <input 
                    type="date" 
                    name="pickupDate"
                    min={dropoffDate}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium text-gray-900" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1 ml-1">
                    <Clock size={14} className="text-blue-600" /> Time
                  </label>
                  <input 
                    type="time" 
                    name="pickupTime"
                    defaultValue="18:00"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium text-gray-900" 
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full lg:w-auto h-[60px] px-10 bg-blue-600 hover:bg-blue-700