"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Search } from "lucide-react";

export default function SearchBar() {
  const [dropoff, setDropoff] = useState("");
  const [pickup, setPickup] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (!dropoff || !pickup) {
      alert("Please select both dates!");
      return;
    }
    router.push("/results");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      // 🟢 INCREASED: Padding from p-8 to p-10 to match local "roomy" feel
      className="bg-white/95 backdrop-blur-md p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-5xl mx-auto border border-white/40"
    >
      {/* 🟢 INCREASED: Gap from gap-6 to gap-8 to prevent production "squish" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        
        {/* Drop-off Date */}
        <motion.div whileHover={{ scale: 1.01 }} className="w-full">
          {/* 🟢 INCREASED: mb-3 for cleaner separation */}
          <label className="text-[13px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-blue-600"/> Drop-off Date
          </label>
          <input 
            type="date" 
            // 🟢 FIXED: Explicit h-14 and px-6 to force a fuller look
            className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 outline-none transition-all text-slate-700 font-bold appearance-none"
            onChange={(e) => setDropoff(e.target.value)}
          />
        </motion.div>

        {/* Pick-up Date */}
        <motion.div whileHover={{ scale: 1.01 }} className="w-full">
          <label className="text-[13px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-blue-600"/> Pick-up Date
          </label>
          <input 
            type="date" 
            className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 outline-none transition-all text-slate-700 font-bold appearance-none"
            onChange={(e) => setPickup(e.target.value)}
          />
        </motion.div>

        {/* Animated 3D Button */}
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSearch}
          // 🟢 MATCHED: Height h-14 to match inputs exactly
          className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest h-14 px-8 rounded-2xl transition-all duration-300 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 w-full"
        >
          <Search className="w-5 h-5" />
          Find Parking
        </motion.button>
      </div>
    </motion.div>
  );
}