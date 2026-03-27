export const dynamic = 'force-dynamic';

import prismadb from "../prismadb";
import { User, Phone, Plane, ShieldAlert, RefreshCw } from "lucide-react";

export default async function AdminPage() {
  try {
    // 1. Fetch bookings from the database
    const bookings = await prismadb.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return (
      <div className="min-h-screen bg-slate-50 p-8 pt-24">
        <div className="max-w-7xl mx-auto text-left">
          <div className="flex justify-between items-end mb-12 text-left">
            <div className="text-left">
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Dashboard</h1>
              <p className="text-slate-500 font-medium">Manage your active Meet & Greet bookings</p>
            </div>
            <div className="bg-blue-600 px-6 py-3 rounded-2xl text-white font-bold shadow-lg shadow-blue-100">
              Total: {bookings.length}
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-widest font-black">
                  <th className="px-8 py-6">Customer Details</th>
                  <th className="px-8 py-6">Vehicle / Flight</th>
                  <th className="px-8 py-6">Service Type</th>
                  <th className="px-8 py-6">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 flex items-center gap-2">
                          <User size={14} className="text-blue-600" /> {booking.customerName}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{booking.customerEmail}</span>
                        <span className="text-xs text-blue-600 font-bold mt-1 flex items-center gap-1">
                          <Phone size={12} /> {booking.customerPhone}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="bg-slate-100 text-slate-900 px-3 py-1 rounded-lg text-xs font-black inline-block uppercase tracking-tighter border border-slate-200">
                          {booking.licensePlate}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Plane size={12} className="text-blue-400" /> {booking.flightNumber}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-700">{booking.parkingType}</span>
                      <div className="mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">
                          Confirmed
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xl font-black text-slate-900">£{booking.totalPrice.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {bookings.length === 0 && (
              <div className="p-24 text-center">
                <p className="text-slate-400 font-bold italic mb-2 text-lg">No bookings found yet.</p>
                <p className="text-slate-300 text-sm italic">Waiting for your first customer! ✈️</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );

  } catch (error) {
    // 2. ERROR STATE - This shows if the database connection fails
    console.error("ADMIN_DASHBOARD_ERROR:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md border border-red-50">
          <div className="bg-red-100 w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto text-red-600">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Database Disconnected</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            The dashboard couldn't reach your database. This usually means the <code className="bg-slate-100 px-1 font-bold">DATABASE_URL</code> is missing or incorrect in Vercel.
          </p>
          <a 
            href="/admin" 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <RefreshCw size={18} /> Try Refreshing
          </a>
        </div>
      </div>
    );
  }
}