"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // 🔥 This is the correct bridge!
import { 
  Users, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  ShieldCheck
} from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const totalRevenue = bookings.reduce((acc, curr) => acc + Number(curr.total_price), 0);
  const filteredBookings = bookings.filter(b => 
    b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.booking_ref && b.booking_ref.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest mb-2">
              <ShieldCheck className="w-4 h-4" /> Secure Admin Panel
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Booking Overview</h1>
          </div>
          <button onClick={fetchBookings} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <Users className="w-6 h-6 text-blue-600 mb-4" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Total Bookings</p>
            <h3 className="text-4xl font-black text-slate-900">{bookings.length}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <TrendingUp className="w-6 h-6 text-emerald-600 mb-4" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Gross Revenue</p>
            <h3 className="text-4xl font-black text-slate-900">£{totalRevenue}</h3>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900">Recent Bookings</h2>
            <input 
              type="text" 
              placeholder="Search names..." 
              className="pl-6 pr-6 py-3 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Service</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td className="p-6 font-black text-slate-900">{b.full_name}</td>
                  <td className="p-6 font-bold text-blue-600">{b.booking_ref}</td>
                  <td className="p-6 text-sm font-bold text-slate-500">{b.service_type}</td>
                  <td className="p-6 font-black text-slate-900">£{b.total_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}