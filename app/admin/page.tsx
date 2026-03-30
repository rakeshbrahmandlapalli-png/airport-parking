"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import { Users, TrendingUp, RefreshCw, ShieldCheck, Trash2, LogOut } from "lucide-react";

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (data) setBookings(data);
    setLoading(false);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Confirm delete?")) return;
    await supabase.from("bookings").delete().eq("id", id);
    setBookings(bookings.filter(b => b.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-black text-slate-900">Dashboard</h1>
                <button onClick={async () => { await supabase.auth.signOut(); router.push("/admin/login"); }} className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold uppercase tracking-widest text-xs">Logout</button>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Total Bookings</p>
                    <h3 className="text-4xl font-black text-slate-900 mt-2">{bookings.length}</h3>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Revenue</p>
                    <h3 className="text-4xl font-black text-slate-900 mt-2">£{bookings.reduce((a, b) => a + Number(b.total_price), 0)}</h3>
                </div>
            </div>
            {/* TABLE BELOW */}
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="p-6">Customer</th>
                            <th className="p-6">Reference</th>
                            <th className="p-6">Price</th>
                            <th className="p-6 text-right">Delete</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {bookings.map(b => (
                            <tr key={b.id}>
                                <td className="p-6 font-black text-slate-900">{b.full_name}</td>
                                <td className="p-6 font-bold text-blue-600">{b.booking_ref}</td>
                                <td className="p-6 font-black text-slate-900 font-bold text-lg">£{b.total_price}</td>
                                <td className="p-6 text-right">
                                    <button onClick={() => deleteBooking(b.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
  );
}