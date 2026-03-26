import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-lg border border-gray-100">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-8">
          Your spot is secured. We have saved your reservation in our database. Have a safe flight!
        </p>
        <Link 
          href="/"
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}