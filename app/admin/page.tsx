import prismadb from "../prismadb";
import { Table, Calendar, User, Phone, Plane, CreditCard } from "lucide-react";

export default async function AdminPage() {
  // Fetch all bookings from the database
  const bookings = await prismadb.booking.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage your active Meet & Greet bookings</p>
          </div>
          <div className="bg-blue-600 px-6 py-3 rounded-2xl text-white font-bold shadow-lg shadow-blue-100">
            Total Bookings: {bookings.length}
          </div>
        </div>

        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-widest font-black">
                <th className="px-8 py-6">Customer</th>
                <th className="px-8 py-6">Vehicle / Flight</th>
                <th className="px-8 py-6">Service</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Total</th>
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
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-600 border border-emerald-200">
                      Paid
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-lg font-black text-slate-900">£{booking.totalPrice.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {bookings.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-bold italic">
              No bookings found yet. Time to market! ✈️
            </div>
          )}
        </div>
      </div>
    </div>
  );
}