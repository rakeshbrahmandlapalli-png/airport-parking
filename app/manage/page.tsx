"use client";

import { useState, useEffect } from "react"; 
import { supabase } from "../lib/supabase";
import { 
  Ticket, Calendar, Loader2, ArrowRight, Printer, User, MapPin, 
  CheckCircle2, Car, PlaneTakeoff, CalendarPlus, CreditCard, Lock, 
  ArrowLeft, Receipt, Search, AlertCircle, Edit2, 
  XCircle, Phone, Info
} from "lucide-react";
import Link from "next/link";

export default function ManageBooking() {
  // --- SEARCH STATES ---
  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [company, setCompany] = useState<any>(null); // NEW: Holds the provider's details
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

  // --- FLIGHT EDIT STATES ---
  const [isEditingFlight, setIsEditingFlight] = useState(false);
  const [newFlightNum, setNewFlightNum] = useState("");
  const [flightUpdateLoading, setFlightUpdateLoading] = useState(false);

  // 1. SEARCH FOR BOOKING & FETCH COMPANY INFO
  const findBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBooking(null);
    setCompany(null);
    setIsExtending(false);
    setExtensionSuccess(null);

    try {
      let query = supabase.from("bookings").select("*");

      if (ref.trim() && fullName.trim()) {
        query = query.eq("booking_ref", ref.toUpperCase().trim()).ilike("full_name", `%${fullName.trim()}%`);
      } else if (ref.trim()) {
        query = query.eq("booking_ref", ref.toUpperCase().trim());
      } else if (fullName.trim()) {
        query = query.ilike("full_name", `%${fullName.trim()}%`);
      }

      const { data, error: dbError } = await query.maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError("Reservation not found. Please try again with different details.");
      } else {
        setBooking(data);
        setNewFlightNum(data.flight_number || "");

        // Using company_id to match your Prisma Schema
        if (data.company_id) {
          const { data: companyData } = await supabase
            .from('companies') 
            .select('*')
            .eq('id', data.company_id)
            .maybeSingle();

          if (companyData) {
            setCompany(companyData);
          }
        }
      }
    } catch (err: any) {
      console.error("Search Error:", err);
      setError("An error occurred while connecting to the database.");
    } finally {
      setLoading(false);
    }
  };

  // 2. PROCESS EXTENSION USING ADVANCED TIER PRICING
  const calculateExtension = () => {
    // Wait until company data is loaded so we have the tier rates
    if (!booking || !newPickupDate || !company) return { extraDays: 0, extraCost: 0 };
    
    const start = new Date(booking.dropoff_date);
    const originalEnd = new Date(booking.pickup_date);
    const newEnd = new Date(newPickupDate);
    
    if (newEnd <= originalEnd) return { extraDays: 0, extraCost: 0 };

    // Find extra days
    const extraDiffTime = newEnd.getTime() - originalEnd.getTime();
    const extraDays = Math.ceil(extraDiffTime / (1000 * 60 * 60 * 24));

    // Find NEW total days
    const newTotalDiffTime = newEnd.getTime() - start.getTime();
    let newTotalDays = Math.ceil(newTotalDiffTime / (1000 * 60 * 60 * 24));
    if (newTotalDays <= 0) newTotalDays = 1;

    // Determine which airport rates to use
    const isLuton = booking.airport?.toLowerCase().includes("luton");
    const basePrice = Number(isLuton ? company.luton_price : company.heathrow_price);
    const tier1Rate = Number(isLuton ? company.ltn_tier1_extra_rate : company.lhr_tier1_extra_rate);
    const tier2Rate = Number(isLuton ? company.ltn_tier2_extra_rate : company.lhr_tier2_extra_rate);

    // Calculate NEW total price based on your Admin Tier Logic
    let newCalculatedTotal = 0;
    
    if (newTotalDays === 1) {
      newCalculatedTotal = basePrice;
    } else if (newTotalDays <= 6) {
      // Base + Tier 1 for days 2 through 6
      newCalculatedTotal = basePrice + ((newTotalDays - 1) * tier1Rate);
    } else {
      // Base + 5 days of Tier 1 + remaining days of Tier 2
      newCalculatedTotal = basePrice + (5 * tier1Rate) + ((newTotalDays - 6) * tier2Rate);
    }

    // The cost to the user is the new correct total MINUS what they already paid
    let extraCost = newCalculatedTotal - Number(booking.total_price);
    
    // Safety check: Never charge less than 0
    if (extraCost < 0) extraCost = 0;

    return { extraDays, extraCost };
  };

  const extensionData = calculateExtension();

  const handleExtendBooking = async () => {
    if (extensionData.extraDays <= 0) return;
    setExtensionLoading(true);

    try {
      const newTotal = Number(booking.total_price) + extensionData.extraCost;
      const oldPickupDate = booking.pickup_date;

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ pickup_date: newPickupDate, total_price: newTotal })
        .eq('booking_ref', booking.booking_ref);

      if (updateError) throw updateError;

      await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXTENSION',
          ref: booking.booking_ref,
          oldDate: oldPickupDate,
          newDate: newPickupDate,
          addedCost: extensionData.extraCost
        })
      });

      setExtensionSuccess({ oldDate: oldPickupDate, newDate: newPickupDate, extraPaid: extensionData.extraCost });
      setBooking({ ...booking, pickup_date: newPickupDate, total_price: newTotal });

    } catch (err: any) {
      alert("Extension failed: " + err.message);
    } finally {
      setExtensionLoading(false);
    }  
  };

  // UPDATE FLIGHT DETAILS & NOTIFY ADMIN
  const handleUpdateFlight = async () => {
    if (!newFlightNum.trim() || newFlightNum === booking.flight_number) {
      setIsEditingFlight(false);
      return;
    }
    setFlightUpdateLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ flight_number: newFlightNum.toUpperCase() })
        .eq('booking_ref', booking.booking_ref);

      if (updateError) throw updateError;

      await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FLIGHT_CHANGE',
          ref: booking.booking_ref,
          oldFlight: booking.flight_number,
          newFlight: newFlightNum.toUpperCase()
        })
      });

      setBooking({ ...booking, flight_number: newFlightNum.toUpperCase() });
      setIsEditingFlight(false);
    } catch (err: any) {
      alert("Failed to update flight details.");
    } finally {
      setFlightUpdateLoading(false);
    }
  };

  // CANCEL LOGIC
  const checkCanCancel = () => {
    if (!booking) return false;
    const dropoff = new Date(`${booking.dropoff_date}T${booking.dropoff_time || '00:00'}`);
    const now = new Date();
    const diffHours = (dropoff.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
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
    <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4 md:px-6 font-sans selection:bg-blue-200">
      <div className="max-w-3xl mx-auto mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return Home
        </Link>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {!booking ? (
          /* SEARCH FORM */
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-200 relative z-10">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight relative z-10">Manage Trip</h1>
            <p className="text-slate-500 font-bold text-xs md:text-sm mb-10 relative z-10">Provide either your reference or name to continue.</p>

            <form onSubmit={findBooking} className="space-y-5 text-left relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Reference Number</label>
                <input 
                  type="text" 
                  placeholder="APD-XXXXXX" 
                  autoComplete="off"
                  data-form-type="other"
                  className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white uppercase"
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
                  autoComplete="off"
                  data-form-type="other"
                  className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white"
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
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 mt-6 disabled:opacity-50 disabled:bg-slate-300 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access My Booking <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        ) : (
          /* BOOKING DETAILS CARD */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none">
              
              <div className="p-6 md:p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:bg-white print:text-slate-900 print:border-b print:border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 print:hidden"></div>
                <div className="relative z-10 w-full flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 print:hidden" />
                      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] print:text-blue-600">Booking Active</p>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-mono">{booking.booking_ref}</h2>
                  </div>
                  <div className="print:hidden">
                    {checkCanCancel() ? (
                      <Link href={`/cancel?ref=${booking.booking_ref}`} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-black uppercase tracking-wider transition-all">
                        Cancel Booking
                      </Link>
                    ) : (
                      <Link href="/contact" className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Contact Support
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-8">
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-0.5">Location</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.airport}</p>
                      <p className="text-blue-600 font-black text-sm">{booking.terminal}</p>
                    </div>
                  </div>
                  
                  <div className="pl-0 md:pl-6 md:border-l border-slate-200 w-full md:w-auto">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1 flex items-center justify-between">
                      Return Flight Number
                      {!isEditingFlight && (
                        <button onClick={() => setIsEditingFlight(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 print:hidden">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </p>
                    {isEditingFlight ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                          type="text" 
                          value={newFlightNum}
                          onChange={(e) => setNewFlightNum(e.target.value)}
                          className="p-2 text-sm border border-slate-300 rounded-lg font-bold w-32 uppercase"
                          placeholder="e.g. EZY123"
                        />
                        <button onClick={handleUpdateFlight} disabled={flightUpdateLoading} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          {flightUpdateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setIsEditingFlight(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.flight_number || "Not Provided"}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
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
                  
                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-start md:items-end">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Total Paid</p>
                    <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">£{Number(booking.total_price).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                  <div className="p-4 md:p-8 bg-white border-r-2 border-slate-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Drop-off</p>
                    <p className="text-sm md:text-lg font-black text-slate-900">{formatDate(booking.dropoff_date)}</p>
                    <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{booking.dropoff_time || "12:00"}</p>
                  </div>
                  <div className="p-4 md:p-8 bg-slate-50/50 flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Pick-up</p>
                    <p className="text-sm md:text-lg font-black text-slate-900 text-right">{formatDate(booking.pickup_date)}</p>
                    <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{booking.pickup_time || "12:00"}</p>
                  </div>
                </div>

                {/* DYNAMIC DATABASE INSTRUCTIONS FOR LTN / LHR */}
                <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 hidden print:block mb-8">
                  <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2"><Info className="w-5 h-5" /> Arrival & Return Instructions</h3>
                  <div className="space-y-4">
                    {company ? (
                      <>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">Company Contact</p>
                          <p className="text-lg font-bold text-slate-900">
                            {company.phone_number || "Check Confirmation Email"} 
                            {company.phone_number_2 ? ` / ${company.phone_number_2}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">On Arrival</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {booking.airport?.toLowerCase().includes("luton") 
                              ? (company.on_arrival_ltn || company.on_arrival) 
                              : (company.on_arrival_lhr || company.on_arrival) || "Refer to your confirmation email for arrival instructions."}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">On Return</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {booking.airport?.toLowerCase().includes("luton") 
                              ? (company.on_return_ltn || company.on_return) 
                              : (company.on_return_lhr || company.on_return) || "Refer to your confirmation email for return instructions."}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">Please refer to your confirmation email for specific drop-off and pick-up instructions.</p>
                    )}
                  </div>
                </div>

                {/* Extension Logic */}
                <div className="print:hidden">
                  {extensionSuccess ? (
                    <div className="bg-emerald-50 rounded-[2rem] p-6 md:p-8 border border-emerald-200">
                      <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 pb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <h3 className="text-xl font-black text-emerald-900">Updated Summary</h3>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm"><span className="text-emerald-700 font-bold">New Return:</span> <span className="font-black">{formatDate(extensionSuccess.newDate)}</span></div>
                        <div className="flex justify-between text-sm border-t border-emerald-100 pt-3"><span className="text-emerald-700 font-bold">Amount Paid:</span> <span className="font-black">£{extensionSuccess.extraPaid.toFixed(2)}</span></div>
                      </div>
                      <button onClick={() => setExtensionSuccess(null)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">Done</button>
                    </div>
                  ) : !isExtending ? (
                    <button onClick={() => setIsExtending(true)} className="w-full py-4 border-2 border-dashed border-blue-200 hover:bg-blue-50 text-blue-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <CalendarPlus className="w-5 h-5" /> Extend your booking
                    </button>
                  ) : (
                    <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white">
                      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-blue-400" /> New Pick-up Date</h3>
                        <button onClick={() => setIsExtending(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white">Cancel</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <input 
                          type="date" 
                          name="newPickupDate"
                          autoComplete="off"
                          min={getMinExtensionDate()} 
                          value={newPickupDate} 
                          onChange={(e) => setNewPickupDate(e.target.value)} 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 font-bold text-white [color-scheme:dark] outline-none" 
                        />
                        {newPickupDate && extensionData.extraDays > 0 && (
                          <div className="bg-slate-800/50 p-4 rounded-xl text-right border border-slate-700/50">
                             <p className="text-[10px] font-black text-slate-400 uppercase">Additional Due</p>
                             <p className="text-3xl font-black text-emerald-400">£{extensionData.extraCost.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                        {/* Note: In reality, you'd wire this to Stripe/PayPal before finalizing the DB update */}
                      {newPickupDate && extensionData.extraDays > 0 && (
                        <button onClick={handleExtendBooking} disabled={extensionLoading} className="w-full h-14 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm uppercase">
                          {extensionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> Pay & Extend</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden w-full">
              <button onClick={() => window.print()} className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                <Printer className="w-4 h-4" /> Print PDF Voucher
              </button>
              <button onClick={() => { setBooking(null); setCompany(null); setRef(""); setFullName(""); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                Lookup Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}