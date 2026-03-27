"use client";
import { useSearchParams } from "next/navigation";
import { createCheckoutSession } from "../actions";
import { motion } from "framer-motion";
import { CreditCard, Calendar, Car, ShieldCheck } from "lucide-react";
import { Suspense } from "react"; // <-- We added this!

const PRICES = {
  budget: { name: "Economy Outdoor", price: 7.99 }, // Changed to GBP equivalent
  silver: { name: "Park & Ride Premium", price: 12.50 },
  gold: { name: "Meet & Greet VIP", price: 24.00 },
};

// ... inside the Summary section, change the $ to £:
<p className="font-semibold text-lg text-white">£{selected.price.toFixed(2)}</p>

// 1. We moved your checkout design into this internal component
function CheckoutContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as keyof typeof PRICES) || "silver";
  const selected = PRICES[type];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row border border-gray-100"
      >
        {/* Left Side: Summary */}
        <div className="bg-blue-600 p-10 text-white md:w-2/5">
          <h2 className="text-2xl font-bold mb-6">Booking Summary</h2>
          <div className="space-y-6 opacity-90">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">Option Selected</p>
                <p className="font-semibold text-lg text-white">{selected.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-200" />
              <div>
                <p className="text-xs text-blue-200 uppercase font-bold tracking-wider">Price per stay</p>
                <p className="font-semibold text-lg text-white">${selected.price.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-6 border-t border-blue-400/30">
              <div className="flex items-center gap-2 text-blue-100 text-sm">
                <ShieldCheck className="w-4 h-4" /> Secure & Encrypted
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-10 md:w-3/5">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Confirm Your Spot</h2>
          
          <form action={createCheckoutSession} className="space-y-6">
            <input type="hidden" name="totalPrice" value={selected.price} />
            <input type="hidden" name="parkingType" value={selected.name} />
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                name="customerName" 
                required 
                placeholder="Rakesh..."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">License Plate Number</label>
              <input 
                name="licensePlate" 
                required 
                placeholder="XYZ 1234"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all uppercase"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-lg transition duration-300 flex items-center justify-center gap-2 text-lg"
            >
              <CreditCard className="w-6 h-6" />
              Pay Securely
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// 2. We wrap it in Suspense to make Vercel happy!
export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl font-bold text-blue-600">Loading Secure Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}