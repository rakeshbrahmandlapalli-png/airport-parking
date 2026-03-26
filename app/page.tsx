"use client";
import SearchBar from "../components/SearchBar";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Clock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Premium Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 text-white pt-32 pb-40 px-4 text-center overflow-hidden">
        
        {/* Smooth Intro Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            Smarter Airport Parking.
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 mb-10 font-light">
            Book secure, top-rated spots in seconds. Save up to 60% compared to drive-up rates.
          </p>

          {/* Holiday Extras Style Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-blue-100 mt-8">
            <div className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-green-400"/> Secure & Patrolled</div>
            <div className="flex items-center gap-2"><Star className="w-6 h-6 text-yellow-400"/> 5-Star Rated</div>
            <div className="flex items-center gap-2"><Clock className="w-6 h-6 text-blue-300"/> 24/7 Fast Shuttle</div>
          </div>
        </motion.div>
      </div>

      {/* The floating Search Bar (Pulled up over the background) */}
      <div className="relative z-20 -mt-24 px-4 pb-20">
        <SearchBar />
      </div>
    </main>
  );
}