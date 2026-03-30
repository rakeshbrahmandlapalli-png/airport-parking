"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import { 
  Users, 
  Trash2, 
  LogOut, 
  Phone, 
  Car, 
  Plane, 
  MessageCircle, 
  Search,
  TrendingUp
} from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
    const message = `*NEW JOB: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color} ${booking.car_make}\n📱 Phone: ${booking.phone_number}\n✈️ Flight: ${booking.flight_number}\n📅 Drop: ${booking.dropoff_date}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 4. FILTER LOGIC
  const filteredBookings = bookings.filter(b => 
    b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.car_make?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase">Loading Operations Board...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f8fafc] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">OPERATIONS</h1>
            <p className="text-slate-500 font-bold text-sm">Manage bookings and driver dispatch.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm w-full md:w-64 font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm"
              />
            </div>
            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push("/admin/login"); }} 
              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-2xl transition-colors shadow-sm"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center"><Users className="w-8 h-8" /></div>
            <div>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Total Bookings</p>
              <h3 className="text-3xl font-black text-slate-900">{bookings.length}</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center"><TrendingUp className="w-8 h-8" /></div>
            <div>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Gross Revenue</p>
              <h3 className="text-3xl font-black text-slate-900">£{bookings.reduce((a, b) => a + Number(b.total_price), 0)}</h3>
            </div>
          </div>
        </div>

        {/* OPERATIONS TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">Customer & Ref</th>
                <th className="p-6">Vehicle Details</th>
                <th className="p-6">Flight & Price</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <p className="font-black text-slate-900">{b.full_name}</p>
                    <p className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">{b.booking_ref}</p>
                    <div className="flex items-center gap-2 mt-2 text-slate-400">
                      <Phone className="w-3 h-3" />
                      <span className="text-[11px] font-bold">{b.phone_number || "N/A"}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><Car className="w-4 h-4" /></div>
                      <div>
                        <p className="font-bold text-sm text-slate-700">{b.car_color || "Any"} {b.car_make}</p>
                        {b.additional_notes && (
                          <p className="text-[9px] text-orange-600 font-bold truncate max-w-[150px]">Note: {b.additional_notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Plane className="w-3.5 h-3.5 text-blue-500" />
                      {b.flight_number}
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1">£{b.total_price}</p>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => sendToWhatsApp(b)}
                        className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Send to WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteBooking(b.id)} 
                        className="p-3 bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBookings.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No bookings found</div>
          )}
        </div>
      </div>
    </main>
  );
}