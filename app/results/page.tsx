"use client";
import { motion } from "framer-motion";
import { Shield, Zap, Car, Check, Star } from "lucide-react";
import Link from "next/link";

const PARKING_OPTIONS = [
  {
    id: "budget",
    name: "Economy Outdoor",
    price: 9.99,
    description: "5-min shuttle ride, fenced perimeter.",
    icon: <Car className="w-6 h-6 text-gray-500" />,
    tag: "Best Value",
    color: "gray"
  },
  {
    id: "silver",
    name: "Park & Ride Premium",
    price: 15.50,
    description: "On-demand shuttle, 24/7 CCTV, closer to terminal.",
    icon: <Shield className="w-6 h-6 text-blue-500" />,
    tag: "Most Popular",
    color: "blue"
  },
  {
    id: "gold",
    name: "Meet & Greet VIP",
    price: 29.00,
    description: "Drop your car at the terminal. We park it for you.",
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    tag: "Ultimate Comfort",
    color: "indigo"
  }
];

export default function Results() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Search Summary Header */}
      <div className="bg-blue-900 text-white py-6 px-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Available Spots</h2>
            <p className="text-blue-200 text-sm">March 26 - March 30 • 1 Car</p>
          </div>
          <Link href="/" className="text-sm underline opacity-80 hover:opacity-100">Change Dates</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 gap-6">
          {PARKING_OPTIONS.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6"
            >
              {/* Left Side: Info */}
              <div className="flex items-center gap-6 w-full md:w-2/3">
                <div className={`p-5 bg-gray-50 rounded-2xl`}>
                  {option.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      {option.tag}
                    </span>
                    <div className="flex text-yellow-400"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{option.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{option.description}</p>
                  
                  <div className="flex gap-4 mt-3 text-xs text-green-600 font-semibold">
                    <div className="flex items-center gap-1"><Check className="w-3 h-3"/> Free Cancellation</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3"/> Self-Park</div>
                  </div>
                </div>
              </div>

              {/* Right Side: Price & CTA */}
              <div className="w-full md:w-1/3 flex md:flex-col items-center justify-between md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                <div className="text-right">
                  <p className="text-gray-400 text-xs line-through">$45.00</p>
                  <p className="text-3xl font-black text-gray-900">${option.price.toFixed(2)}</p>
                  <p className="text-gray-500 text-[10px]">Total for 4 days</p>
                </div>
                <Link 
                  href={`/checkout?type=${option.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition shadow-lg mt-4 text-center"
                >
                  Book Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}