"use client";

import { useState } from "react"; 
import { supabase } from "../lib/supabase";
import { 
  Ticket, 
  Calendar, 
  Loader2, 
  ArrowRight, 
  Printer, 
  User, 
  MapPin, 
  CheckCircle2,
  Car,
  PlaneTakeoff,
  CalendarPlus,
  CreditCard,
  Lock,
  ArrowLeft,
  Receipt,
  Search,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function ManageBooking() {
  // --- SEARCH STATES ---
  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- EXTENSION STATES ---
  const [isExtending, setIsExtending] = useState(false);
  const [newPickupDate, setNewPickupDate] = useState("");
  const [extensionLoading, setExtensionLoading] = useState(false);
  
  const [extensionSuccess, setExtensionSuccess] = useState<{
    oldDate: string;
    newDate: string;
    extraPaid: number;
  } | null>(null);

  // 1. SEARCH FOR BOOKING (FLEXIBLE SEARCH: REF OR NAME)
  const findBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBooking(null);
    setIsExtending(false);
    setExtensionSuccess(null);

    try {
      // Build the flexible query
      let query = supabase.from("bookings").select("*");

      if (ref.trim() && fullName.trim()) {
        // If both provided, we strictly check both for security
        query = query
          .eq("booking_ref", ref.toUpperCase().trim())
          .ilike("full_name", `%${fullName.trim()}%`);
      } else if (ref.trim()) {
        // Login with Reference only
        query = query.eq("booking_ref", ref.toUpperCase().trim());
      } else if (fullName.trim()) {
        // Login with Full Name only
        query = query.ilike("full_name", `%${fullName.trim()}%`);
      }

      const { data, error: dbError } = await query.maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError("Reservation not found. Please try again with different details.");
      } else {
        setBooking(data);
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      setError("An error occurred while connecting to the database.");
    } finally {
      setLoading(false);
    }
  };

  // 2. CALCULATE EXTENSION COSTS
  const calculateExtension = () => {
    if (!booking || !newPickupDate) return { extraDays: 0, extraCost: 0, dailyRate: 0 };
    
    const start = new Date(booking.dropoff_date);
    const originalEnd = new Date(booking.pickup_date);
    const newEnd = new Date(newPickupDate);
    
    if (newEnd <= originalEnd) return { extraDays: 0, extraCost: 0, dailyRate: 0 };

    const originalDiffTime = originalEnd.getTime() - start.getTime();
    let originalDays = Math.ceil(originalDiffTime / (1000 * 60 * 60 * 24));
    if (originalDays <= 0) originalDays = 1;
    
    const dailyRate = Number(booking.total_price) / originalDays;

    const extraDiffTime = newEnd.getTime() - originalEnd.getTime();
    const extraDays = Math.ceil(extraDiffTime / (1000 * 60 * 60 * 24));

    return {
      extraDays,
      extraCost: extraDays * dailyRate,
      dailyRate
    };
  };

  const extensionData = calculateExtension();

  // 3. PROCESS EXTENSION
  const handleExtendBooking = async () => {
    if (extensionData.extraDays <= 0) return;
    setExtensionLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newTotal = Number(booking.total_price) + extensionData.extraCost;
      const oldPickupDate = booking.pickup_date;

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          pickup_date: newPickupDate,
          total_price: newTotal
        })
        .eq('booking_ref', booking.booking_ref);

      if (updateError) throw updateError;

      setExtensionSuccess({
        oldDate: oldPickupDate,
        newDate: newPickupDate,
        extraPaid: extensionData.extraPaid || extensionData.extraCost
      });

      setBooking({
        ...booking,
        pickup_date: newPickupDate,
        total_price: newTotal
      });

    } catch (err: any) {
      alert("Extension failed: " + err.message);
    } finally {
      setExtensionLoading(false);
    }
  };

  const getMinExtensionDate = () => {
    if (!booking) return "";
    const date = new Date(booking.pickup_date);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-6 font-sans">
      <div className="max-w-3xl mx-auto mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return Home
        </Link>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {!booking ? (
          /* SEARCH FORM */
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-200 relative z-10">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight relative z-10">Manage Trip</h1>
            <p className="text-slate-500 font-bold text-sm mb-10 relative z-10">Provide either your reference or name to continue.</p>

            <form onSubmit={findBooking} className="space-y-5 text-left relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Reference Number</label>
                <input 
                  type="text" 
                  placeholder="APV-XXXXXX" 
                  className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white shadow-inner uppercase"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                />
              </div>

              <div className="relative py-2 flex items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter name used for booking" 
                  className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white shadow-inner"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                   <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                   <p className="text-red-600 text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || (!ref.trim() && !fullName.trim())}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 mt-6 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access My Booking <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        ) : (
          /* BOOKING DETAILS CARD */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none">
              
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-slate-900 print:border-b print:border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 print:hidden"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 print:hidden" />
                    <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] print:text-blue-600">Booking Active</p>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tighter font-mono">{booking.booking_ref}</h2>
                </div>
              </div>

              <div className="p-8 md:p-10 space-y-10">
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <PlaneTakeoff className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-0.5">Location</p>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{booking.airport}</p>
                    <p className="text-blue-600 font-black text-sm">{booking.terminal}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Lead Passenger
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.full_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-blue-500" /> Vehicle Registered
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-tight uppercase">{booking.license_plate}</p>
                      <p className="text-sm font-bold text-slate-500">{booking.car_make}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-center md:items-end">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Total Paid</p>
                    <p className="text-5xl font-black text-slate-900 tracking-tighter">£{Number(booking.total_price).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                  <div className="p-6 md:p-8 bg-white border-r-2 border-slate-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Drop-off</p>
                    <p className="text-sm md:text-lg font-black text-slate-900">{formatDate(booking.dropoff_date)}</p>
                  </div>
                  <div className="p-6 md:p-8 bg-slate-50/50 flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Pick-up</p>
                    <p className="text-sm md:text-lg font-black text-slate-900 text-right">{formatDate(booking.pickup_date)}</p>
                  </div>
                </div>

                <div className="print:hidden">
                  {extensionSuccess ? (
                    <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-200 shadow-sm animate-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 pb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <h3 className="text-xl font-black tracking-tight text-emerald-900">Updated Summary</h3>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm"><span className="text-emerald-700 font-bold">New Return:</span> <span className="font-black">{formatDate(extensionSuccess.newDate)}</span></div>
                        <div className="flex justify-between text-sm border-t border-emerald-100 pt-3"><span className="text-emerald-700 font-bold">Amount Paid:</span> <span className="font-black">£{extensionSuccess.extraPaid.toFixed(2)}</span></div>
                      </div>
                      <button onClick={() => setExtensionSuccess(null)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">Done</button>
                    </div>
                  ) : !isExtending ? (
                    <button onClick={() => setIsExtending(true)} className="w-full py-4 border-2 border-dashed border-blue-200 hover:bg-blue-50 text-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
                      <CalendarPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Extend your booking
                    </button>
                  ) : (
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 border border-slate-800">
                      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-blue-400" /> New Pick-up Date</h3>
                        <button onClick={() => setIsExtending(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <input 
                          type="date" 
                          min={getMinExtensionDate()} 
                          value={newPickupDate} 
                          onChange={(e) => setNewPickupDate(e.target.value)} 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 font-bold text-white [color-scheme:dark] outline-none" 
                        />
                        {newPickupDate && extensionData.extraDays > 0 && (
                          <div className="bg-slate-800/50 p-4 rounded-xl text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Additional Due</p>
                             <p className="text-3xl font-black text-emerald-400">£{extensionData.extraCost.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      {newPickupDate && extensionData.extraDays > 0 && (
                        <button onClick={handleExtendBooking} disabled={extensionLoading} className="w-full h-14 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl flex items-center justify-center gap-2 tracking-widest text-sm uppercase transition-all">
                          {extensionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Pay & Extend</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
              <button onClick={() => window.print()} className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                <Printer className="w-4 h-4" /> Print PDF Voucher
              </button>
              <button onClick={() => { setBooking(null); setRef(""); setFullName(""); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95">
                 Lookup Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}