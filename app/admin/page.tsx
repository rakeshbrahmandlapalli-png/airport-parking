"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, Trash2, LogOut, Phone, Car, Plane, MessageCircle, 
  Search, TrendingUp, MapPin, Loader2, Filter, 
  LayoutDashboard, CalendarDays, Plus, Building2,
  Edit, X, Save, Clock, CheckCircle2, AlertCircle, PlaneLanding, PlaneTakeoff, XCircle, ChevronDown, Download
} from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL"); 
  const [companyFilter, setCompanyFilter] = useState("ALL"); 
  
  const router = useRouter();

  // Modals
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const defaultNewBooking = {
    full_name: "", email: "", phone_number: "", license_plate: "", 
    car_make: "", car_color: "", flight_number: "", dropoff_date: "", 
    dropoff_time: "", pickup_date: "", pickup_time: "", total_price: 0, 
    status: "confirmed", airport: "Luton (LTN)", terminal: "Main Terminal", 
    company_id: "ALL",
    service_type: "Premium Meet & Greet" // ✅ FIX: matches DB value
  };
  const [newBooking, setNewBooking] = useState<any>(defaultNewBooking);

  // 1. AUTH PROTECTION & INITIAL DATA FETCH
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

    // Real-time listener for new bookings
    const subscription = supabase
      .channel('live-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [router]);

  const fetchDashboardData = async () => {
    const [bookingsRes, companiesRes] = await Promise.all([
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name", { ascending: true })
    ]);
    
    if (bookingsRes.data) setBookings(bookingsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    
    setLoading(false);
  };

  // 2. CRUD OPERATIONS
  const deleteBooking = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the booking.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) setBookings(bookings.filter(b => b.id !== id));
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          full_name: editingBooking.full_name, email: editingBooking.email, phone_number: editingBooking.phone_number,
          license_plate: editingBooking.license_plate, car_make: editingBooking.car_make, car_color: editingBooking.car_color,
          flight_number: editingBooking.flight_number, dropoff_date: editingBooking.dropoff_date, dropoff_time: editingBooking.dropoff_time,
          pickup_date: editingBooking.pickup_date, pickup_time: editingBooking.pickup_time, total_price: editingBooking.total_price,
          status: editingBooking.status, airport: editingBooking.airport, terminal: editingBooking.terminal,
          service_type: editingBooking.service_type // ✅ FIX: include service_type in updates
        })
        .eq('id', editingBooking.id);

      if (error) throw error;
      setEditingBooking(null);
      await fetchDashboardData();
    } catch (error: any) { alert(error.message); } 
    finally { setIsSaving(false); }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const booking_ref = `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const payload = { ...newBooking, booking_ref };
      if (payload.company_id === "ALL") payload.company_id = null; 

      const { error } = await supabase.from('bookings').insert([payload]);
      if (error) throw error;
      
      setShowManualModal(false);
      setNewBooking(defaultNewBooking);
      await fetchDashboardData();
    } catch (error: any) { alert(error.message); } 
    finally { setIsSaving(false); }
  };

  // 3. WHATSAPP DISPATCH
  const sendToWhatsApp = (booking: any) => {
    const airport = booking.airport || "Luton (LTN)";
    const terminal = booking.terminal || "Main Terminal";
    const message = `*JOB: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color || ''} ${booking.car_make} [${booking.license_plate}]\n📱 Phone: ${booking.phone_number}\n📍 Location: ${airport} - ${terminal}\n✈️ Flight: ${booking.flight_number || 'TBC'}\n📅 Drop: ${formatDate(booking.dropoff_date)} at ${booking.dropoff_time || 'TBC'}\n📅 Return: ${formatDate(booking.pickup_date)} at ${booking.pickup_time || 'TBC'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 4. HELPERS
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    if (s === "confirmed") return <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> Confirmed</span>;
    if (s === "parked") return <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Car className="w-3 h-3"/> Parked</span>;
    if (s === "completed") return <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3"/> Completed</span>;
    if (s === "cancelled") return <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><XCircle className="w-3 h-3"/> Cancelled</span>;
    return <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pending</span>;
  };

  const getCompanyName = (id: string) => {
    if (!id) return "Direct Booking";
    const comp = companies.find(c => c.id === id);
    return comp ? comp.name : "Direct Booking";
  };

  // 5. ADVANCED FILTER ENGINE
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.car_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (airportFilter !== "ALL" && !b.airport?.toLowerCase().includes(airportFilter.toLowerCase())) return false;
      
      if (statusFilter !== "ALL") {
        const s = b.status?.toLowerCase() || "pending";
        if (s !== statusFilter.toLowerCase()) return false;
      }

      if (timeFilter === "TODAY_DROP" && !String(b.dropoff_date).startsWith(todayStr)) return false;
      if (timeFilter === "TODAY_PICK" && !String(b.pickup_date).startsWith(todayStr)) return false;

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
  }, [bookings, searchTerm, airportFilter, statusFilter, timeFilter, companyFilter, todayStr, companies]);

  // EXPORT TO CSV
  const exportToCSV = () => {
    let csv = "Booking Ref,Customer Name,Email,Phone,License Plate,Car Make,Color,Airport,Terminal,Flight No,Drop-off Date,Drop-off Time,Pick-up Date,Pick-up Time,Total Paid (£),Status,Service Type,Assigned Partner\n";
    
    filteredBookings.forEach(b => {
      const partner = getCompanyName(b.company_id);
      const row = [
        b.booking_ref, b.full_name, b.email, b.phone_number,
        b.license_plate, b.car_make, b.car_color,
        b.airport, b.terminal, b.flight_number,
        b.dropoff_date, b.dropoff_time, b.pickup_date, b.pickup_time,
        b.total_price, b.status, b.service_type, partner
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
      
      csv += row + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    
    let filenameName = "All_Bookings";
    if (companyFilter === "DIRECT") filenameName = "Direct_Bookings";
    else if (companyFilter !== "ALL") filenameName = getCompanyName(companyFilter).replace(/\s+/g, '_');
    
    a.setAttribute('download', `AeroPark_${filenameName}_Report.csv`);
    a.click();
  };

  // 6. DYNAMIC METRICS
  const dynamicRevenue = filteredBookings.filter(b => b.status !== 'cancelled' && b.status !== 'pending').reduce((a, b) => a + Number(b.total_price || 0), 0);
  const arrivingToday = filteredBookings.filter(b => b.dropoff_date && String(b.dropoff_date).startsWith(todayStr) && b.status !== 'cancelled').length;
  const returningToday = filteredBookings.filter(b => b.pickup_date && String(b.pickup_date).startsWith(todayStr) && b.status !== 'cancelled').length;
  const activeCount = filteredBookings.length;

  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    router.push("/admin/login");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Securing Operations Board...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0B1121] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/50 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          <span className="font-black text-xl tracking-tight uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        <nav className="px-4 space-y-2 flex-grow mt-4">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl font-bold transition-colors"><LayoutDashboard className="w-5 h-5" /> Live Dispatch</Link>
          <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><Building2 className="w-5 h-5" /> Companies</Link>
          <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><CalendarDays className="w-5 h-5" /> Schedule</Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-4 py-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">N</div> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10 custom-scrollbar">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800 mx-2 mt-2">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">
            <Plane className="w-5 h-5 text-blue-500 rotate-45" /> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* HEADER */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 px-2 md:px-0">
          <div><h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Command Center</h1><p className="text-slate-400 font-medium mt-1">Manage live bookings, dispatch, and edits.</p></div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button onClick={exportToCSV} className="w-full sm:w-auto px-6 py-4 bg-[#0f172a] border border-slate-700 hover:border-slate-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm">
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button onClick={() => setShowManualModal(true)} className="w-full sm:w-auto px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Plus className="w-5 h-5" /> Manual Booking
            </button>
          </div>
        </header>

        {/* DYNAMIC METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-2 md:px-0">
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-emerald-900/30 shadow-[0_15px_30px_-5px_rgba(16,185,129,0.05)] flex items-center justify-between group hover:border-emerald-500/50 transition-all">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Filtered Revenue</p><p className="text-3xl font-black text-white tracking-tighter">£{dynamicRevenue.toFixed(2)}</p></div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-blue-900/30 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.05)] flex items-center justify-between group hover:border-blue-500/50 transition-all">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Total Bookings</p><p className="text-3xl font-black text-white tracking-tighter">{activeCount}</p></div>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
          </div>
          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-6 rounded-[2rem] border border-slate-800 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Arriving Today</p><p className="text-3xl font-black text-white tracking-tighter">{arrivingToday}</p></div>
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><PlaneLanding className="w-5 h-5" /></div>
          </div>
          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-6 rounded-[2rem] border border-slate-800 flex items-center justify-between group hover:border-amber-500/50 transition-all">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 mb-1">Returning Today</p><p className="text-3xl font-black text-white tracking-tighter">{returningToday}</p></div>
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><PlaneTakeoff className="w-5 h-5" /></div>
          </div>
        </div>

        {/* ADVANCED FILTER RIBBON */}
        <div className="bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] border border-slate-700/50 shadow-2xl p-3 mb-6 mx-2 md:mx-0 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search ref, name, plate..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full !bg-[#0B1121] border border-slate-800 hover:border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold !text-white outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-600 transition-all shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" 
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto shrink-0">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Dates</option><option value="TODAY_DROP">Drop Today</option><option value="TODAY_PICK">Pick Today</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={airportFilter} onChange={(e) => setAirportFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Airports</option><option value="LTN">Luton Only</option><option value="LHR">Heathrow Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Status</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="PARKED">Parked</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 z-10" />
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-blue-900/50 hover:border-blue-500/50 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-blue-400 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner truncate">
                <option value="ALL">All Partners</option>
                <option value="DIRECT">Direct Bookings</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col mx-2 md:mx-0">
          <div className="overflow-x-auto min-h-[400px]">
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">No bookings match filters</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0B1121] border-b border-slate-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Customer & Ref</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Logistics</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Status & Partner</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors group">
                      
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center font-black text-xl uppercase shrink-0 border border-slate-700 shadow-sm group-hover:border-blue-500/50 group-hover:text-blue-400 transition-colors">
                            {b.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-white leading-none mb-1.5">{b.full_name}</div>
                            <div className="font-black text-blue-400 text-[10px] tracking-widest uppercase mb-1.5">{b.booking_ref}</div>
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px]">
                              <Phone className="w-3 h-3" /> {b.phone_number || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="inline-flex items-center justify-center px-2.5 py-1 bg-[#FACC15] text-slate-900 font-black font-mono text-[10px] rounded border border-yellow-600/50 shadow-sm uppercase tracking-widest mb-2">
                          {b.license_plate || "TBC"}
                        </div>
                        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-600 shadow-inner" style={{ backgroundColor: b.car_color?.toLowerCase() || '#cbd5e1' }}></span>
                          {b.car_make || "Unknown Make"}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
                            <span className="w-6 text-slate-500 text-[9px] uppercase font-black tracking-widest">IN:</span> 
                            {formatDate(b.dropoff_date)} <span className="text-blue-400">{b.dropoff_time || '--:--'}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-2">
                            <span className="w-6 text-slate-500 text-[9px] uppercase font-black tracking-widest">OUT:</span> 
                            {formatDate(b.pickup_date)} <span className="text-emerald-400">{b.pickup_time || '--:--'}</span>
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-1.5">
                            <Plane className="w-3 h-3" /> {b.airport?.includes("Heathrow") ? "LHR" : "LTN"} • {b.flight_number || "TBC"}
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        {getStatusBadge(b.status)}
                        <div className="mt-2 text-[10px] font-black text-white">£{Number(b.total_price || 0).toFixed(2)}</div>
                        <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                          {b.service_type?.replace(/_/g, ' ') || 'N/A'}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                          <Building2 className="w-3 h-3" /> {getCompanyName(b.company_id)}
                        </div>
                      </td>

                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => sendToWhatsApp(b)} className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all border border-emerald-500/30 shadow-sm" title="Dispatch to WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                          <button onClick={() => setEditingBooking(b)} className="p-2.5 bg-slate-800/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 rounded-xl transition-all border border-slate-700 hover:border-blue-500/30 shadow-sm" title="Edit Booking"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => deleteBooking(b.id)} className="p-2.5 bg-slate-800/50 hover:bg-red-600/20 text-slate-500 hover:text-red-400 rounded-xl transition-all border border-slate-700 hover:border-red-500/30 shadow-sm" title="Delete Booking"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/90 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl h-16 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center flex-1 gap-1 text-blue-500"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-black uppercase tracking-widest">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-blue-400 transition-colors"><Building2 className="w-5 h-5" /><span className="text-[8px] font-black uppercase tracking-widest">Ops</span></Link>
          <div className="relative -top-5 px-2"><button onClick={() => setShowManualModal(true)} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-[#0B1121] active:scale-90 transition-transform"><Plus className="w-7 h-7 text-white" /></button></div>
          <Link href="/admin/schedule" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-blue-400 transition-colors"><CalendarDays className="w-5 h-5" /><span className="text-[8px] font-black uppercase tracking-widest">Plan</span></Link>
          <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /><span className="text-[8px] font-black uppercase tracking-widest">Exit</span></button>
        </nav>
      </div>

      {/* EDIT BOOKING MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#0B1121]/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-4xl rounded-[2.5rem] max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col">
            
            <div className="p-8 border-b border-slate-800 flex justify-between items-center shrink-0 bg-[#0f172a] z-10">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Edit Booking</h2>
                <p className="text-[10px] font-black text-blue-400 tracking-widest uppercase mt-1">Ref: {editingBooking.booking_ref}</p>
              </div>
              <button onClick={() => setEditingBooking(null)} className="p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleUpdateBooking} autoComplete="off" className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Full Name</label>
                    <input required type="text" value={editingBooking.full_name || ""} onChange={(e) => setEditingBooking({...editingBooking, full_name: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Email</label>
                    <input type="email" value={editingBooking.email || ""} onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Phone</label>
                    <input type="text" value={editingBooking.phone_number || ""} onChange={(e) => setEditingBooking({...editingBooking, phone_number: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Reg Plate</label>
                    <input required type="text" value={editingBooking.license_plate || ""} onChange={(e) => setEditingBooking({...editingBooking, license_plate: e.target.value.toUpperCase()})} className="w-full !bg-[#FACC15]/10 border border-yellow-500/30 rounded-xl px-5 py-3.5 !text-yellow-400 uppercase tracking-widest font-black outline-none focus:border-yellow-500 shadow-[0_0_0_1000px_rgba(250,204,21,0.1)_inset] [-webkit-text-fill-color:rgb(250,204,21)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Make & Model</label>
                    <input type="text" value={editingBooking.car_make || ""} onChange={(e) => setEditingBooking({...editingBooking, car_make: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Color</label>
                    <input type="text" value={editingBooking.car_color || ""} onChange={(e) => setEditingBooking({...editingBooking, car_color: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Logistics & Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Airport</label>
                    <input type="text" value={editingBooking.airport || ""} onChange={(e) => setEditingBooking({...editingBooking, airport: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Terminal</label>
                    <input type="text" value={editingBooking.terminal || ""} onChange={(e) => setEditingBooking({...editingBooking, terminal: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Flight No.</label>
                    <input type="text" value={editingBooking.flight_number || ""} onChange={(e) => setEditingBooking({...editingBooking, flight_number: e.target.value.toUpperCase()})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 uppercase shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Drop-off Date</label>
                    <input type="date" value={editingBooking.dropoff_date || ""} onChange={(e) => setEditingBooking({...editingBooking, dropoff_date: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Drop-off Time</label>
                    <input type="time" value={editingBooking.dropoff_time || ""} onChange={(e) => setEditingBooking({...editingBooking, dropoff_time: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Pick-up Date</label>
                    <input type="date" value={editingBooking.pickup_date || ""} onChange={(e) => setEditingBooking({...editingBooking, pickup_date: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Pick-up Time</label>
                    <input type="time" value={editingBooking.pickup_time || ""} onChange={(e) => setEditingBooking({...editingBooking, pickup_time: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Status & Billing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Service Type</label>
                    <div className="relative">
                      {/* ✅ FIX: service_type field added to edit modal */}
                      <select value={editingBooking.service_type || "Premium Meet & Greet"} onChange={(e) => setEditingBooking({...editingBooking, service_type: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                        <option value="Premium Meet & Greet">Premium Meet & Greet</option>
                        <option value="Self Park">Self Park</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Current Status</label>
                    <div className="relative">
                      <select value={editingBooking.status || "pending"} onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="parked">Parked / In Facility</option>
                        <option value="completed">Completed / Returned</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Total Paid (£)</label>
                    <input type="number" step="0.01" value={editingBooking.total_price || 0} onChange={(e) => setEditingBooking({...editingBooking, total_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-emerald-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </div>
            </form>

            <div className="bg-[#0f172a] p-6 shrink-0 border-t border-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10">
              <button type="submit" disabled={isSaving} onClick={handleUpdateBooking} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Syncing..." : "Update Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL BOOKING MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0B1121]/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-4xl rounded-[2.5rem] max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col">
            
            <div className="p-8 border-b border-slate-800 flex justify-between items-center shrink-0 bg-[#0f172a] z-10">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Manual Booking</h2>
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Direct System Insertion</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateManualBooking} autoComplete="off" className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Full Name</label>
                    <input required type="text" autoComplete="off" value={newBooking.full_name} onChange={(e) => setNewBooking({...newBooking, full_name: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Email</label>
                    <input type="email" autoComplete="off" value={newBooking.email} onChange={(e) => setNewBooking({...newBooking, email: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Phone</label>
                    <input type="text" autoComplete="off" value={newBooking.phone_number} onChange={(e) => setNewBooking({...newBooking, phone_number: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Reg Plate</label>
                    <input required type="text" autoComplete="off" value={newBooking.license_plate} onChange={(e) => setNewBooking({...newBooking, license_plate: e.target.value.toUpperCase()})} className="w-full !bg-[#FACC15]/10 border border-yellow-500/30 rounded-xl px-5 py-3.5 !text-yellow-400 uppercase tracking-widest font-black outline-none focus:border-yellow-500 shadow-[0_0_0_1000px_rgba(250,204,21,0.1)_inset] [-webkit-text-fill-color:rgb(250,204,21)]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Make & Model</label>
                    <input type="text" autoComplete="off" value={newBooking.car_make} onChange={(e) => setNewBooking({...newBooking, car_make: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Color</label>
                    <input type="text" autoComplete="off" value={newBooking.car_color} onChange={(e) => setNewBooking({...newBooking, car_color: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Logistics & Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Airport</label>
                    <input type="text" autoComplete="off" value={newBooking.airport} onChange={(e) => setNewBooking({...newBooking, airport: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Terminal</label>
                    <input type="text" autoComplete="off" value={newBooking.terminal} onChange={(e) => setNewBooking({...newBooking, terminal: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Flight No.</label>
                    <input type="text" autoComplete="off" value={newBooking.flight_number} onChange={(e) => setNewBooking({...newBooking, flight_number: e.target.value.toUpperCase()})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 uppercase shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Drop-off Date</label>
                    <input required type="date" value={newBooking.dropoff_date} onChange={(e) => setNewBooking({...newBooking, dropoff_date: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Drop-off Time</label>
                    <input type="time" value={newBooking.dropoff_time} onChange={(e) => setNewBooking({...newBooking, dropoff_time: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Pick-up Date</label>
                    <input required type="date" value={newBooking.pickup_date} onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Pick-up Time</label>
                    <input type="time" value={newBooking.pickup_time} onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Admin Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* ✅ FIX: Service Type field added to manual booking modal */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Service Type</label>
                    <div className="relative">
                      <select value={newBooking.service_type} onChange={(e) => setNewBooking({...newBooking, service_type: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                        <option value="Premium Meet & Greet">Premium Meet & Greet</option>
                        <option value="Self Park">Self Park</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Assign to Partner</label>
                    <div className="relative">
                      <select value={newBooking.company_id} onChange={(e) => setNewBooking({...newBooking, company_id: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                        <option value="ALL">Direct Booking (No Partner)</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Status</label>
                    <div className="relative">
                      <select value={newBooking.status} onChange={(e) => setNewBooking({...newBooking, status: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="parked">Parked / In Facility</option>
                        <option value="completed">Completed / Returned</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Total Charged (£)</label>
                    <input type="number" step="0.01" value={newBooking.total_price} onChange={(e) => setNewBooking({...newBooking, total_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-emerald-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                  </div>

                </div>
              </div>

            </form>

            <div className="bg-[#0f172a] p-6 shrink-0 border-t border-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10">
              <button type="submit" disabled={isSaving} onClick={handleCreateManualBooking} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                {isSaving ? "Injecting..." : "Create Manual Booking"}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}