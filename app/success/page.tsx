"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, Plane, Calendar, Phone, Car, ArrowRight, Printer } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Top Celebration Bar */}
        <div className="bg-emerald-500 p-12 text-center text-white relative">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex bg-white/20 p-4 rounded-full mb-6"
          >
            <CheckCircle2 size={48} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Booking Confirmed!</h1>
          <p className="text-emerald-100 font-medium text-lg">Your VIP parking spot is ready for you.</p>
        </div>

        {/* The "Ticket" Content */}
        <div className="p-10">
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Vehicle & Flight */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600"><Car size={20}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Plate</p>
                    <p className="font-bold text-slate-900">Check Email for Receipt</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600"><Plane size={20}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Return Flight</p>
                    <p className="font-bold text-slate-900">Tracking Enabled</p>
                  </div>
                </div>
              </div>

              {/* Status & Support */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600"><Calendar size={20}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Type</p>
                    <p className="font-bold text-slate-900">Premium Meet & Greet</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600"><Phone size={20}/></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Line</p>
                    <p className="font-bold text-slate-900">0800-PARK-VIP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="pt-8 border-t border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                What happens next?
              </h3>
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  Call our driver 20 minutes before arriving at the terminal.
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  Hand over your keys at the designated Meet & Greet bay.
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  Your car will be waiting for you outside the terminal when you land.
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-white border-2 border-slate-100 hover:border-slate-200 py-4 rounded-2xl font-bold text-slate-600 flex items-center justify-center gap-2 transition-all"
            >
              <Printer size={18} /> Print Receipt
            </button>
            <Link 
              href="/" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-100"
            >
              Back to Home <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-6 bg-slate-50 text-center text-[11px] text-slate-400 font-medium uppercase tracking-widest">
          A confirmation email has been sent to your inbox.
        </div>
      </motion.div>
    </div>
  );
}