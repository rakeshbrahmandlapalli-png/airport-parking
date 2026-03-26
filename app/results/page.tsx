import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
import Link from "next/link";
export default async function ResultsPage() {
  // 1. Fetch the parking lots from your database
  const lots = await prisma.parkingLot.findMany();

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Available Parking Spots</h1>
      
      <div className="grid gap-6">
        {lots.map((lot) => (
          <div key={lot.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{lot.name}</h2>
              <p className="text-gray-500">Capacity: {lot.capacity} spots available</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">${lot.pricePerDay}</p>
              <p className="text-sm text-gray-400 text-right">per day</p>
              <Link 
  href="/checkout"
  className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition transform hover:scale-105 shadow-md text-center"
>
  Book Now
</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}