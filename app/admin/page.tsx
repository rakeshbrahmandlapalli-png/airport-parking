import { PrismaClient } from "@prisma/client";
import { LayoutDashboard, Users, DollarSign, Car } from "lucide-react";

// Pro-Tip: This tells Next.js NOT to freeze this page. 
// It guarantees you always see live, up-to-the-second data!
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export default async function AdminDashboard() {
  // 1. Fetch ALL bookings from your Neon Database
  const bookings = await prisma.booking.findMany({
    orderBy: {
      dropoffDate: "desc", // Puts the newest bookings at the top!
    },
  });

  // 2. Automatically calculate the total money made
  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Sleek Header */}
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        {/* Analytics Cards (The "Boss" Metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            <div className="p-4 bg-green-100 rounded-xl text-green-600">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
            <div className="p-4 bg-blue-100 rounded-xl text-blue-600">
              <Car className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Total Vehicles Parked</p>
              <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
            </div>
          </div>
          
        </div>

        {/* Live Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Recent Reservations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-gray-100 bg-white">
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">License Plate</th>
                  <th className="px-6 py-4 font-semibold">Drop-off Date</th>
                  <th className="px-6 py-4 font-semibold">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2 capitalize">
                      <Users className="w-4 h-4 text-gray-400"/> {booking.customerName}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono uppercase bg-gray-50 rounded m-2 inline-block border border-gray-200">
                      {booking.licensePlate}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{booking.dropoffDate.toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-green-600">${booking.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* If the database is empty, show this: */}
            {bookings.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg mb-2">No bookings yet.</p>
                <p className="text-sm">Time to run some marketing campaigns!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}