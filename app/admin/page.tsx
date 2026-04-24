"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  PlaneTakeoff,
  Loader2,
  Filter,
  LayoutDashboard,
  CalendarDays,
  PoundSterling,
  Calendar,
  Plus
} from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All");
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
  };

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
    const message = `*NEW JOB: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color || ''} ${booking.car_make}\n📱 Phone: ${booking.phone_number}\n📍 Airport: ${airport}\n🏢 Terminal: ${terminal}\n✈️ Flight: ${booking.flight_number || 'TBC'}\n📅 Drop: ${booking.dropoff_date} at ${booking.dropoff_time || 'TBC'}`;
    
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
      b.airport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.terminal?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "LHR") return matchesSearch && b.airport?.includes("Heathrow");
    if (filter === "LTN") return matchesSearch && b.airport?.includes("Luton");
    if (filter === "Today") return matchesSearch && (b.dropoff_date === todayStr || b.pickup_date === todayStr);
    
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // 6. LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    router.push("/admin/login");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Securing Operations Board...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-400 flex flex-col hidden md:flex sticky top-0 h-screen border-r border-slate-800">
        <div className="p-6 border-b border-white/10 flex items-center gap-2 text-white font-black text-xl uppercase tracking-tighter">
          <PlaneTakeoff className="w-6 h-6 text-blue-500" /> Ops<span className="text-blue-500">Center</span>
        </div>
        
        <nav className="p-4 space-y-2 flex-grow">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-bold transition-colors">
            <LayoutDashboard className="w-5 h-5" /> Live Dispatch
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <Car className="w-5 h-5" /> Companies
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <CalendarDays className="w-5 h-5" /> Schedule
          </a>
        </nav>

        <div className="p-6 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold hover:text-red-400 transition-colors w-full text-left">
            <LogOut className="w-4 h-4" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto h-screen relative">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-slate-950 p-4 rounded-2xl text-white">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">
            <PlaneTakeoff className="w-5 h-5 text-blue-500" /> Ops<span className="text-blue-500">Center</span>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/10 rounded-lg text-slate-300 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* PAGE HEADER */}
        {/* PAGE HEADER - REFIXED ALIGNMENT */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Command Center</h1>
            <p className="text-slate-500 font-bold text-sm mt-1">Manage live bookings and driver dispatch.</p>
          </div>
          
          <div className="flex flex-row items-center gap-4">
            {/* Search Input with forced padding */}
            <div className="relative flex-grow sm:w-80 group">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
              <input 
  type="text" 
  placeholder="Search ref, name, or plate..." 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="w-full !pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
/>
</div>
            
            {/* Manual Add Button matching input height */}
            <button className="whitespace-nowrap px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center gap-2 active:scale-95">
              <Plus className="w-4 h-4" /> Manual Add
            </button>
          </div>
        </header>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gross Revenue</p>
              <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bookings</p>
              <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">{activeCount}</p>
            </div>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[1.25rem] flex items-center justify-center border border-blue-100">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl flex items-center justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px]"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Arriving Today</p>
              <p className="text-3xl md:text-4xl font-black text-white tracking-tighter">{arrivingToday} Vehicles</p>
            </div>
            <div className="relative z-10 w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Car className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Filters */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Filters:</div>
            {['All', 'Today', 'LHR', 'LTN'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto min-h-[400px]">
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Car className="w-10 h-10 mb-4 opacity-50 text-slate-300" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No bookings match criteria</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Customer & Ref</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Vehicle</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Location</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Dates</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* CUSTOMER & REF */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm uppercase">
                            {b.full_name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm">{b.full_name}</div>
                            <div className="font-mono font-bold text-blue-600 text-[10px] tracking-widest uppercase mt-0.5">{b.booking_ref}</div>
                            <div className="flex items-center gap-1.5 mt-1.5 text-slate-500">
                              <Phone className="w-3 h-3" />
                              <span className="text-[10px] font-bold tracking-wider">{b.phone_number || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* VEHICLE */}
                      <td className="px-6 py-5">
                        <div className="inline-block px-3 py-1 bg-[#fde047] text-slate-900 font-black font-mono text-xs rounded border-2 border-yellow-400 uppercase tracking-[0.15em] shadow-inner mb-1.5">
                          {b.license_plate}
                        </div>
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: b.car_color?.toLowerCase() || 'transparent' }}></div>
                          {b.car_color || ""} {b.car_make}
                        </div>
                      </td>

                      {/* LOCATION */}
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {b.airport?.includes("Heathrow") ? "LHR" : "LTN"} <span className="text-slate-300 mx-1">|</span> {b.terminal?.replace("Terminal ", "T")}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                           <Plane className="w-3 h-3 text-slate-400" /> {b.flight_number || "TBC"}
                        </div>
                      </td>

                      {/* DATES */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-[11px] font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-6 text-slate-400 text-[9px] uppercase font-black">In:</span> 
                            {formatDate(b.dropoff_date)} <span className="text-blue-600">{b.dropoff_time || ''}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-6 text-slate-400 text-[9px] uppercase font-black">Out:</span> 
                            {formatDate(b.pickup_date)} <span className="text-emerald-600">{b.pickup_time || ''}</span>
                          </div>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => sendToWhatsApp(b)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 border border-emerald-100 hover:border-emerald-500 group/btn"
                            title="Dispatch to Driver via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">Dispatch</span>
                          </button>
                          
                          <button 
                            onClick={() => deleteBooking(b.id)} 
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
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