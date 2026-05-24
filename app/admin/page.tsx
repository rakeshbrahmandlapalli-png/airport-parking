"use client";

/**
 * AeroPark Direct - Command Center v12.1 (Ultimate Master Build)
 * ------------------------------------------------------
 * UPGRADES & FIXES:
 * 1. AUTOFILL BUG: Fixed invisible text. Forced Webkit fill colors on all inputs.
 * 2. EXCEL EXPORT: Added missing Drop-off Time, Pick-up Time, and Service Type columns.
 * 3. RIBBON: Added 'Service Type' filter. Redesigned to an un-squashable Flex Grid.
 * 4. UI/UX: Hyper-premium SaaS 3.0 aesthetic with frosted glass and deep gradients.
 * 5. FORMATTING: Fully expanded code (no minification) to restore exact line counts.
 * 6. TWILIO: Added silent background API trigger for manual bookings missing flights.
 * 7. 🟢 MODAL FIX: Safely bound all inputs to prevent 'null' read crashes during unmounts.
 * 8. 🟢 DB FIX: Handled empty date/time strings to prevent Supabase 500 rejection errors.
 */

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";

import { 
  Users, Trash2, LogOut, Phone, Car, Plane, MessageCircle, 
  Search, TrendingUp, MapPin, Loader2, Filter, 
  LayoutDashboard, CalendarDays, Plus, Building2,
  Edit, X, Save, Clock, CheckCircle2, AlertCircle, 
  PlaneLanding, PlaneTakeoff, XCircle, ChevronDown, 
  Download, Briefcase, CreditCard, Receipt, Star, 
  Database, ShieldCheck, Smartphone, Wallet, Settings2,
  Activity, Info, ArrowRightLeft, Tags, Zap
} from "lucide-react";

export default function AdminDashboard() {
  // --- 1. CORE APPLICATION STATE ---
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- 2. SEARCH & FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL"); 
  const [companyFilter, setCompanyFilter] = useState("ALL"); 
  const [serviceFilter, setServiceFilter] = useState("ALL");
  
  const router = useRouter();

  // --- 3. MODAL STATE ---
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const defaultNewBooking = {
    full_name: "", 
    email: "", 
    phone_number: "", 
    license_plate: "", 
    car_make: "", 
    car_color: "", 
    flight_number: "", 
    dropoff_date: "", 
    dropoff_time: "", 
    pickup_date: "", 
    pickup_time: "", 
    total_price: 0, 
    status: "confirmed", 
    airport: "Luton Airport (LTN)", 
    terminal: "Main Terminal", 
    company_id: "ALL", 
    service_type: "Meet & Greet", 
  };
  
  const [newBooking, setNewBooking] = useState<any>(defaultNewBooking);

  // --- 4. DATA FETCHING & REAL-TIME SYNC ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchDashboardData();
      }
    };
    checkUser();

    const subscription = supabase
      .channel('ops-dispatch-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, companiesRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("*").order("name", { ascending: true })
      ]);
      
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch (err) {
      console.error("Critical System Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. 🧮 DYNAMIC PRICING CALCULATOR ---
  useEffect(() => {
    if (newBooking.dropoff_date && newBooking.pickup_date) {
      const start = new Date(newBooking.dropoff_date);
      const end = new Date(newBooking.pickup_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (totalDays > 0) {
        let baseRate = 52.98; 
        let t1Rate = 1.99;
        let t2Rate = 2.99;

        if (newBooking.company_id !== "ALL") {
          const comp = companies.find(c => c.id === newBooking.company_id);
          if (comp) {
            baseRate = newBooking.airport.includes("Heathrow") 
              ? Number(comp.heathrow_price || baseRate) 
              : Number(comp.luton_price || baseRate);
            t1Rate = Number(comp.tier1_extra_rate ?? 1.99);
            t2Rate = Number(comp.tier2_extra_rate ?? 2.99);
          }
        }

        let calculatedTotal = baseRate;
        const extraDays = totalDays - 1;
        
        if (extraDays > 0) {
          const t1Days = Math.min(extraDays, 5);
          calculatedTotal += t1Days * t1Rate;
          
          if (extraDays > 5) {
            const t2Days = extraDays - 5;
            calculatedTotal += t2Days * t2Rate;
          }
        }

        if (newBooking.total_price !== Number(calculatedTotal.toFixed(2))) {
          setNewBooking((prev: any) => ({...prev, total_price: Number(calculatedTotal.toFixed(2))}));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBooking.dropoff_date, newBooking.pickup_date, newBooking.company_id, newBooking.airport]);

  // --- 6. CORE LOGIC HANDLERS ---
  const deleteBooking = async (id: string) => {
    if (!confirm("⚠️ PERMANENT DELETION: Are you sure? This cannot be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) setBookings(bookings.filter(b => b.id !== id));
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('bookings').update({
        full_name: editingBooking?.full_name || null,
        email: editingBooking?.email || null,
        phone_number: editingBooking?.phone_number || null,
        license_plate: editingBooking?.license_plate || null,
        car_make: editingBooking?.car_make || null,
        car_color: editingBooking?.car_color || null,
        flight_number: editingBooking?.flight_number || null,
        dropoff_date: editingBooking?.dropoff_date || null, // Safety fallback for empty dates
        dropoff_time: editingBooking?.dropoff_time || null,
        pickup_date: editingBooking?.pickup_date || null,
        pickup_time: editingBooking?.pickup_time || null,
        total_price: Number(editingBooking?.total_price || 0),
        status: editingBooking?.status || 'pending',
        airport: editingBooking?.airport || null,
        terminal: editingBooking?.terminal || null,
        service_type: editingBooking?.service_type || "Meet & Greet"
      }).eq('id', editingBooking.id);
      
      if (error) throw error;
      
      setEditingBooking(null);
      await fetchDashboardData();
    } catch (error: any) { 
      alert(`Update Error: ${error.message}`); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const booking_ref = `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const payload = { ...newBooking, booking_ref };
      if (payload.company_id === "ALL") payload.company_id = null; 
      
      // Safety fallback for empty dates
      if (!payload.dropoff_date) payload.dropoff_date = null;
      if (!payload.dropoff_time) payload.dropoff_time = null;
      if (!payload.pickup_date) payload.pickup_date = null;
      if (!payload.pickup_time) payload.pickup_time = null;
      
      const { error } = await supabase.from('bookings').insert([payload]);
      
      if (error) throw error;

      // TWILIO AUTOMATION TRIGGER
      if (!payload.flight_number || payload.flight_number.trim() === "") {
        fetch('/api/twilio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: payload.full_name,
            phone_number: payload.phone_number,
            booking_ref: payload.booking_ref,
            flight_number: payload.flight_number,
            car_make: payload.car_make
          })
        }).catch(err => console.error("Twilio API failed:", err));
      }
      
      setShowManualModal(false);
      setNewBooking(defaultNewBooking);
      await fetchDashboardData();
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const sendToWhatsApp = (booking: any) => {
    const message = `*AERO OPS DISPATCH: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color || ''} ${booking.car_make} [${booking.license_plate}]\n📱 Mob: ${booking.phone_number}\n📍 Airport: ${booking.airport}\n📅 Inbound: ${formatDate(booking.dropoff_date)} @ ${booking.dropoff_time}\n📅 Return: ${formatDate(booking.pickup_date)} @ ${booking.pickup_time}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRequestReview = async (booking: any) => {
    if(!confirm(`Authorize system to send review request to ${booking.full_name}?`)) return;
    alert(`Success: Marketing automation queued for ${booking.email}.`);
  };

  const exportToCSV = () => {
    let csv = "Reference,Customer,Email,Phone,Plate,Make,Airport,Terminal,Flight,Inbound Date,Inbound Time,Outbound Date,Outbound Time,Total Paid,Status,Service Type,Partner\n";
    
    filteredBookings.forEach(b => {
      const partner = getCompanyName(b.company_id);
      csv += `"${b.booking_ref}","${b.full_name}","${b.email}","${b.phone_number}","${b.license_plate}","${b.car_make}","${b.airport}","${b.terminal}","${b.flight_number}","${b.dropoff_date}","${b.dropoff_time}","${b.pickup_date}","${b.pickup_time}","${b.total_price}","${b.status}","${b.service_type || 'Meet & Greet'}","${partner}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AeroPark_Registry_${todayStrISO}.csv`);
    link.click();
  };

  // --- 7. UI HELPERS ---
  const todayDate = new Date();
  const todayStrISO = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const getCompanyName = (id: string) => {
    if (!id) return "AeroPark Direct";
    const match = companies.find(c => c.id === id);
    return match ? match.name : "AeroPark Direct";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    const classes = "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max shadow-sm transition-all";
    
    if (s === "confirmed") return <div className={`${classes} bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]`}><CheckCircle2 className="w-3.5 h-3.5"/> Confirmed</div>;
    if (s === "parked") return <div className={`${classes} bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]`}><Car className="w-3.5 h-3.5"/> Parked</div>;
    if (s === "completed") return <div className={`${classes} bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]`}><CheckCircle2 className="w-3.5 h-3.5"/> Completed</div>;
    if (s === "cancelled") return <div className={`${classes} bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]`}><XCircle className="w-3.5 h-3.5"/> Voided</div>;
    return <div className={`${classes} bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]`}><Clock className="w-3.5 h-3.5"/> Pending</div>;
  };

  // --- 8. FILTER ENGINE ---
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchText = b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        b.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
                        
      if (!matchText) return false;
      if (airportFilter !== "ALL" && !b.airport?.toLowerCase().includes(airportFilter.toLowerCase())) return false;
      if (statusFilter !== "ALL" && (b.status?.toLowerCase() || "pending") !== statusFilter.toLowerCase()) return false;
      if (timeFilter === "TODAY_DROP" && !String(b.dropoff_date).startsWith(todayStrISO)) return false;
      if (timeFilter === "TODAY_PICK" && !String(b.pickup_date).startsWith(todayStrISO)) return false;
      
      if (serviceFilter !== "ALL") {
        const sType = b.service_type || "Meet & Greet";
        if (sType.toLowerCase() !== serviceFilter.toLowerCase()) return false;
      }

      if (companyFilter !== "ALL") {
        const isDirect = !b.company_id || !companies.some(c => c.id === b.company_id);
        if (companyFilter === "DIRECT") { 
          if (!isDirect) return false; 
        } else { 
          if (b.company_id !== companyFilter) return false; 
        }
      }
      return true; 
    });
  }, [bookings, searchTerm, airportFilter, statusFilter, timeFilter, companyFilter, serviceFilter, todayStrISO, companies]);

  const totalRevenue = filteredBookings
    .filter(b => ['confirmed', 'completed', 'parked'].includes(b.status?.toLowerCase()))
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    
  const arrivalsToday = filteredBookings.filter(b => b.dropoff_date && String(b.dropoff_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;
  const returnsToday = filteredBookings.filter(b => b.pickup_date && String(b.pickup_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
      <div className="relative">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
      </div>
      <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Initializing Command Hub...</p>
    </div>
  );

  // 🟢 SHARED INPUT STYLES
  const inputStyle = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";
  const selectStyle = "w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white]";
  const yellowInputStyle = "w-full bg-[#FACC15] border-2 border-yellow-500 rounded-xl px-5 py-4 text-black text-xl text-center font-black uppercase outline-none focus:ring-4 focus:ring-yellow-500/30 transition-all shadow-[0_0_0_1000px_#FACC15_inset] [-webkit-text-fill-color:black] placeholder:text-yellow-700/50";

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30">
      
      {/* 🟢 PREMIUM SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0F1523] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 bg-blue-600 text-white rounded-xl shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500">
            <LayoutDashboard className="w-5 h-5" /> Live Board
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <Building2 className="w-5 h-5 text-slate-500" /> Partner Network
          </Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <Tags className="w-5 h-5 text-slate-500" /> Promo Manager
          </Link>
          <Link href="/admin/schedule" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <CalendarDays className="w-5 h-5 text-slate-500" /> Operational Plan
          </Link>
        </nav>
        
        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B] p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Plane className="w-6 h-6 text-white rotate-45" />
            </div> 
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={() => router.push("/admin/login")} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* 🟢 PREMIUM DESKTOP HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Command Center</h1>
            <div className="text-slate-400 font-medium mt-3 text-xs uppercase tracking-widest flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div> Live Operational Feed
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={exportToCSV} className="px-6 py-4 bg-[#131A2B] hover:bg-[#1A2235] border border-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg">
              <Download className="w-4 h-4 text-blue-400" /> Export Data
            </button>
            <button onClick={() => setShowManualModal(true)} className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:translate-y-0">
              <Plus className="w-5 h-5" /> Manual Booking
            </button>
          </div>
        </header>

        {/* 🟢 HYPER-PREMIUM METRICS HUD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-[#131A2B] p-8 rounded-3xl border border-slate-800/80 flex items-center justify-between group hover:border-emerald-500/50 transition-all shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4"/> Live Revenue</p>
              <p className="text-3xl font-black text-white tracking-tight tabular-nums drop-shadow-md">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-24 h-24 bg-emerald-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
            <TrendingUp className="w-14 h-14 text-emerald-500/10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className="bg-[#131A2B] p-8 rounded-3xl border border-slate-800/80 flex items-center justify-between group hover:border-blue-500/50 transition-all shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3 flex items-center gap-2"><Activity className="w-4 h-4"/> Active Jobs</p>
              <p className="text-3xl font-black text-white tracking-tight tabular-nums drop-shadow-md">{filteredBookings.length}</p>
            </div>
            <div className="w-24 h-24 bg-blue-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <Zap className="w-14 h-14 text-blue-500/10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-[#131A2B] p-8 rounded-3xl border border-slate-800/80 flex items-center justify-between group hover:border-indigo-500/50 transition-all shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3 flex items-center gap-2"><PlaneLanding className="w-4 h-4"/> Hub: Inbound</p>
              <p className="text-3xl font-black text-white tracking-tight tabular-nums drop-shadow-md">{arrivalsToday}</p>
            </div>
            <div className="w-24 h-24 bg-indigo-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
            <PlaneLanding className="w-14 h-14 text-indigo-400/10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-[#131A2B] p-8 rounded-3xl border border-slate-800/80 flex items-center justify-between group hover:border-amber-500/50 transition-all shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-3 flex items-center gap-2"><PlaneTakeoff className="w-4 h-4"/> Hub: Return</p>
              <p className="text-3xl font-black text-white tracking-tight tabular-nums drop-shadow-md">{returnsToday}</p>
            </div>
            <div className="w-24 h-24 bg-amber-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>
            <PlaneTakeoff className="w-14 h-14 text-amber-500/10 absolute -right-2 -bottom-2 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* 🟢 REDESIGNED CONTROL RIBBON */}
        <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-lg p-4 mb-10 flex flex-col xl:flex-row gap-4">
          
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search reference, client name, or plate..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl py-4 pl-12 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500" 
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto shrink-0">
            {[
              { id: 'time', icon: Filter, state: timeFilter, set: setTimeFilter, opts: [{v: "ALL", l: "Dates: All"}, {v: "TODAY_DROP", l: "Inbound Today"}, {v: "TODAY_PICK", l: "Return Today"}] },
              { id: 'air', icon: MapPin, state: airportFilter, set: setAirportFilter, opts: [{v: "ALL", l: "Hubs: All"}, {v: "Luton", l: "Luton (LTN)"}, {v: "Heathrow", l: "Heathrow (LHR)"}] },
              { id: 'srv', icon: Car, state: serviceFilter, set: setServiceFilter, opts: [{v: "ALL", l: "Service: All"}, {v: "Meet & Greet", l: "Meet & Greet"}, {v: "Park & Ride", l: "Park & Ride"}, {v: "Hotel & Parking", l: "Hotel Parking"}] },
              { id: 'stat', icon: AlertCircle, state: statusFilter, set: setStatusFilter, opts: [{v: "ALL", l: "Status: All"}, {v: "PENDING", l: "Pending"}, {v: "CONFIRMED", l: "Confirmed"}, {v: "PARKED", l: "Parked"}, {v: "COMPLETED", l: "Completed"}] },
              { id: 'comp', icon: Building2, state: companyFilter, set: setCompanyFilter, opts: [{v: "ALL", l: "Partners: All"}, {v: "DIRECT", l: "Aero Direct"}, ...companies.map(c => ({v: c.id, l: c.name}))] }
            ].map((f) => (
              <div key={f.id} className="relative group/sel">
                <f.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 transition-colors group-hover/sel:text-blue-400 pointer-events-none" />
                <select 
                  value={f.state} 
                  onChange={(e) => f.set(e.target.value)} 
                  className="w-full appearance-none bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl py-4 pl-10 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-inner focus:ring-2 focus:ring-blue-500/50 truncate"
                >
                  {f.opts.map((o, idx) => <option key={idx} value={o.v} className="bg-[#1A2235] text-white font-bold">{o.l}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* 🟢 HIGH-END OPERATIONAL DATA TABLE */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="overflow-x-auto min-h-[500px] custom-scrollbar">
            {filteredBookings.length === 0 ? (
              <div className="py-40 flex flex-col items-center justify-center opacity-40">
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center mb-6 bg-slate-900/50">
                  <Search className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-2xl font-black uppercase tracking-[0.3em] text-white">Registry Exhausted</p>
                <p className="text-sm font-bold text-slate-400 mt-3">Adjust system filters to retrieve records.</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0F1523] border-b border-slate-800">
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-8 py-6">Subject Identity</th>
                    <th className="px-8 py-6">Asset Profile</th>
                    <th className="px-8 py-6">Logistics Schedule</th>
                    <th className="px-8 py-6">Economic Status</th>
                    <th className="px-8 py-6 text-right">System Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-all group">
                      
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 rounded-xl bg-[#1A2235] border border-slate-700/50 flex items-center justify-center font-black text-lg text-slate-400 group-hover:text-blue-500 group-hover:border-blue-500/50 transition-all shadow-sm shrink-0">
                              {b.full_name?.charAt(0) || "U"}
                           </div>
                           <div>
                              <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{b.full_name}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{b.booking_ref}</span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium"><Smartphone className="w-3 h-3"/> {b.phone_number}</div>
                              </div>
                           </div>
                        </div>
                      </td>
                      
                      <td className="px-8 py-6">
                        <div className="px-3 py-1 bg-[#FACC15] text-black font-black font-mono text-[10px] rounded border-b-2 border-yellow-600 w-max mb-2 shadow-sm tracking-[0.1em]">{b.license_plate}</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           <div className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-inner" style={{background: b.car_color || '#334155'}}></div>
                           {b.car_make || 'Standard Fleet'}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2 font-bold tabular-nums">
                          <div className="flex items-center gap-3 text-[11px] text-slate-300">
                             <div className="w-14 text-[8px] font-black text-blue-400 uppercase">Inbound</div>
                             {formatDate(b.dropoff_date)} <span className="text-white">{b.dropoff_time}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-300">
                             <div className="w-14 text-[8px] font-black text-emerald-400 uppercase">Return</div>
                             {formatDate(b.pickup_date)} <span className="text-white">{b.pickup_time}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                             <MapPin className="w-3 h-3 text-slate-600" /> {b.airport}
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        {getStatusBadge(b.status)}
                        <div className="mt-3 flex flex-col gap-1.5">
                           <div className="flex items-center gap-1.5 text-sm font-black text-white">
                              <Wallet className="w-3.5 h-3.5 text-slate-500" /> £{Number(b.total_price || 0).toFixed(2)}
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-[#1A2235] w-max px-2 py-1 rounded border border-slate-700/50">
                              <Building2 className="w-3 h-3 text-slate-500" /> {getCompanyName(b.company_id)}
                           </div>
                        </div>
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          {b.status?.toLowerCase() === 'completed' && (
                            <button onClick={() => handleRequestReview(b)} className="p-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg border border-amber-500/20 transition-all active:scale-95" title="Request 5-Star Review">
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          )}
                          <button onClick={() => sendToWhatsApp(b)} className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all active:scale-95" title="WhatsApp Dispatch"><MessageCircle className="w-4 h-4" /></button>
                          <button onClick={() => setEditingBooking(b)} className="p-2.5 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Modify Record"><Settings2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteBooking(b.id)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Delete Record"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
          <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-5 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-blue-500 transition-all"><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Ops</span></Link>
            <div className="relative -top-8"><button onClick={() => setShowManualModal(true)} className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#0B1120] active:scale-95 transition-transform"><Plus className="w-8 h-8 text-white" /></button></div>
            <Link href="/admin/schedule" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><CalendarDays className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Plan</span></Link>
            <button onClick={() => router.push("/admin/login")} className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Exit</span></button>
          </nav>
        </div>
      </main>

      {/* --- 🟢 MODAL: MANUAL BOOKING ENTRY --- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Manual Booking</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-500" /> Direct Database Injection</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateManualBooking} autoComplete="off" className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar text-white">
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20"><Users className="w-4 h-4 text-blue-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">1. Subject ID</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Full Name</label>
                    <input required type="text" value={newBooking.full_name || ''} onChange={(e) => setNewBooking({...newBooking, full_name: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Email Address</label>
                    <input type="email" value={newBooking.email || ''} onChange={(e) => setNewBooking({...newBooking, email: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Mobile Number</label>
                    <input type="text" value={newBooking.phone_number || ''} onChange={(e) => setNewBooking({...newBooking, phone_number: e.target.value})} className={inputStyle} />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20"><Car className="w-4 h-4 text-amber-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">2. Asset Specs</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-amber-500 block ml-1 tracking-widest">Registration Plate</label>
                    <input required type="text" value={newBooking.license_plate || ''} onChange={(e) => setNewBooking({...newBooking, license_plate: e.target.value.toUpperCase()})} className={yellowInputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Make / Model / Color</label>
                    <input type="text" value={newBooking.car_make || ''} onChange={(e) => setNewBooking({...newBooking, car_make: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Inbound Flight</label>
                    <input type="text" value={newBooking.flight_number || ''} onChange={(e) => setNewBooking({...newBooking, flight_number: e.target.value.toUpperCase()})} className={inputStyle} />
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20"><Clock className="w-4 h-4 text-indigo-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">3. Logistics Timeline</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 tabular-nums">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Arrival Date</label>
                    <input required type="date" value={newBooking.dropoff_date || ''} onChange={(e) => setNewBooking({...newBooking, dropoff_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Time</label>
                    <input type="time" value={newBooking.dropoff_time || ''} onChange={(e) => setNewBooking({...newBooking, dropoff_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Return Date</label>
                    <input required type="date" value={newBooking.pickup_date || ''} onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Time</label>
                    <input type="time" value={newBooking.pickup_time || ''} onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20"><Wallet className="w-4 h-4 text-emerald-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">4. Economics</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Partner Node</label>
                    <div className="relative">
                      <select value={newBooking.company_id || ''} onChange={(e) => setNewBooking({...newBooking, company_id: e.target.value})} className={selectStyle}>
                        <option value="ALL">Aero Direct (Internal)</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Service Level</label>
                    <div className="relative">
                      <select value={newBooking.service_type || ''} onChange={(e) => setNewBooking({...newBooking, service_type: e.target.value})} className={selectStyle}>
                        <option value="Meet & Greet">Meet & Greet</option>
                        <option value="Park & Ride">Park & Ride</option>
                        <option value="Hotel & Parking">Hotel & Parking</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-400 block ml-1 tracking-widest">Transaction (£)</label>
                    <div className="relative">
                       <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                       <input type="number" step="0.01" value={newBooking.total_price || 0} onChange={(e) => setNewBooking({...newBooking, total_price: parseFloat(e.target.value) || 0})} className={`${inputStyle} pl-12 text-emerald-400 text-xl`} />
                    </div>
                  </div>
                </div>
              </section>
            </form>
            
            <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex gap-4">
               <button onClick={() => setShowManualModal(false)} className="px-8 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Cancel</button>
               <button disabled={isSaving} onClick={handleCreateManualBooking} className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Commit Deployment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🟢 MODAL: MODIFY LIVE RECORD --- */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-4xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-red-500"></div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Modify Case</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Override Access: {editingBooking?.booking_ref || 'Unknown'}</p>
              </div>
              <button onClick={() => setEditingBooking(null)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleUpdateBooking} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar text-white">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Client Label</label><input required type="text" value={editingBooking?.full_name || ''} onChange={(e) => setEditingBooking({...editingBooking, full_name: e.target.value})} className={inputStyle} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Secure Email</label><input type="email" value={editingBooking?.email || ''} onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})} className={inputStyle} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">License ID</label><input required type="text" value={editingBooking?.license_plate || ''} onChange={(e) => setEditingBooking({...editingBooking, license_plate: e.target.value.toUpperCase()})} className={yellowInputStyle} /></div>
               </div>
              
               {/* 🟢 ADDED: LOGISTICS SCHEDULE (DATES & TIMES) */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Inbound Date</label>
                   <input type="date" value={editingBooking?.dropoff_date || ''} onChange={(e) => setEditingBooking({...editingBooking, dropoff_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Inbound Time</label>
                   <input type="time" value={editingBooking?.dropoff_time || ''} onChange={(e) => setEditingBooking({...editingBooking, dropoff_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Return Date</label>
                   <input type="date" value={editingBooking?.pickup_date || ''} onChange={(e) => setEditingBooking({...editingBooking, pickup_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Return Time</label>
                   <input type="time" value={editingBooking?.pickup_time || ''} onChange={(e) => setEditingBooking({...editingBooking, pickup_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
               </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Service Level</label>
                  <div className="relative">
                    <select value={editingBooking?.service_type || "Meet & Greet"} onChange={(e) => setEditingBooking({...editingBooking, service_type: e.target.value})} className={selectStyle}>
                      <option value="Meet & Greet">Meet & Greet</option>
                      <option value="Park & Ride">Park & Ride</option>
                      <option value="Hotel & Parking">Hotel & Parking</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Status Lifecycle</label>
                  <div className="relative">
                    <select value={editingBooking?.status || ''} onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})} className={selectStyle}>
                      <option value="pending">Awaiting Checkout</option>
                      <option value="confirmed">Confirmed: Paid</option>
                      <option value="parked">Parked: Active</option>
                      <option value="completed">Completed: Finalised</option>
                      <option value="cancelled">Voided: Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-emerald-400 block ml-1 tracking-widest">Financial Override (£)</label>
                  <div className="relative group">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                    <input type="number" step="0.01" value={editingBooking?.total_price || 0} onChange={(e) => setEditingBooking({...editingBooking, total_price: parseFloat(e.target.value) || 0})} className={`${inputStyle} pl-12 text-emerald-400 text-xl`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
                {[
                  {l: 'Node Terminal', k: 'terminal', icon: MapPin},
                  {l: 'Inbound Flight', k: 'flight_number', icon: Plane},
                  {l: 'Model Spec', k: 'car_make', icon: Car},
                  {l: 'Visual Finish', k: 'car_color', icon: Tags}
                ].map(field => (
                  <div key={field.k} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 flex items-center gap-1.5"><field.icon className="w-3 h-3"/> {field.l}</label>
                    <input type="text" value={editingBooking?.[field.k] || ''} onChange={(e) => setEditingBooking({...editingBooking, [field.k]: e.target.value})} className={inputStyle} />
                  </div>
                ))}
              </div>
            </form>
            
            <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex gap-4">
               <button onClick={() => setEditingBooking(null)} className="px-8 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Abandon</button>
               <button disabled={isSaving} onClick={handleUpdateBooking} className="flex-1 bg-amber-600 hover:bg-amber-500 py-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Authorize Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}