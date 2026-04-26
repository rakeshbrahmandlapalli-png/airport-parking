"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, Trash2, LogOut, Phone, Car, Plane, MessageCircle, 
  Search, TrendingUp, MapPin, PlaneTakeoff, Loader2, Filter, 
  LayoutDashboard, CalendarDays, Plus, Building2
} from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL");
  const router = useRouter();

  // 1. AUTH PROTECTION & INITIAL FETCH
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
      } else {
        fetchBookings();
      }
    };
    checkUser();
  }, [router]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setBookings(data);
    setLoading(false);
  }

  // 2. DELETE LOGIC
  const deleteBooking = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the booking.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      setBookings(bookings.filter(b => b.id !== id));
    }
  };

  // 3. WHATSAPP DISPATCH LOGIC
  const sendToWhatsApp = (booking: any) => {
    const airport = booking.airport || "Luton (LTN)";
    const terminal = booking.terminal || "Main Terminal";
    const message = `*NEW JOB: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color || ''} ${booking.car_make} [${booking.license_plate}]\n📱 Phone: ${booking.phone_number}\n📍 Airport: ${airport}\n🏢 Terminal: ${terminal}\n✈️ Flight: ${booking.flight_number || 'TBC'}\n📅 Drop: ${booking.dropoff_date} at ${booking.dropoff_time || 'TBC'}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 4. METRICS CALCULATION
  const totalRevenue = bookings.reduce((a, b) => a + Number(b.total_price || 0), 0);
  const activeCount = bookings.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const arrivingToday = bookings.filter(b => b.dropoff_date === todayStr).length;

  // 5. FILTER LOGIC
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.car_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.airport?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "LHR") return b.airport?.includes("Heathrow") || b.airport?.includes("LHR");
    if (filter === "LTN") return b.airport?.includes("Luton") || b.airport?.includes("LTN");
    if (filter === "TODAY") return b.dropoff_date === todayStr || b.pickup_date === todayStr;
    
    return true; // "ALL"
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // 6. LOGOUT
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
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0B1121] text-slate-400 flex flex-col hidden md:flex sticky top-0 h-screen border-r border-slate-800/50 shadow-2xl z-50">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          <span className="font-black text-xl tracking-tight uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        
        <nav className="px-4 space-y-2 flex-grow mt-4">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl font-bold transition-colors">
            <LayoutDashboard className="w-5 h-5" /> Live Dispatch
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <Building2 className="w-5 h-5" /> Companies
          </Link>
          <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <CalendarDays className="w-5 h-5" /> Schedule
          </Link>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-4 py-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">N</div>
            Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 w-full overflow-y-auto h-screen relative">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">
            <Plane className="w-5 h-5 text-blue-500 rotate-45" /> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Command Center</h1>
            <p className="text-slate-400 font-medium mt-1">Manage live bookings and driver dispatch.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            
           {/* 🟢 PREMIUM GLASSMORPHISM SEARCH BAR */}
            <div className="flex items-center bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl px-5 py-3.5 focus-within:bg-slate-900 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex-grow w-full sm:w-80 group">
              <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search ref, name, or plate..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-medium outline-none placeholder:text-slate-500 text-black focus:ring-0"
              />
            </div>

            <button className="w-full sm:w-auto whitespace-nowrap px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-500">
              <Plus className="w-4 h-4" /> Manual Add
            </button>
          </div>
        </header>

        {/* METRICS ROW (Premium Dark Theme) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {/* Revenue */}
          <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-emerald-900/30 shadow-[0_15px_30px_-5px_rgba(16,185,129,0.05)] flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Gross Revenue</p>
              <p className="text-4xl font-black text-white tracking-tighter">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          
          {/* Bookings */}
          <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-blue-900/30 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.05)] flex items-center justify-between group hover:border-blue-500/50 transition-colors">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Total Bookings</p>
              <p className="text-4xl font-black text-white tracking-tighter">{activeCount}</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Arriving Today */}
          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-8 rounded-[2rem] border border-slate-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex items-center justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1 text-white group hover:border-slate-700 transition-colors">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Arriving Today</p>
              <p className="text-4xl font-black tracking-tighter">{arrivingToday} <span className="text-xl text-slate-400 tracking-tight font-bold">Vehicles</span></p>
            </div>
            <div className="relative z-10 w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform">
              <Car className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col">
          
          {/* Filters */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3 bg-[#0B1121]/50 overflow-x-auto">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            {['ALL', 'TODAY', 'LHR', 'LTN'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${filter === f ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto min-h-[400px]">
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                <Search className="w-12 h-12 mb-4 opacity-20 text-slate-500" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">No active bookings found</p>
                <p className="text-xs font-medium mt-2 opacity-50">Try adjusting your filters or search term.</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0B1121]/80">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Customer & Ref</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Vehicle</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Location</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Dates</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors group">
                      
                      {/* CUSTOMER & REF */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black text-lg uppercase shrink-0 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors border border-slate-700">
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

                      {/* VEHICLE (UK License Plate Style) */}
                      <td className="px-8 py-6">
                        <div className="inline-flex items-center justify-center px-3 py-1.5 bg-[#FACC15] text-slate-900 font-black font-mono text-xs rounded-md border border-yellow-600/50 shadow-sm uppercase tracking-[0.1em] mb-2">
                          {b.license_plate || "TBC"}
                        </div>
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-600 shadow-inner" style={{ backgroundColor: b.car_color?.toLowerCase() || '#cbd5e1' }}></span>
                          {b.car_color || ""} {b.car_make || "Unknown Make"}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="px-8 py-6">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-400">{b.airport?.includes("Heathrow") ? "LHR" : "LTN"}</span> 
                          <span className="text-slate-600 font-normal">|</span> 
                          {b.terminal?.replace("Terminal ", "T") || "Main Terminal"}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                           <Plane className="w-3.5 h-3.5" /> {b.flight_number || "TBC"}
                        </div>
                      </td>

                      {/* DATES */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <span className="w-6 text-slate-500 text-[9px] uppercase font-black tracking-widest">IN:</span> 
                            {formatDate(b.dropoff_date)} <span className="text-blue-400">{b.dropoff_time || '--:--'}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <span className="w-6 text-slate-500 text-[9px] uppercase font-black tracking-widest">OUT:</span> 
                            {formatDate(b.pickup_date)} <span className="text-emerald-400">{b.pickup_time || '--:--'}</span>
                          </div>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => sendToWhatsApp(b)}
                            className="flex items-center gap-1.5 px-4 py-2.5 border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                            title="Dispatch to Driver via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Dispatch
                          </button>
                          
                          <button 
                            onClick={() => deleteBooking(b.id)} 
                            className="p-2.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
}