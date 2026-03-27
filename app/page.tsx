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
      <div className="relative bg-blue-900 pt-20 pb-40 px-4">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-white mb-6"
          >
            Smarter Airport <span className="text-blue-400">Parking.</span>
          </motion.h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12">
            Premium Meet & Greet services. Drop your car and fly away.
          </p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
            <form onSubmit={handleSearch} className="bg-white p-6 rounded-[32px] shadow-2xl flex flex-col lg:flex-row items-end gap-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={14} /> Drop-off Date
                  </label>
                  <input type="date" name="dropoffDate" min={today} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={14} /> Time
                  </label>
                  <input type="time" name="dropoffTime" defaultValue="10:00" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={14} /> Pick-up Date
                  </label>
                  <input type="date" name="pickupDate" min={dropoffDate} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={14} /> Time
                  </label>
                  <input type="time" name="pickupTime" defaultValue="18:00" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" />
                </div>
              </div>

              <button type="submit" className="w-full lg:w-48 h-[60px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                <Search size={20} /> Find Parking
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto -mt-16 px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-lg border flex items-center gap-4">
            <ShieldCheck className="text-emerald-600" />
            <div><p className="font-bold text-sm">Secure</p><p className="text-xs text-slate-500">24/7 CCTV</p></div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border flex items-center gap-4">
            <Star className="text-amber-600" />
            <div><p className="font-bold text-sm">Top Rated</p><p className="text-xs text-slate-500">5-Star Service</p></div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border flex items-center gap-4">
            <Zap className="text-blue-600" />
            <div><p className="font-bold text-sm">Instant</p><p className="text-xs text-slate-500">Book in seconds</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}