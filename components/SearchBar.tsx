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
    // The whole box slides up and fades in smoothly
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-5xl mx-auto border border-white/40"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        
        {/* Drop-off Date with hover effect */}
        <motion.div whileHover={{ scale: 1.02 }} className="w-full">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600"/> Drop-off Date
          </label>
          <input 
            type="date" 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-gray-800 font-medium"
            onChange={(e) => setDropoff(e.target.value)}
          />
        </motion.div>

        {/* Pick-up Date with hover effect */}
        <motion.div whileHover={{ scale: 1.02 }} className="w-full">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600"/> Pick-up Date
          </label>
          <input 
            type="date" 
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all text-gray-800 font-medium"
            onChange={(e) => setPickup(e.target.value)}
          />
        </motion.div>

        {/* Animated 3D Button */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition duration-300 shadow-[0_8px_30px_rgb(37,99,235,0.3)] flex items-center justify-center gap-2 w-full"
        >
          <Search className="w-5 h-5" />
          Find Parking
        </motion.button>
      </div>
    </motion.div>
  );
}