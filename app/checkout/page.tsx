import { Car, User, CalendarCheck } from "lucide-react";
import { createBooking } from "../actions"; // This is the magic link to your backend!

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-900 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="w-6 h-6" />
            Complete Your Booking
          </h1>
          <p className="text-blue-200 text-sm mt-1">Economy North Lot • $15.50/day</p>
        </div>

        {/* BIG CHANGE HERE: We use action={createBooking} to talk to the database */}
        <form action={createBooking} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Full Name
            </label>
            <input 
              type="text" 
              name="name" // The backend needs this name to read what you type
              required
              placeholder="John Doe"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-600" /> License Plate
            </label>
            <input 
              type="text" 
              name="plate" // The backend needs this name to read what you type
              required
              placeholder="ABC-1234"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none uppercase"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition duration-300 transform hover:shadow-lg hover:-translate-y-0.5"
          >
            Confirm Reservation
          </button>
        </form>
      </div>
    </main>
  );
}