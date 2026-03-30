
import { 
  Ticket, 
  Calendar, 
  Loader2, 
  ArrowRight, 
  Printer, 
  User, 
  MapPin, 
  CheckCircle2,
  Car // <--- Add this one!
} from "lucide-react";

export default function ManageBooking() {
  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBooking(null);

    // Search by BOTH reference and full name for security
    const { data, error: dbError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_ref", ref.toUpperCase().trim())
      .ilike("full_name", `%${fullName.trim()}%`) // Case-insensitive name match
      .single();

    if (dbError || !data) {
      setError("Booking not found. Please verify the reference and name.");
    } else {
      setBooking(data);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-6 font-sans">
      <div className="max-w-2xl mx-auto">
        {!booking ? (
          /* SEARCH FORM */
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-200">
              <Ticket className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Manage Trip</h1>
            <p className="text-slate-500 font-bold text-sm mb-10">Enter your booking details to view or print your reservation.</p>

            <form onSubmit={findBooking} className="space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Reference Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. APV-X7B92M" 
                  required
                  className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="As written on your booking" 
                  required
                  className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                   <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 mt-6 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access My Booking <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        ) : (
          /* BOOKING DETAILS CARD (DIGITAL RECEIPT) */
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-500 print:shadow-none print:border-none">
            {/* Header section - hides background on print */}
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-slate-900 print:border-b print:border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:hidden" />
                  <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] print:text-blue-600">Booking Confirmed</p>
                </div>
                <h2 className="text-4xl font-black tracking-tighter">{booking.booking_ref}</h2>
              </div>
              <div className="text-right print:hidden">
                <Ticket className="w-10 h-10 text-slate-700 ml-auto opacity-50" />
              </div>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 italic">
                      <User className="w-3 h-3 text-blue-500" /> Customer
                    </p>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{booking.full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 italic">
                      <Car className="w-3 h-3 text-blue-500" /> Service Type
                    </p>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{booking.service_type}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2 text-center">Total Amount Paid</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tighter text-center italic">£{booking.total_price}.00</p>
                </div>
              </div>

              {/* DATE GRID */}
              <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 bg-white border-r-2 border-slate-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Drop-off
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    {new Date(booking.dropoff_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="p-8 bg-slate-50/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-right">Pick-up</p>
                  <p className="text-lg font-black text-slate-900 text-right">
                    {new Date(booking.pickup_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* FOOTER ACTIONS - HIDDEN ON PRINT */}
              <div className="space-y-4 pt-4 print:hidden">
                <button 
                  onClick={() => window.print()} 
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                  <Printer className="w-4 h-4" /> Print PDF Receipt
                </button>
                
                <button 
                  onClick={() => { setBooking(null); setRef(""); setFullName(""); }} 
                  className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors"
                >
                  Search another booking
                </button>
              </div>

              <div className="hidden print:block pt-10 border-t border-dashed border-slate-200 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Thank you for choosing Airport VIP Parking. Please show this receipt at the terminal.
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}