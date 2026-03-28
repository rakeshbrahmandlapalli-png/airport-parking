export const dynamic = 'force-dynamic';

import prismadb from "../prismadb";
import { ShieldAlert } from "lucide-react";

export default async function AdminPage() {
  try {
    const bookings = await prismadb.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return (
      <div className="min-h-screen bg-slate-50 p-8 pt-24 text-center">
        <h1 className="text-4xl font-black text-slate-900 uppercase">Dashboard</h1>
        <div className="mt-8 bg-blue-600 inline-block px-6 py-3 rounded-2xl text-white font-bold">
          Total Bookings: {bookings.length}
        </div>
      </div>
    );

  } catch (error: any) {
    // THIS IS THE DEBUGGER
    const envStatus = process.env.DATABASE_URL 
      ? "✅ Vercel CAN see the URL!" 
      : "❌ Vercel CANNOT see the URL (Undefined)";

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-center">
        <div className="bg-black p-10 rounded-3xl shadow-2xl max-w-2xl border border-red-500/30">
          <ShieldAlert size={50} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-red-500 mb-4 uppercase">System Diagnostics</h1>
          
          <div className="bg-slate-800 p-4 rounded-xl text-left mb-4">
            <p className="text-white font-bold mb-1">Environment Variable Check:</p>
            <p className={process.env.DATABASE_URL ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
              {envStatus}
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl text-left">
            <p className="text-white font-bold mb-1">Exact Error Trace:</p>
            <pre className="text-orange-400 font-mono text-xs whitespace-pre-wrap overflow-auto">
              {error.message || "Unknown Error"}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}