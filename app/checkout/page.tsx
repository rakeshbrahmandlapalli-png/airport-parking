"use client";
import { useSearchParams } from "next/navigation";
import { createCheckoutSession } from "../actions";
import { motion } from "framer-motion";
import { CreditCard, Calendar, Car, ShieldCheck, Phone, Mail, Plane } from "lucide-react";
import { Suspense } from "react";

const PRICES = {
  budget: { name: "1. ABC MEET & GREET", price: 9.99 },
  silver: { name: "2. XYZ MEET & GREET", price: 15.50 },
  gold: { name: "3. 123 MEET & GREET", price: 29.00 },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") as keyof typeof PRICES) || "silver";
  const selected = PRICES[type];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row border border-slate-100"
      >
        {/* Summary Side */}
        <div className="bg-blue-600 p-10 text-white md:w-1/3 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-black mb-8 tracking-tight">Booking Summary</h2>
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-2 rounded-lg"><Car className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-black">Service</p>
                  <p className="font-bold text-lg leading-tight">{selected.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 p-2 rounded-lg"><Calendar className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-black">Total Price</p>
                  <p className="font-bold text-2xl">£{selected.price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-blue-400/30 flex items-center gap-2 text-blue-100 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" /> SECURE 256-BIT ENCRYPTION
          </div>
        </div>

        {/* Form Side */}
        <div className="p-10 md:w-2/3">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Customer Details</h2>
          
          <form action={createCheckoutSession} className="space-y-6 text-left">
            <input type="hidden" name="totalPrice" value={selected.price} />
            <input type="hidden" name="parkingType" value={selected.name} />
            
            <div className="grid grid-cols-1 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase ml-1">Full Name</label>
                <input name="customerName" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100" placeholder="e.g. Rakesh B." />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Mail size={12}/> Email Address</label>
                  <input type="email" name="customerEmail" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100" placeholder="rakesh@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Phone size={12}/> Mobile Number</label>
                  <input type="tel" name="customerPhone" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100" placeholder="07123 456789" />
                </div>
              </div>

              {/* License Plate & Flight Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Car size={12}/> License Plate</label>
                  <input name="licensePlate" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 uppercase" placeholder="ABC 123" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Plane size={12}/> Return Flight #</label>
                  <input name="flightNumber" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 uppercase" placeholder="BA123" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-lg">
              <CreditCard className="w-6 h-6" /> Pay Securely
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-blue-600 italic">Preparing Secure Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}