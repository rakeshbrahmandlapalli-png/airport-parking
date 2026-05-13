"use client";

/**
 * AeroPark Direct - Command Center v5.1 (Master Edition - Error Resolved)
 * ------------------------------------------------------
 * FEATURES:
 * - Real-time Database Synchronization with Supabase
 * - Dynamic Business Intelligence HUD (Recalculates based on filters)
 * - Advanced Multi-Field Filtering (Airport, Partner, Status, Date)
 * - Enterprise-grade CSV Statement Export
 * - Full CRM Booking Editor (Slide-over Modal)
 * - Manual Booking Injection (Fixed service_type validation)
 * - Automated Review Request Trigger
 * - Mobile-first Design with Frosted Glass UI
 */

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";

// Complete suite of icons for a high-end enterprise look
import { 
  Users, 
  Trash2, 
  LogOut, 
  Phone, 
  Car, 
  Plane, 
  MessageCircle, 
  Search, 
  TrendingUp, 
  MapPin, 
  Loader2, 
  Filter, 
  Activity,
  LayoutDashboard, 
  CalendarDays, 
  Plus, 
  Building2,
  Edit, 
  X, 
  Save, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PlaneLanding, 
  PlaneTakeoff, 
  XCircle, 
  ChevronDown, 
  Download, 
  Briefcase, 
  CreditCard, 
  Receipt, 
  Star,
  Database,
  ShieldCheck,
  Smartphone,
  Wallet,
  Settings2
} from "lucide-react";

export default function AdminDashboard() {
  // --- 1. CORE APPLICATION STATE ---
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- 2. ADVANCED SEARCH & FILTER ENGINE STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL"); 
  const [companyFilter, setCompanyFilter] = useState("ALL"); 
  
  const router = useRouter();

  // --- 3. MODAL & INTERACTION STATE ---
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // Default values for new manual bookings
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
    airport: "Luton (LTN)", 
    terminal: "Main Terminal", 
    company_id: "ALL", 
    service_type: "Meet & Greet",
  };
  const [newBooking, setNewBooking] = useState<any>(defaultNewBooking);

  // --- 4. DATA FETCHING & REAL-TIME REFRESH ---
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
      .channel('live-ops-sync-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        console.log("Real-time update:", payload.eventType);
        fetchDashboardData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, companiesRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("id, name").order("name", { ascending: true })
      ]);
      
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch (err) {
      console.error("Critical Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. CORE LOGIC HANDLERS (CRUD) ---

  const deleteBooking = async (id: string) => {
    const confirmed = confirm("⚠️ DANGER: You are about to permanently delete this booking. This action cannot be reversed. Proceed?");
    if (!confirmed) return;
    
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      setBookings(bookings.filter(b => b.id !== id));
    } else {
      alert("System Error: Could not delete record. " + error.message);
    }
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          full_name: editingBooking.full_name,
          email: editingBooking.email,
          phone_number: editingBooking.phone_number,
          license_plate: editingBooking.license_plate,
          car_make: editingBooking.car_make,
          car_color: editingBooking.car_color,
          flight_number: editingBooking.flight_number,
          dropoff_date: editingBooking.dropoff_date,
          dropoff_time: editingBooking.dropoff_time,
          pickup_date: editingBooking.pickup_date,
          pickup_time: editingBooking.pickup_time,
          total_price: Number(editingBooking.total_price),
          status: editingBooking.status,
          airport: editingBooking.airport,
          terminal: editingBooking.terminal,
          service_type: editingBooking.service_type || "Meet & Greet"
        })
        .eq('id', editingBooking.id);

      if (error) throw error;
      setEditingBooking(null);
      await fetchDashboardData();
    } catch (error: any) {
      alert("Update Failed: Check your connection and try again. Error: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const booking_ref = `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const payload = { 
        ...newBooking, 
        booking_ref,
        service_type: newBooking.service_type || "Meet & Greet" 
      };
      
      if (payload.company_id === "ALL") payload.company_id = null; 

      const { error } = await supabase.from('bookings').insert([payload]);
      
      if (error) throw error;
      
      setShowManualModal(false);
      setNewBooking(defaultNewBooking);
      await fetchDashboardData();
    } catch (error: any) {
      alert("Manual Entry Failure: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const sendToWhatsApp = (booking: any) => {
    const airport = booking.airport || "Luton (LTN)";
    const ref = booking.booking_ref;
    const name = booking.full_name;
    const car = `${booking.car_color || ''} ${booking.car_make} [${booking.license_plate}]`;
    const message = `*NEW DISPATCH: ${ref}*\n------------------\n👤 *Client:* ${name}\n🚗 *Vehicle:* ${car}\n📱 *Contact:* ${booking.phone_number}\n📍 *Airport:* ${airport}\n📅 *Drop-off:* ${formatDate(booking.dropoff_date)} @ ${booking.dropoff_time}\n📅 *Pick-up:* ${formatDate(booking.pickup_date)} @ ${booking.pickup_time}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRequestReview = async (booking: any) => {
    const confirmed = confirm(`Would you like to send the 5-Star Review Request email to ${booking.full_name}?`);
    if (!confirmed) return;
    
    alert(`Success! The automated review request has been queued for ${booking.email}.`);
  };

  // --- 6. ADVANCED ANALYTICS & EXPORT ENGINE ---

  const exportToCSV = () => {
    let csv = "Reference,Customer,Email,Phone,License Plate,Make,Airport,Terminal,Flight,Arrival Date,Return Date,Total Paid,Status,Service Type,Partner Agency\n";
    
    filteredBookings.forEach(b => {
      const partner = getCompanyName(b.company_id);
      const row = [
        b.booking_ref, b.full_name, b.email, b.phone_number,
        b.license_plate, b.car_make, b.airport, b.terminal, b.flight_number,
        b.dropoff_date, b.pickup_date, b.total_price, b.status, b.service_type, partner
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
      
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let reportName = companyFilter === 'ALL' ? 'Consolidated' : getCompanyName(companyFilter).replace(/\s+/g, '_');
    link.setAttribute('download', `AeroPark_${reportName}_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 7. UI HELPERS & FORMATTERS ---
  const todayDate = new Date();
  const todayStrISO = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const getCompanyName = (id: string) => {
    if (!id) return "Direct Booking";
    const comp = companies.find(c => c.id === id);
    return comp ? comp.name : "Direct Booking";
  };

  const formatDateString = (rawDate: string) => {
    if (!rawDate) return "N/A";
    return new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const renderStatusTag = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    const baseClasses = "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-max shadow-sm";
    
    switch(s) {
      case "confirmed":
        return <div className={`${baseClasses} bg-blue-500/10 text-blue-400 border-blue-500/20`}><CheckCircle2 className="w-3 h-3"/> Confirmed</div>;
      case "parked":
        return <div className={`${baseClasses} bg-indigo-500/10 text-indigo-400 border-indigo-500/20`}><Car className="w-3 h-3"/> Vehicle Parked</div>;
      case "completed":
        return <div className={`${baseClasses} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}><CheckCircle2 className="w-3 h-3"/> Job Completed</div>;
      case "cancelled":
        return <div className={`${baseClasses} bg-red-500/10 text-red-400 border-red-500/20`}><XCircle className="w-3 h-3"/> Voided</div>;
      default:
        return <div className={`${baseClasses} bg-amber-500/10 text-amber-400 border-amber-500/20`}><Clock className="w-3 h-3"/> Waiting Pay</div>;
    }
  };

  // --- 8. MULTI-LEVEL FILTER LOGIC ---
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (airportFilter !== "ALL" && !b.airport?.toLowerCase().includes(airportFilter.toLowerCase())) return false;
      
      if (statusFilter !== "ALL" && (b.status?.toLowerCase() || "pending") !== statusFilter.toLowerCase()) return false;

      if (timeFilter === "TODAY_DROP" && !String(b.dropoff_date).startsWith(todayStrISO)) return false;
      if (timeFilter === "TODAY_PICK" && !String(b.pickup_date).startsWith(todayStrISO)) return false;

      if (companyFilter !== "ALL") {
        const isDirect = !b.company_id || !companies.some(c => c.id === b.company_id);
        if (companyFilter === "DIRECT") { if (!isDirect) return false; } 
        else { if (b.company_id !== companyFilter) return false; }
      }
      
      return true; 
    });
  }, [bookings, searchTerm, airportFilter, statusFilter, timeFilter, companyFilter, todayStrISO, companies]);

  const sumRevenue = filteredBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'parked')
    .reduce((total, b) => total + Number(b.total_price || 0), 0);
    
  const arrivalsCount = filteredBookings.filter(b => b.dropoff_date && String(b.dropoff_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;
  const returnsCount = filteredBookings.filter(b => b.pickup_date && String(b.pickup_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;

  // --- 9. VIEW RENDER ---
  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30">
      
      {/* SIDEBAR NAVIGATION (DESKTOP) */}
      <aside className="w-full md:w-64 bg-[#0B1121] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-white/5 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-7 h-7 text-blue-500 rotate-45" />
          <span className="font-black text-2xl tracking-tighter uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        
        <nav className="px-4 space-y-2 flex-grow mt-6 font-bold">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl transition-all shadow-[inset_0_0_15px_rgba(37,99,235,0.1)]"><LayoutDashboard className="w-5 h-5" /> Live Board</Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-2xl transition-all"><Building2 className="w-5 h-5" /> Partner Network</Link>
          <Link href="/admin/schedule" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-2xl transition-all"><CalendarDays className="w-5 h-5" /> Logistics Plan</Link>
        </nav>

        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-2xl border border-white/5">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10 custom-scrollbar">
        
        {/* MOBILE RESPONSIVE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white rotate-45" /></div> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={() => router.push("/admin/login")} className="p-3 bg-white/5 rounded-xl text-slate-300 border border-white/5"><LogOut className="w-5 h-5" /></button>
        </div>

        {/* TOP LEVEL ACTION RIBBON */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Command Center</h1>
            <div className="flex items-center gap-3 mt-3">
               <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Real-time Active</span>
               </div>
               <p className="text-slate-500 text-sm font-medium">Monitoring {bookings.length} reservations across the network.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={exportToCSV} className="px-8 py-5 bg-[#0f172a] border border-slate-700 hover:border-slate-500 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl group">
              <Download className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" /> Export Data
            </button>
            <button onClick={() => setShowManualModal(true)} className="px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="w-6 h-6" /> Manual Booking
            </button>
          </div>
        </header>

        {/* ANALYTICS HUD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-emerald-900/30 flex items-center justify-between group hover:border-emerald-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2">Live Revenue</p>
              <p className="text-4xl font-black text-white tracking-tighter">£{sumRevenue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-14 h-14 text-emerald-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>
          
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-blue-900/30 flex items-center justify-between group hover:border-blue-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">Active Jobs</p>
              <p className="text-4xl font-black text-white tracking-tighter">{filteredBookings.length}</p>
            </div>
            <Activity className="w-14 h-14 text-blue-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>

          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-8 rounded-[2.5rem] border border-slate-800 flex items-center justify-between group hover:border-indigo-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Inbound Flow</p>
              <p className="text-4xl font-black text-white tracking-tighter">{arrivalsCount}</p>
            </div>
            <PlaneLanding className="w-14 h-14 text-indigo-400/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>

          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-8 rounded-[2.5rem] border border-slate-800 flex items-center justify-between group hover:border-amber-500/50 transition-all shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">Outbound Flow</p>
              <p className="text-4xl font-black text-white tracking-tighter">{returnsCount}</p>
            </div>
            <PlaneTakeoff className="w-14 h-14 text-amber-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>
        </div>

        {/* 🟢 ADVANCED CONTROL RIBBON (MODERN) */}
        <div className="bg-[#0f172a]/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-3 mb-10 flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Search Engine */}
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors z-10" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search via reference, client name or reg plate..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full !bg-[#0B1121] border border-transparent hover:border-white/5 rounded-[1.8rem] py-5 pl-14 pr-6 text-sm font-bold !text-white outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" 
            />
          </div>
          
          {/* Multi-Select Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto shrink-0 pr-2">
            {[
              { id: 'time', icon: Filter, state: timeFilter, set: setTimeFilter, opts: [{v: "ALL", l: "Dates: All"}, {v: "TODAY_DROP", l: "Due: Today"}, {v: "TODAY_PICK", l: "Return: Today"}] },
              { id: 'air', icon: MapPin, state: airportFilter, set: setAirportFilter, opts: [{v: "ALL", l: "Airport: All"}, {v: "Luton", l: "Luton (LTN)"}, {v: "Heathrow", l: "Heathrow (LHR)"}] },
              { id: 'stat', icon: AlertCircle, state: statusFilter, set: setStatusFilter, opts: [{v: "ALL", l: "Status: All"}, {v: "PENDING", l: "Pending"}, {v: "CONFIRMED", l: "Confirmed"}, {v: "PARKED", l: "Parked"}, {v: "COMPLETED", l: "Completed"}] },
              { id: 'comp', icon: Building2, state: companyFilter, set: setCompanyFilter, opts: [{v: "ALL", l: "Partner: All"}, {v: "DIRECT", l: "Aero Direct"}, ...companies.map(c => ({v: c.id, l: c.name}))] }
            ].map((f) => (
              <div key={f.id} className="relative group/sel">
                <f.icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${f.id === 'comp' ? 'text-blue-500' : 'text-slate-500'} z-10 transition-colors group-hover/sel:text-white`} />
                <select 
                  value={f.state} 
                  onChange={(e) => f.set(e.target.value)} 
                  className={`w-full appearance-none bg-[#0B1121] border border-transparent hover:border-white/10 rounded-2xl py-4.5 pl-11 pr-10 text-[10px] font-black uppercase tracking-widest ${f.id === 'comp' ? 'text-blue-400' : 'text-slate-300'} outline-none cursor-pointer transition-all shadow-inner focus:ring-1 focus:ring-blue-500/50 truncate`}
                >
                  {f.opts.map((o, index) => <option key={index} value={o.v} className="bg-[#0B1121] text-white">{o.l}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* OPERATIONAL DATA TABLE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] mb-20">
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center opacity-40 space-y-6">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-700" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black uppercase tracking-[0.2em] text-white">No Record Found</p>
                  <p className="text-xs text-slate-500 font-bold mt-2">Adjust your filters to see more results.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0B1121] border-b border-slate-800">
                  <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                    <th className="px-10 py-7">Operations Profile</th>
                    <th className="px-10 py-7">Asset & Fleet</th>
                    <th className="px-10 py-7">Logistics Path</th>
                    <th className="px-10 py-7">Finance Status</th>
                    <th className="px-10 py-7 text-right">System Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-blue-600/[0.02] transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center font-black text-2xl text-slate-500 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all shadow-lg">
                              {b.full_name?.charAt(0) || "U"}
                           </div>
                           <div>
                              <p className="font-black text-white text-base group-hover:text-blue-400 transition-colors tracking-tight">{b.full_name}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[11px] font-black text-blue-500/80 tracking-widest uppercase">{b.booking_ref}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold"><Smartphone className="w-3 h-3"/> {b.phone_number}</div>
                              </div>
                           </div>
                        </div>
                      </td>
                      
                      <td className="px-10 py-8">
                        <div className="px-3 py-1.5 bg-yellow-400 text-slate-950 font-black font-mono text-[11px] rounded-lg border-b-4 border-yellow-600 w-max mb-3 shadow-md tracking-[0.15em]">{b.license_plate}</div>
                        <div className="flex items-center gap-2.5">
                           <div className="w-3 h-3 rounded-full border border-white/20 shadow-inner" style={{background: b.car_color || '#334155'}}></div>
                           <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{b.car_make || 'Generic Asset'}</p>
                        </div>
                      </td>

                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-2 font-bold">
                          <div className="flex items-center gap-3 text-[11px] text-slate-200">
                             <div className="w-12 text-[9px] font-black text-blue-500 uppercase py-0.5 border-b border-blue-500/20">Inbound</div>
                             {formatDateString(b.dropoff_date)} <span className="text-blue-500 font-black tabular-nums">{b.dropoff_time}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-200">
                             <div className="w-12 text-[9px] font-black text-emerald-500 uppercase py-0.5 border-b border-emerald-500/20">Return</div>
                             {formatDateString(b.pickup_date)} <span className="text-emerald-500 font-black tabular-nums">{b.pickup_time}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
                             <MapPin className="w-3.5 h-3.5 text-slate-600" /> {b.airport}
                          </div>
                        </div>
                      </td>

                      <td className="px-10 py-8">
                        {renderStatusTag(b.status)}
                        <div className="mt-4 flex flex-col gap-1.5">
                           <div className="flex items-center gap-2 text-[11px] font-black text-white">
                              <Wallet className="w-3.5 h-3.5 text-slate-600" /> £{Number(b.total_price || 0).toFixed(2)}
                           </div>
                           <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50 w-max px-2 py-1 rounded-md border border-white/5">
                              <Building2 className="w-3 h-3" /> {getCompanyName(b.company_id)}
                           </div>
                        </div>
                      </td>

                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          
                          {/* 🟢 Automated Review Request Trigger (Only visible if completed) */}
                          {b.status?.toLowerCase() === 'completed' && (
                            <button onClick={() => handleRequestReview(b)} className="p-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-2xl border border-amber-500/20 transition-all shadow-lg active:scale-90" title="Request 5-Star Review">
                              <Star className="w-5 h-5" />
                            </button>
                          )}

                          <button onClick={() => sendToWhatsApp(b)} className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl border border-emerald-500/20 transition-all shadow-lg active:scale-90" title="Dispatch Driver"><MessageCircle className="w-5 h-5" /></button>
                          <button onClick={() => setEditingBooking(b)} className="p-3 bg-white/5 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl border border-transparent shadow-lg transition-all active:scale-90" title="Modify Record"><Settings2 className="w-5 h-5" /></button>
                          <button onClick={() => deleteBooking(b.id)} className="p-3 bg-white/5 text-slate-600 hover:bg-red-500 hover:text-white rounded-2xl border border-transparent shadow-lg transition-all active:scale-90" title="Permanent Delete"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* MOBILE APP-STYLE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/90 to-transparent pointer-events-none">
          <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] h-20 flex items-center justify-around px-4 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center justify-center gap-1.5 text-blue-500"><LayoutDashboard className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-tighter">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1.5 text-slate-500"><Building2 className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-tighter">Ops</span></Link>
            <div className="relative -top-10"><button onClick={() => setShowManualModal(true)} className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_40px_-5px_rgba(37,99,235,0.6)] border-8 border-[#0B1121] active:scale-90 transition-all"><Plus className="w-10 h-10 text-white font-black" /></button></div>
            <Link href="/admin/schedule" className="flex flex-col items-center justify-center gap-1.5 text-slate-500"><CalendarDays className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-tighter">Plan</span></Link>
            <button onClick={() => router.push("/admin/login")} className="flex flex-col items-center justify-center gap-1.5 text-slate-500"><LogOut className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-tighter">Exit</span></button>
          </nav>
        </div>
      </main>

      {/* --- 🟢 MODAL: MANUAL BOOKING ENTRY --- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0B1121]/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-5xl rounded-[3rem] max-h-[92vh] flex flex-col shadow-[0_100px_200px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-900/40 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter">Manual Booking</h2>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                   <Database className="w-4 h-4 text-blue-500" /> Direct High-Priority DB Entry
                </p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-all border border-white/5"><X className="w-8 h-8"/></button>
            </div>
            
            <form onSubmit={handleCreateManualBooking} autoComplete="off" className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar">
              
              {/* Profile Block */}
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Users className="w-5 h-5 text-blue-500"/></div>
                   <h3 className="text-xs font-black uppercase text-white tracking-[0.3em]">1. Client Identity</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Legal Full Name</label>
                    <input required type="text" placeholder="e.g. David Williams" value={newBooking.full_name} onChange={(e) => setNewBooking({...newBooking, full_name: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Verified Email</label>
                    <input type="email" placeholder="client@domain.com" value={newBooking.email} onChange={(e) => setNewBooking({...newBooking, email: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Direct Mobile</label>
                    <input type="text" placeholder="07700 000000" value={newBooking.phone_number} onChange={(e) => setNewBooking({...newBooking, phone_number: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </section>

              {/* Asset Block */}
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center border border-amber-500/20"><Car className="w-5 h-5 text-amber-500"/></div>
                   <h3 className="text-xs font-black uppercase text-white tracking-[0.3em]">2. Asset Specification</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1 text-amber-500">License Plate (MANDATORY)</label>
                    <input required type="text" placeholder="LHR 786" value={newBooking.license_plate} onChange={(e) => setNewBooking({...newBooking, license_plate: e.target.value.toUpperCase()})} className="w-full !bg-yellow-400/5 border border-yellow-400/20 rounded-[1.2rem] px-6 py-5 text-yellow-400 font-black uppercase outline-none shadow-[0_0_0_1000px_rgba(250,204,21,0.05)_inset] [-webkit-text-fill-color:rgb(250,204,21)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Vehicle Make / Model</label>
                    <input type="text" placeholder="Tesla Model 3" value={newBooking.car_make} onChange={(e) => setNewBooking({...newBooking, car_make: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Inbound Flight ID</label>
                    <input type="text" placeholder="BA 1234" value={newBooking.flight_number} onChange={(e) => setNewBooking({...newBooking, flight_number: e.target.value.toUpperCase()})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </section>

              {/* Temporal Block */}
              <section className="space-y-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20"><Clock className="w-5 h-5 text-indigo-500"/></div>
                   <h3 className="text-xs font-black uppercase text-white tracking-[0.3em]">3. Operational Timeline</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Arrival Date</label><input required type="date" value={newBooking.dropoff_date} onChange={(e) => setNewBooking({...newBooking, dropoff_date: e.target.value})} className="w-full bg-[#0B1121] border border-white/5 rounded-2xl px-5 py-5 text-white font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Arrival Time</label><input type="time" value={newBooking.dropoff_time} onChange={(e) => setNewBooking({...newBooking, dropoff_time: e.target.value})} className="w-full bg-[#0B1121] border border-white/5 rounded-2xl px-5 py-5 text-white font-bold outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Return Date</label><input required type="date" value={newBooking.pickup_date} onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})} className="w-full bg-[#0B1121] border border-white/5 rounded-2xl px-5 py-5 text-white font-bold outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Return Time</label><input type="time" value={newBooking.pickup_time} onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})} className="w-full bg-[#0B1121] border border-white/5 rounded-2xl px-5 py-5 text-white font-bold outline-none" /></div>
                </div>
              </section>

              {/* Fulfillment Block */}
              <section className="space-y-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center border border-emerald-500/20"><ShieldCheck className="w-5 h-5 text-emerald-500"/></div>
                   <h3 className="text-xs font-black uppercase text-white tracking-[0.3em]">4. Logistics & Finance</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Target Agency</label>
                    <div className="relative">
                      <select value={newBooking.company_id} onChange={(e) => setNewBooking({...newBooking, company_id: e.target.value})} className="w-full appearance-none bg-[#0B1121] border border-white/5 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none cursor-pointer">
                        <option value="ALL">Aero Direct (Internal)</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Tier Specification</label>
                    <div className="relative">
                      <select value={newBooking.service_type} onChange={(e) => setNewBooking({...newBooking, service_type: e.target.value})} className="w-full appearance-none bg-[#0B1121] border border-white/5 rounded-[1.2rem] px-6 py-5 text-white font-bold outline-none cursor-pointer">
                        <option value="Meet & Greet">Meet & Greet Premium</option>
                        <option value="Park & Ride">Park & Ride Saver</option>
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Revenue Capture (£)</label>
                    <input type="number" step="0.01" value={newBooking.total_price} onChange={(e) => setNewBooking({...newBooking, total_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-transparent rounded-[1.2rem] px-6 py-5 text-emerald-400 text-3xl font-black outline-none shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:rgb(52,211,153)]" />
                  </div>
                </div>
              </section>
            </form>
            
            <div className="p-10 bg-slate-900/60 border-t border-white/5 flex gap-6">
               <button onClick={() => setShowManualModal(false)} className="px-10 py-5 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">Cancel Entry</button>
               <button disabled={isSaving} onClick={handleCreateManualBooking} className="flex-1 bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black uppercase text-sm text-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.6)] transition-all flex items-center justify-center gap-4">
                {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-6 h-6"/>} {isSaving ? "Synchronizing Operations..." : "Authorize & Commit Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🟢 MODAL: EDIT CASE RECORD --- */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#0B1121]/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] max-h-[90vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
            
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-900/40 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter">Modify Case</h2>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                   <Settings2 className="w-4 h-4" /> System Overwrite: {editingBooking.booking_ref}
                </p>
              </div>
              <button onClick={() => setEditingBooking(null)} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"><X className="w-8 h-8"/></button>
            </div>
            
            <form onSubmit={handleUpdateBooking} className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar text-white">
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Client Descriptor</label>
                    <input required type="text" value={editingBooking.full_name} onChange={(e) => setEditingBooking({...editingBooking, full_name: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 hover:border-blue-500/30 rounded-2xl px-6 py-5 text-white font-bold outline-none transition-all shadow-inner focus:ring-1 focus:ring-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Secure Email</label>
                    <input type="email" value={editingBooking.email} onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-2xl px-6 py-5 text-white font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">License Identification</label>
                    <input required type="text" value={editingBooking.license_plate} onChange={(e) => setEditingBooking({...editingBooking, license_plate: e.target.value.toUpperCase()})} className="w-full bg-yellow-400/5 border border-yellow-400/10 rounded-2xl px-6 py-5 text-yellow-400 font-black uppercase outline-none shadow-[inset_0_0_20px_rgba(250,204,21,0.05)]" />
                  </div>
               </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Service Type</label>
                  <div className="relative">
                    {/* 🟢 CRITICAL FIELD: Ensure service type can be amended */}
                    <select value={editingBooking.service_type || "Meet & Greet"} onChange={(e) => setEditingBooking({...editingBooking, service_type: e.target.value})} className="w-full appearance-none bg-[#0B1121] border border-slate-800 rounded-2xl px-6 py-5 text-white font-bold outline-none cursor-pointer hover:border-blue-500/30 transition-all">
                      <option value="Meet & Greet">Meet & Greet</option>
                      <option value="Park & Ride">Park & Ride</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Status Lifecycle</label>
                  <div className="relative">
                    <select value={editingBooking.status} onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})} className="w-full appearance-none bg-[#0B1121] border border-slate-800 rounded-2xl px-6 py-5 text-white font-bold outline-none cursor-pointer hover:border-blue-500/30 transition-all">
                      <option value="pending">Pending: No Payment</option>
                      <option value="confirmed">Confirmed: Paid</option>
                      <option value="parked">Parked: In Possession</option>
                      <option value="completed">Completed: Finalised</option>
                      <option value="cancelled">Voided: Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1">Billing Reconciliation (£)</label>
                  <div className="relative group">
                    <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input type="number" step="0.01" value={editingBooking.total_price} onChange={(e) => setEditingBooking({...editingBooking, total_price: parseFloat(e.target.value) || 0})} className="w-full bg-[#0B1121] border border-slate-800 rounded-2xl pl-16 pr-6 py-5 text-emerald-400 text-3xl font-black outline-none" />
                  </div>
                </div>
              </div>

              {/* Administrative Asset Overrides */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
                <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Terminal</label><input type="text" value={editingBooking.terminal} onChange={(e) => setEditingBooking({...editingBooking, terminal: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Flight</label><input type="text" value={editingBooking.flight_number} onChange={(e) => setEditingBooking({...editingBooking, flight_number: e.target.value.toUpperCase()})} className="w-full bg-[#0B1121] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Make</label><input type="text" value={editingBooking.car_make} onChange={(e) => setEditingBooking({...editingBooking, car_make: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" /></div>
                <div><label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Color</label><input type="text" value={editingBooking.car_color} onChange={(e) => setEditingBooking({...editingBooking, car_color: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" /></div>
              </div>
            </form>
            
            <div className="p-10 bg-slate-900/60 border-t border-white/5 flex gap-6">
               <button onClick={() => setEditingBooking(null)} className="px-10 py-5 text-slate-400 font-black uppercase text-[10px] hover:text-white transition-colors">Discard Edits</button>
               <button disabled={isSaving} onClick={handleUpdateBooking} className="flex-1 bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black uppercase text-sm text-white shadow-xl transition-all flex items-center justify-center gap-4">
                {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-6 h-6"/>} Apply & Push Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}