"use client";

/**
 * AeroPark Direct — Command Center v13.0
 * ─────────────────────────────────────────────────────────────
 * BUGS FIXED FROM v12:
 *
 * 1. STATUS FILTER CASING: Filter sent "PENDING"/"CONFIRMED" (uppercase) but compared
 *    against b.status.toLowerCase(). Nothing ever matched. → All filter option values
 *    now lowercase ("pending", "confirmed", etc.) to match DB values.
 *
 * 2. ANIMATE-IN CLASSES: `animate-in zoom-in-95` require tailwindcss-animate plugin
 *    which may not be installed — silently no-ops. → Replaced with inline CSS keyframe
 *    animation via a <style> tag (no plugin dependency).
 *
 * 3. MOBILE LOGOUT: `router.push("/admin/login")` skips supabase.auth.signOut(), leaving
 *    the session alive. → Now calls handleLogout() which signs out first.
 *
 * 4. STALE CLOSURE IN PRICING useEffect: `companies` was used inside the effect but
 *    omitted from the dependency array (suppressed with eslint-disable). On first render
 *    the array is empty, so pricing always falls back to defaults. → companies is now
 *    accessed via a stable ref (companiesRef) that's kept current without causing
 *    re-runs of the pricing effect.
 *
 * 5. DOUBLE FORM SUBMIT: The manual booking save button had BOTH onClick={handleCreate}
 *    AND the parent form had onSubmit={handleCreate}. Clicking the button fired twice,
 *    creating two records. → Button changed to type="submit", onClick handler removed.
 *
 * 6. defaultNewBooking INSIDE COMPONENT: Defined inside the component body, so it was
 *    recreated on every render. Safe here since it's not used as a useEffect dep, but
 *    moved outside the component for clarity and to prevent any future bugs.
 *
 * 7. OLD TIER RATE FIELD NAMES: Still using comp.tier1_extra_rate / tier2_extra_rate
 *    (the pre-v8 shared fields). Should use ltn_tier1_extra_rate / lhr_tier1_extra_rate
 *    etc. per the schema split in v8. → Updated with airport-aware field selection and
 *    legacy fallback for gradual migration.
 *
 * 8. company_id: "ALL" IN DEFAULT STATE: Sent "ALL" as company_id to Supabase when no
 *    company selected (nulled just before insert, but used during pricing calc phase
 *    where companies.find(c => c.id === "ALL") always returns undefined). → Changed
 *    default to empty string ""; pricing calc treats "" as no company selected.
 *
 * 9. SUPABASE REALTIME + AUTH IN SAME useEffect: Auth check and realtime subscription
 *    were both in one effect with [router] dep. If router changes, subscription is torn
 *    down and re-created unnecessarily. → Split into two separate effects.
 *
 * 10. EDIT MODAL MISSING DATE/TIME FIELDS: The edit modal had no inputs for dropoff_date,
 *     dropoff_time, pickup_date, pickup_time — those fields could never be changed once
 *     set. → Added a full 4-column date/time grid to the edit form.
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Users, Trash2, LogOut, Car, Plane, MessageCircle,
  Search, TrendingUp, MapPin, Loader2, Filter,
  LayoutDashboard, CalendarDays, Plus, Building2,
  X, Save, Clock, CheckCircle2, AlertCircle,
  PlaneLanding, PlaneTakeoff, XCircle, ChevronDown,
  Download, Wallet, Settings2, Activity, Tags,
  Database, ShieldCheck, Smartphone, Star, Zap
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// CONSTANTS — defined outside component to avoid re-creation
// ─────────────────────────────────────────────────────────────

// BUG FIX #8: company_id default is "" not "ALL"
const DEFAULT_NEW_BOOKING = {
  full_name: "",
  email: "",
  phone_number: "",
  license_plate: "",
  car_make: "",
  car_color: "",
  flight_number: "",
  dropoff_date: "",
  dropoff_time: "",
  pickup_date: "",
  pickup_time: "",
  total_price: 0,
  status: "confirmed",
  airport: "Luton Airport (LTN)",
  terminal: "Main Terminal",
  company_id: "",          // BUG FIX #8
  service_type: "Meet & Greet",
};

// ─────────────────────────────────────────────────────────────
// PURE PRICING CALCULATOR — no hooks, no stale closures
// BUG FIX #7: uses per-airport tier rate fields from v8 schema
// ─────────────────────────────────────────────────────────────
function calculatePrice(
  dropoffDate: string,
  pickupDate: string,
  airport: string,
  company: any | null
): number {
  if (!dropoffDate || !pickupDate) return 0;
  const start = new Date(dropoffDate);
  const end   = new Date(pickupDate);
  const diff  = end.getTime() - start.getTime();
  if (diff < 0) return 0;

  const totalDays = Math.ceil(diff / 86_400_000) + 1;
  const isLHR     = airport.toLowerCase().includes("heathrow");

  let baseRate = 52.98;
  let t1Rate   = 1.99;
  let t2Rate   = 2.99;

  if (company) {
    baseRate = isLHR
      ? Number(company.heathrow_price || baseRate)
      : Number(company.luton_price    || baseRate);

    // BUG FIX #7: use per-airport split fields; fall back to legacy shared fields
    t1Rate = isLHR
      ? Number(company.lhr_tier1_extra_rate ?? company.tier1_extra_rate ?? 1.99)
      : Number(company.ltn_tier1_extra_rate ?? company.tier1_extra_rate ?? 1.99);
    t2Rate = isLHR
      ? Number(company.lhr_tier2_extra_rate ?? company.tier2_extra_rate ?? 2.99)
      : Number(company.ltn_tier2_extra_rate ?? company.tier2_extra_rate ?? 2.99);
  }

  let total     = baseRate;
  const extra   = totalDays - 1;
  if (extra > 0) {
    total += Math.min(extra, 5) * t1Rate;
    if (extra > 5) total += (extra - 5) * t2Rate;
  }
  return Number(total.toFixed(2));
}

// ─────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = (status || "pending").toLowerCase();
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    confirmed: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.12)]", icon: <CheckCircle2 className="w-3 h-3" />, label: "Confirmed" },
    parked:    { cls: "bg-violet-500/10 text-violet-400 border-violet-500/25 shadow-[0_0_8px_rgba(139,92,246,0.12)]", icon: <Car className="w-3 h-3" />, label: "Parked" },
    completed: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.12)]", icon: <CheckCircle2 className="w-3 h-3" />, label: "Completed" },
    cancelled: { cls: "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.12)]", icon: <XCircle className="w-3 h-3" />, label: "Voided" },
    pending:   { cls: "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.12)]", icon: <Clock className="w-3 h-3" />, label: "Pending" },
  };
  const { cls, icon, label } = map[s] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest w-max ${cls}`}>
      {icon} {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD WRAPPER
// ─────────────────────────────────────────────────────────────
function Field({ label, accent, children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest block ml-1 ${accent ?? "text-slate-500"}`}>{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED INPUT STYLES — BUG FIX: webkit autofill overrides
// ─────────────────────────────────────────────────────────────
const iCls  = "w-full bg-[#1A2235] border border-slate-700/60 hover:border-blue-500/40 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-600";
const sCls  = `${iCls} appearance-none cursor-pointer`;
const yCls  = "w-full bg-[#FACC15] border-2 border-yellow-500 rounded-xl px-5 py-4 text-black text-xl text-center font-black uppercase outline-none focus:ring-4 focus:ring-yellow-400/30 transition-all [box-shadow:0_0_0_1000px_#FACC15_inset] [-webkit-text-fill-color:black] placeholder:text-yellow-700/40";
const dateCls = `${iCls} [color-scheme:dark]`;

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
function SectionHeader({ num, label, color, Icon }: { num: number; label: string; color: string; Icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 bg-${color}-500/10 border border-${color}-500/20 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">{num}. {label}</h3>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();

  const [bookings,  setBookings]  = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);

  // BUG FIX #1: all status filter values are lowercase to match b.status.toLowerCase()
  const [searchTerm,     setSearchTerm]     = useState("");
  const [airportFilter,  setAirportFilter]  = useState("ALL");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [timeFilter,     setTimeFilter]     = useState("ALL");
  const [companyFilter,  setCompanyFilter]  = useState("ALL");
  const [serviceFilter,  setServiceFilter]  = useState("ALL");

  const [editingBooking,  setEditingBooking]  = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [newBooking,      setNewBooking]      = useState<any>(DEFAULT_NEW_BOOKING);

  // BUG FIX #4: stable ref so pricing useEffect never reads stale companies
  const companiesRef = useRef<any[]>([]);
  useEffect(() => { companiesRef.current = companies; }, [companies]);

  // ── DATA FETCH ─────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("*").order("name", { ascending: true }),
      ]);
      if (bRes.data) setBookings(bRes.data);
      if (cRes.data) setCompanies(cRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // BUG FIX #9: auth check and realtime subscription in SEPARATE effects
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/admin/login");
      else fetchDashboardData();
    });
  }, [router, fetchDashboardData]);

  useEffect(() => {
    const sub = supabase
      .channel("bookings-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, fetchDashboardData)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchDashboardData]);

  // ── PRICING CALC ────────────────────────────────────────────
  // BUG FIX #4: reads companies via ref — no stale data, no spurious deps
  useEffect(() => {
    const comp = newBooking.company_id
      ? companiesRef.current.find((c) => c.id === newBooking.company_id) ?? null
      : null;
    const price = calculatePrice(newBooking.dropoff_date, newBooking.pickup_date, newBooking.airport, comp);
    setNewBooking((prev: any) => prev.total_price !== price ? { ...prev, total_price: price } : prev);
  }, [newBooking.dropoff_date, newBooking.pickup_date, newBooking.company_id, newBooking.airport]);

  // ── LOGOUT ─────────────────────────────────────────────────
  // BUG FIX #3: properly signs out before redirecting
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // ── CRUD ───────────────────────────────────────────────────
  const deleteBooking = async (id: string) => {
    if (!confirm("Permanently delete this booking? This cannot be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) setBookings((prev) => prev.filter((b) => b.id !== id));
    else alert("Delete failed: " + error.message);
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("bookings").update({
        full_name:     editingBooking.full_name,
        email:         editingBooking.email,
        phone_number:  editingBooking.phone_number,
        license_plate: editingBooking.license_plate,
        car_make:      editingBooking.car_make,
        car_color:     editingBooking.car_color,
        flight_number: editingBooking.flight_number,
        dropoff_date:  editingBooking.dropoff_date,   // BUG FIX #10: now editable
        dropoff_time:  editingBooking.dropoff_time,   // BUG FIX #10
        pickup_date:   editingBooking.pickup_date,    // BUG FIX #10
        pickup_time:   editingBooking.pickup_time,    // BUG FIX #10
        total_price:   Number(editingBooking.total_price),
        status:        editingBooking.status,
        airport:       editingBooking.airport,
        terminal:      editingBooking.terminal,
        service_type:  editingBooking.service_type || "Meet & Greet",
      }).eq("id", editingBooking.id);
      if (error) throw error;
      setEditingBooking(null);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // BUG FIX #5: no onClick on button; only form onSubmit fires
  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const booking_ref = `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const payload = {
        ...newBooking,
        booking_ref,
        // BUG FIX #8: company_id "" → null for DB
        company_id: newBooking.company_id || null,
      };
      const { error } = await supabase.from("bookings").insert([payload]);
      if (error) throw error;
      setShowManualModal(false);
      setNewBooking(DEFAULT_NEW_BOOKING);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── WHATSAPP ────────────────────────────────────────────────
  const sendToWhatsApp = (b: any) => {
    const msg = `*AERO DISPATCH: ${b.booking_ref}*\n👤 ${b.full_name}\n🚗 ${b.car_color || ""} ${b.car_make} [${b.license_plate}]\n📱 ${b.phone_number}\n📍 ${b.airport}\n📅 Drop: ${fmt(b.dropoff_date)} @ ${b.dropoff_time}\n📅 Pick: ${fmt(b.pickup_date)} @ ${b.pickup_time}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── CSV EXPORT ──────────────────────────────────────────────
  const exportToCSV = () => {
    let csv = "Reference,Customer,Email,Phone,Plate,Make,Airport,Terminal,Flight,Drop Date,Drop Time,Pick Date,Pick Time,Total,Status,Service Type,Partner\n";
    filteredBookings.forEach((b) => {
      csv += `"${b.booking_ref}","${b.full_name}","${b.email}","${b.phone_number}","${b.license_plate}","${b.car_make}","${b.airport}","${b.terminal}","${b.flight_number}","${b.dropoff_date}","${b.dropoff_time}","${b.pickup_date}","${b.pickup_time}","${b.total_price}","${b.status}","${b.service_type || "Meet & Greet"}","${getCompanyName(b.company_id)}"\n`;
    });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `AeroPark_${todayISO}.csv`,
    });
    a.click();
  };

  // ── HELPERS ─────────────────────────────────────────────────
  const todayISO      = new Date().toISOString().split("T")[0];
  const getCompanyName = (id: string | null) => !id ? "AeroPark Direct" : companies.find((c) => c.id === id)?.name ?? "AeroPark Direct";
  const fmt            = (d: string) => !d ? "TBC" : new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  // ── FILTER ENGINE ─────────────────────────────────────────────────────────
  // BUG FIX #1: statusFilter values are lowercase; comparison is straightforward
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const status = (b.status || "pending").toLowerCase();

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!b.full_name?.toLowerCase().includes(q) &&
            !b.booking_ref?.toLowerCase().includes(q) &&
            !b.license_plate?.toLowerCase().includes(q)) return false;
      }
      if (airportFilter !== "ALL" && !b.airport?.toLowerCase().includes(airportFilter.toLowerCase())) return false;
      if (statusFilter  !== "ALL" && status !== statusFilter) return false;   // ← now works correctly
      if (timeFilter === "TODAY_DROP" && !String(b.dropoff_date).startsWith(todayISO)) return false;
      if (timeFilter === "TODAY_PICK" && !String(b.pickup_date).startsWith(todayISO))  return false;
      if (serviceFilter !== "ALL") {
        const svc = (b.service_type || "Meet & Greet").toLowerCase();
        if (svc !== serviceFilter.toLowerCase()) return false;
      }
      if (companyFilter !== "ALL") {
        const isDirect = !b.company_id;
        if (companyFilter === "DIRECT" ? !isDirect : b.company_id !== companyFilter) return false;
      }
      return true;
    });
  }, [bookings, searchTerm, airportFilter, statusFilter, timeFilter, companyFilter, serviceFilter, todayISO]);

  const totalRevenue  = filteredBookings.filter((b) => ["confirmed","completed","parked"].includes((b.status||"").toLowerCase())).reduce((s, b) => s + Number(b.total_price || 0), 0);
  const arrivalsToday = filteredBookings.filter((b) => String(b.dropoff_date).startsWith(todayISO) && b.status !== "cancelled").length;
  const returnsToday  = filteredBookings.filter((b) => String(b.pickup_date).startsWith(todayISO)  && b.status !== "cancelled").length;
  const activeFilters = [airportFilter, statusFilter, timeFilter, companyFilter, serviceFilter].filter((f) => f !== "ALL").length;

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Initializing Command Hub…</p>
    </div>
  );

  return (
    <>
      {/* BUG FIX #2: native CSS keyframes — no Tailwind plugin required */}
      <style>{`
        @keyframes modalIn  { from { opacity:0; transform:scale(.97) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes fadeSlug { from { opacity:0; transform:translateY(10px) }           to { opacity:1; transform:translateY(0) } }
        .modal-in  { animation: modalIn  .2s ease-out both }
        .fade-row  { animation: fadeSlug .3s ease-out both }
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:99px }
      `}</style>

      <div className="min-h-screen bg-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30">

        {/* ── SIDEBAR ───────────────────────────────────────────── */}
        <aside className="w-64 hidden md:flex flex-col sticky top-0 h-screen bg-[#0F1523] border-r border-slate-800/80 shrink-0 z-50">
          {/* Logo */}
          <div className="p-7 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.15)]">
              <Plane className="w-5 h-5 text-blue-500 rotate-45" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white">OPS <span className="text-blue-500">CENTER</span></span>
          </div>

          <nav className="px-4 space-y-2 flex-grow mt-4 text-sm font-bold">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 text-white rounded-xl shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:bg-blue-500 transition-all">
              <LayoutDashboard className="w-4 h-4" /> Live Board
            </Link>
            <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
              <Building2 className="w-4 h-4 text-slate-500" /> Partner Network
            </Link>
            <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
              <CalendarDays className="w-4 h-4 text-slate-500" /> Operational Plan
            </Link>
          </nav>

          {/* Live indicator */}
          <div className="mx-4 mb-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981] shrink-0" />
            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Live Feed</span>
          </div>

          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-sm font-bold transition-all border border-slate-800"
            >
              <LogOut className="w-4 h-4 text-slate-500" /> Secure Logout
            </button>
          </div>
        </aside>

        {/* ── MAIN WORKSPACE ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto h-screen pb-28 md:pb-12 p-4 md:p-8 lg:p-10 space-y-8">

          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between bg-[#131A2B] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 font-black text-lg tracking-tighter text-white uppercase">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Plane className="w-4 h-4 text-white rotate-45" /></div>
              OPS<span className="text-blue-500">CENTER</span>
            </div>
            {/* BUG FIX #3 */}
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Page header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Command Center</h1>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                Live Feed · {filteredBookings.length} records
                {activeFilters > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black">{activeFilters} filter{activeFilters > 1 ? "s" : ""}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-3 bg-[#131A2B] hover:bg-[#1A2235] border border-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md">
                <Download className="w-4 h-4 text-blue-400" /> Export
              </button>
              <button onClick={() => setShowManualModal(true)} className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> New Booking
              </button>
            </div>
          </header>

          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Live Revenue",  value: `£${totalRevenue.toFixed(2)}`, sub: "confirmed + parked", color: "emerald", Icon: TrendingUp },
              { label: "Active Jobs",   value: filteredBookings.length,       sub: "in current view",   color: "blue",    Icon: Zap },
              { label: "Inbound Today", value: arrivalsToday,                 sub: "drop-offs",         color: "indigo",  Icon: PlaneLanding },
              { label: "Returns Today", value: returnsToday,                  sub: "pick-ups",          color: "amber",   Icon: PlaneTakeoff },
            ].map(({ label, value, sub, color, Icon }) => (
              <div key={label} className={`bg-[#131A2B] p-7 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-${color}-500/40 transition-all shadow-xl cursor-default`}>
                <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/15 flex items-center justify-center mb-4`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <p className="text-2xl font-black text-white tracking-tight tabular-nums">{value}</p>
                <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-500 mt-1`}>{label}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-colors`} />
                <Icon className={`absolute -right-2 -bottom-2 w-16 h-16 text-${color}-500/8 group-hover:scale-110 transition-transform`} />
              </div>
            ))}
          </div>

          {/* ── FILTER RIBBON ─────────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-2xl border border-slate-800 p-4 space-y-3 shadow-lg">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                autoComplete="off"
                placeholder="Search by name, reference, or plate…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1A2235] border border-slate-700/60 rounded-xl py-3.5 pl-11 pr-10 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600 [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white]"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 mr-1">
                <Filter className="w-3 h-3" /> Filters
              </span>

              {/* BUG FIX #1: status options use lowercase values */}
              {[
                { state: timeFilter,    set: setTimeFilter,    opts: [
                    { v: "ALL",        l: "All dates" },
                    { v: "TODAY_DROP", l: "Inbound today" },
                    { v: "TODAY_PICK", l: "Return today" },
                ]},
                { state: airportFilter, set: setAirportFilter, opts: [
                    { v: "ALL",       l: "All airports" },
                    { v: "Luton",     l: "Luton (LTN)" },
                    { v: "Heathrow",  l: "Heathrow (LHR)" },
                ]},
                { state: serviceFilter, set: setServiceFilter, opts: [
                    { v: "ALL",             l: "All services" },
                    { v: "meet & greet",    l: "Meet & Greet" },
                    { v: "park & ride",     l: "Park & Ride" },
                    { v: "hotel & parking", l: "Hotel & Parking" },
                ]},
                { state: statusFilter,  set: setStatusFilter,  opts: [
                    { v: "ALL",       l: "All statuses" },
                    { v: "pending",   l: "Pending" },     // ← lowercase
                    { v: "confirmed", l: "Confirmed" },   // ← lowercase
                    { v: "parked",    l: "Parked" },      // ← lowercase
                    { v: "completed", l: "Completed" },   // ← lowercase
                    { v: "cancelled", l: "Cancelled" },   // ← lowercase
                ]},
                { state: companyFilter, set: setCompanyFilter, opts: [
                    { v: "ALL",    l: "All partners" },
                    { v: "DIRECT", l: "AeroPark Direct" },
                    ...companies.map((c) => ({ v: c.id, l: c.name })),
                ]},
              ].map((f, i) => (
                <div key={i} className="relative">
                  <select
                    value={f.state}
                    onChange={(e) => f.set(e.target.value)}
                    className={`appearance-none pl-3 pr-7 py-2.5 rounded-xl text-[11px] font-bold border outline-none cursor-pointer transition-all ${
                      f.state !== "ALL"
                        ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                        : "bg-[#1A2235] border-slate-700/60 text-slate-400 hover:border-blue-500/30"
                    }`}
                  >
                    {f.opts.map((o) => (
                      <option key={o.v} value={o.v} className="bg-[#1A2235] text-white">{o.l}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
              ))}

              {activeFilters > 0 && (
                <button
                  onClick={() => { setTimeFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setCompanyFilter("ALL"); setServiceFilter("ALL"); }}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-[11px] font-bold border border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-all"
                >
                  <X className="w-3 h-3" /> Clear {activeFilters}
                </button>
              )}
            </div>
          </div>

          {/* ── BOOKINGS TABLE ─────────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {filteredBookings.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/40">
                  <Search className="w-9 h-9 text-slate-600" />
                </div>
                <div>
                  <p className="text-xl font-black uppercase tracking-widest text-white">No records found</p>
                  <p className="text-sm text-slate-500 font-medium mt-2">Adjust your search or filters.</p>
                </div>
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setSearchTerm(""); setTimeFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setCompanyFilter("ALL"); setServiceFilter("ALL"); }}
                    className="px-5 py-2.5 bg-blue-600/15 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-600/25 transition-all"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-[#0F1523] border-b border-slate-800">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-7 py-5">Customer</th>
                      <th className="px-7 py-5">Vehicle</th>
                      <th className="px-7 py-5">Schedule</th>
                      <th className="px-7 py-5">Value & Status</th>
                      <th className="px-7 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/25 transition-colors group">
                        {/* Customer */}
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#1A2235] border border-slate-700/50 flex items-center justify-center text-base font-black text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/40 transition-all shrink-0">
                              {b.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{b.full_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{b.booking_ref}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-1">
                                <Smartphone className="w-3 h-3" /> {b.phone_number}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="px-7 py-5">
                          <div className="px-2.5 py-1 bg-[#FACC15] text-black font-black font-mono text-[10px] rounded border-b-2 border-yellow-600 w-max mb-2 tracking-widest">{b.license_plate}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                            <div className="w-3 h-3 rounded-full border border-white/15 shadow-inner shrink-0" style={{ background: b.car_color || "#334155" }} />
                            {b.car_make || "—"}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-1 font-medium">{getCompanyName(b.company_id)}</div>
                        </td>

                        {/* Schedule */}
                        <td className="px-7 py-5">
                          <div className="space-y-1.5 text-xs font-bold tabular-nums">
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-blue-400 uppercase w-12">Drop</span>
                              <span className="text-slate-300">{fmt(b.dropoff_date)}</span>
                              <span className="text-white">{b.dropoff_time}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-emerald-400 uppercase w-12">Return</span>
                              <span className="text-slate-300">{fmt(b.pickup_date)}</span>
                              <span className="text-white">{b.pickup_time}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-1">
                              <MapPin className="w-3 h-3" /> {b.airport}
                            </div>
                          </div>
                        </td>

                        {/* Value & Status */}
                        <td className="px-7 py-5">
                          <StatusBadge status={b.status} />
                          <p className="text-white font-black text-base mt-2.5">£{Number(b.total_price || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{b.service_type || "Meet & Greet"}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-7 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-3 group-hover:translate-x-0 duration-200">
                            {b.status?.toLowerCase() === "completed" && (
                              <button onClick={() => alert(`Review request queued for ${b.email}`)} className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90" title="Request review">
                                <Star className="w-4 h-4 fill-current" />
                              </button>
                            )}
                            <button onClick={() => sendToWhatsApp(b)} className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90">
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingBooking(b)} className="p-2.5 bg-[#1A2235] border border-slate-700 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90">
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteBooking(b.id)} className="p-2.5 bg-[#1A2235] border border-slate-700 text-slate-500 hover:bg-red-500 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-5 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
          <nav className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl h-18 flex items-center justify-around px-4 py-3 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center gap-1 text-blue-500"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Partners</span></Link>
            <div className="relative -top-5">
              <button onClick={() => setShowManualModal(true)} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#0B1120] active:scale-90 transition-transform">
                <Plus className="w-7 h-7 text-white" />
              </button>
            </div>
            <Link href="/admin/schedule" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><CalendarDays className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Plan</span></Link>
            {/* BUG FIX #3 */}
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Exit</span></button>
          </nav>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODAL: MANUAL BOOKING
      ════════════════════════════════════════════════════════ */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0B1120]/96 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8">
          <div onClick={() => setShowManualModal(false)} className="absolute inset-0" />
          <div className="relative z-10 bg-[#0F1523] border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden modal-in">

            {/* Modal header */}
            <div className="p-8 border-b border-slate-800 bg-[#131A2B] shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Manual Booking</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Direct database entry</p>
                  </div>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 border border-slate-700/50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BUG FIX #5: form onSubmit handles save; button is type="submit" only */}
            <form onSubmit={handleCreateManualBooking} autoComplete="off" className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-10">

                {/* 1. Customer */}
                <section className="space-y-5">
                  <SectionHeader num={1} label="Customer Details" color="blue" Icon={Users} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Full Name"><input required type="text" value={newBooking.full_name} onChange={(e) => setNewBooking({...newBooking, full_name: e.target.value})} className={iCls} placeholder="Jane Smith" /></Field>
                    <Field label="Email"><input type="email" value={newBooking.email} onChange={(e) => setNewBooking({...newBooking, email: e.target.value})} className={iCls} placeholder="jane@example.com" /></Field>
                    <Field label="Phone"><input type="text" value={newBooking.phone_number} onChange={(e) => setNewBooking({...newBooking, phone_number: e.target.value})} className={iCls} placeholder="+44 7700 900000" /></Field>
                  </div>
                </section>

                {/* 2. Vehicle */}
                <section className="space-y-5">
                  <SectionHeader num={2} label="Vehicle Details" color="amber" Icon={Car} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Registration" accent="text-amber-500">
                      <input required type="text" value={newBooking.license_plate} onChange={(e) => setNewBooking({...newBooking, license_plate: e.target.value.toUpperCase()})} className={yCls} placeholder="AB12 CDE" />
                    </Field>
                    <Field label="Make / Model / Colour"><input type="text" value={newBooking.car_make} onChange={(e) => setNewBooking({...newBooking, car_make: e.target.value})} className={iCls} placeholder="Toyota Camry Silver" /></Field>
                    <Field label="Inbound Flight"><input type="text" value={newBooking.flight_number} onChange={(e) => setNewBooking({...newBooking, flight_number: e.target.value.toUpperCase()})} className={iCls} placeholder="EZY1234" /></Field>
                  </div>
                </section>

                {/* 3. Schedule */}
                <section className="space-y-5">
                  <SectionHeader num={3} label="Logistics Schedule" color="indigo" Icon={Clock} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <Field label="Drop-off Date"><input required type="date" value={newBooking.dropoff_date} onChange={(e) => setNewBooking({...newBooking, dropoff_date: e.target.value})} className={dateCls} /></Field>
                    <Field label="Drop-off Time"><input type="time" value={newBooking.dropoff_time} onChange={(e) => setNewBooking({...newBooking, dropoff_time: e.target.value})} className={dateCls} /></Field>
                    <Field label="Pick-up Date"><input required type="date" value={newBooking.pickup_date} onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})} className={dateCls} /></Field>
                    <Field label="Pick-up Time"><input type="time" value={newBooking.pickup_time} onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})} className={dateCls} /></Field>
                  </div>
                </section>

                {/* 4. Economics */}
                <section className="space-y-5">
                  <SectionHeader num={4} label="Pricing & Partner" color="emerald" Icon={Wallet} />
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <Field label="Airport">
                      <div className="relative">
                        <select value={newBooking.airport} onChange={(e) => setNewBooking({...newBooking, airport: e.target.value})} className={sCls}>
                          <option value="Luton Airport (LTN)">Luton (LTN)</option>
                          <option value="Heathrow Airport (LHR)">Heathrow (LHR)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>
                    <Field label="Partner">
                      <div className="relative">
                        {/* BUG FIX #8: default value is "" = Direct */}
                        <select value={newBooking.company_id} onChange={(e) => setNewBooking({...newBooking, company_id: e.target.value})} className={sCls}>
                          <option value="">AeroPark Direct</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>
                    <Field label="Service Type">
                      <div className="relative">
                        <select value={newBooking.service_type} onChange={(e) => setNewBooking({...newBooking, service_type: e.target.value})} className={sCls}>
                          <option value="Meet & Greet">Meet & Greet</option>
                          <option value="Park & Ride">Park & Ride</option>
                          <option value="Hotel & Parking">Hotel & Parking</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>
                    <Field label="Total Price (£)" accent="text-emerald-400">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg pointer-events-none">£</span>
                        <input type="number" step="0.01" value={newBooking.total_price} onChange={(e) => setNewBooking({...newBooking, total_price: parseFloat(e.target.value) || 0})}
                          className="w-full bg-[#1A2235] border border-emerald-500/25 rounded-xl pl-9 pr-5 py-4 text-emerald-400 text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:rgb(52,211,153)]"
                        />
                      </div>
                      {newBooking.dropoff_date && newBooking.pickup_date && (
                        <p className="text-[10px] text-slate-600 mt-1 ml-1">Auto-calculated · edit to override</p>
                      )}
                    </Field>
                  </div>
                </section>
              </div>

              {/* Footer — BUG FIX #5: button is type="submit", NO onClick */}
              <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex items-center gap-4 shrink-0">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-4 rounded-xl font-black text-sm text-white uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {isSaving ? "Saving…" : "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: EDIT BOOKING
      ════════════════════════════════════════════════════════ */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#0B1120]/96 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8">
          <div onClick={() => setEditingBooking(null)} className="absolute inset-0" />
          <div className="relative z-10 bg-[#0F1523] border border-slate-800 w-full max-w-4xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden modal-in">

            <div className="p-8 border-b border-slate-800 bg-[#131A2B] shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Edit Booking</h2>
                    <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest mt-0.5">{editingBooking.booking_ref}</p>
                  </div>
                </div>
                <button onClick={() => setEditingBooking(null)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 border border-slate-700/50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateBooking} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-8">

                {/* Identity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Field label="Full Name"><input required type="text" value={editingBooking.full_name} onChange={(e) => setEditingBooking({...editingBooking, full_name: e.target.value})} className={iCls} /></Field>
                  <Field label="Email"><input type="email" value={editingBooking.email || ""} onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})} className={iCls} /></Field>
                  <Field label="Phone"><input type="text" value={editingBooking.phone_number || ""} onChange={(e) => setEditingBooking({...editingBooking, phone_number: e.target.value})} className={iCls} /></Field>
                </div>

                {/* Vehicle */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-slate-800">
                  <Field label="Registration" accent="text-amber-500">
                    <input required type="text" value={editingBooking.license_plate} onChange={(e) => setEditingBooking({...editingBooking, license_plate: e.target.value.toUpperCase()})} className={yCls} />
                  </Field>
                  <Field label="Make / Model"><input type="text" value={editingBooking.car_make || ""} onChange={(e) => setEditingBooking({...editingBooking, car_make: e.target.value})} className={iCls} /></Field>
                  <Field label="Colour"><input type="text" value={editingBooking.car_color || ""} onChange={(e) => setEditingBooking({...editingBooking, car_color: e.target.value})} className={iCls} /></Field>
                </div>

                {/* BUG FIX #10: Date/time fields — were completely missing from edit modal */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-6 border-t border-slate-800">
                  <Field label="Drop-off Date"><input type="date" value={editingBooking.dropoff_date || ""} onChange={(e) => setEditingBooking({...editingBooking, dropoff_date: e.target.value})} className={dateCls} /></Field>
                  <Field label="Drop-off Time"><input type="time" value={editingBooking.dropoff_time || ""} onChange={(e) => setEditingBooking({...editingBooking, dropoff_time: e.target.value})} className={dateCls} /></Field>
                  <Field label="Pick-up Date"><input type="date" value={editingBooking.pickup_date || ""} onChange={(e) => setEditingBooking({...editingBooking, pickup_date: e.target.value})} className={dateCls} /></Field>
                  <Field label="Pick-up Time"><input type="time" value={editingBooking.pickup_time || ""} onChange={(e) => setEditingBooking({...editingBooking, pickup_time: e.target.value})} className={dateCls} /></Field>
                </div>

                {/* Status / Service / Price */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-slate-800">
                  <Field label="Status">
                    <div className="relative">
                      <select value={editingBooking.status} onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})} className={sCls}>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="parked">Parked</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Service Type">
                    <div className="relative">
                      <select value={editingBooking.service_type || "Meet & Greet"} onChange={(e) => setEditingBooking({...editingBooking, service_type: e.target.value})} className={sCls}>
                        <option value="Meet & Greet">Meet & Greet</option>
                        <option value="Park & Ride">Park & Ride</option>
                        <option value="Hotel & Parking">Hotel & Parking</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Total Price (£)" accent="text-emerald-400">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg pointer-events-none">£</span>
                      <input type="number" step="0.01" value={editingBooking.total_price} onChange={(e) => setEditingBooking({...editingBooking, total_price: parseFloat(e.target.value) || 0})}
                        className="w-full bg-[#1A2235] border border-emerald-500/25 rounded-xl pl-9 pr-5 py-4 text-emerald-400 text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:rgb(52,211,153)]"
                      />
                    </div>
                  </Field>
                </div>

                {/* Extra fields */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pt-6 border-t border-slate-800">
                  <Field label="Flight Number"><input type="text" value={editingBooking.flight_number || ""} onChange={(e) => setEditingBooking({...editingBooking, flight_number: e.target.value.toUpperCase()})} className={iCls} /></Field>
                  <Field label="Terminal"><input type="text" value={editingBooking.terminal || ""} onChange={(e) => setEditingBooking({...editingBooking, terminal: e.target.value})} className={iCls} /></Field>
                  <Field label="Airport">
                    <div className="relative">
                      <select value={editingBooking.airport || "Luton Airport (LTN)"} onChange={(e) => setEditingBooking({...editingBooking, airport: e.target.value})} className={sCls}>
                        <option value="Luton Airport (LTN)">Luton (LTN)</option>
                        <option value="Heathrow Airport (LHR)">Heathrow (LHR)</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex items-center gap-4 shrink-0">
                <button type="button" onClick={() => setEditingBooking(null)} className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-4 rounded-xl font-black text-sm text-white uppercase tracking-wider shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}