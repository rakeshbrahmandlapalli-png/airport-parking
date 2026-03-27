"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Search, ShieldCheck, Star, Zap } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [dropoffDate, setDropoffDate] = useState(today);
  const [pickupDate, setPickupDate] = useState(today);
  const [currentTime, setCurrentTime] = useState("10:00");

  useEffect(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    setCurrentTime(`${h}:${m}`);
  }, []);

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
    <div className="min-h-screen bg-slate-50">
      {/* Blue Header Section */}
      <div className="bg-blue-900 pt-16 pb-32 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
          Smarter Airport <span className="text-blue-400">Parking.</span>
        </h1>
        <p className="text-blue-100 mb-10 max-w-xl mx-auto">Premium Meet & Greet services at major terminals.</p>

        {/* Search Form */}
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-3xl shadow-2xl border border-slate-100">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 items-end">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={14} /> Drop-off Date
                </label>
                <input type="date" name="dropoffDate" min={today} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Clock size={14} /> Time
                </label>
                <input type="time" name="dropoffTime" min={dropoffDate === today ? currentTime : "00:00"} defaultValue="10:00" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar size={14} /> Pick-up Date
                </label>
                <input type="date" name="pickupDate" min={dropoffDate} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Clock size={14} /> Time
                </label>
                <input type="time" name="pickupTime" defaultValue="18:00" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>

            <button type="submit" className="w-full lg:w-48 h-[54px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
              <Search size={18} /> Find Parking
            </button>
          </form>
        </div>
      </div>

      {/* Badges Section */}
      <div className="max-w-6xl mx-auto -mt-10 px-4 grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="bg-white p-6 rounded-2xl shadow-md flex items-center gap-4">
          <ShieldCheck className="text-emerald-500" />
          <div className="text-left">
            <p className="font-bold text-sm">Secure</p>
            <p className="text-xs text-slate-400">24/7 CCTV</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md flex items-center gap-4">
          <Star className="text-amber-500" />
          <div className="text-left">
            <p className="font-bold text-sm">Top Rated</p>
            <p className="text-xs text-slate-400">5-Star Service</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md flex items-center gap-4">
          <Zap className="text-blue-500" />
          <div className="text-left">
            <p className="font-bold text-sm">Instant</p>
            <p className="text-xs text-slate-400">Confirmation</p>
          </div>
        </div>
      </div>
    </div>
  );
}