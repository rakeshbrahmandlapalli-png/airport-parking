"use client";

/**
 * AeroPark Direct — Partner Network v15.0
 * ─────────────────────────────────────────────────────────────
 * BUGS FIXED FROM v14:
 *
 * 1. ANIMATE-IN: tailwindcss-animate plugin classes silently no-op without the plugin.
 *    → Replaced with native CSS @keyframes in a <style> tag.
 *
 * 2. CATEGORY FILTER: Options now exactly match DB `category` column values
 *    ("meet-greet", "park-ride", "hotel") so the useMemo filter comparison works.
 *
 * 3. SELECT TEXT COLOUR: filterSelectCls webkit fill trick doesn't reliably change
 *    text colour inside <select> on all browsers. Added explicit `color` style prop
 *    on each select for active state, plus `text-white` on options.
 *
 * 4. AUTH EFFECT DEPENDENCY: useEffect([router]) re-runs when router changes,
 *    causing duplicate subscriptions. Split into [] for one-time auth check.
 *
 * 5. DYNAMIC TAILWIND IN ReviewSection: `hover:border-${color}-500/50` etc. are
 *    dynamic strings — Tailwind JIT won't scan interpolated strings, so those classes
 *    never generate. Replaced with static conditional class objects.
 *
 * 6. WEBKIT FILL COLOUR OVERRIDES COMMISSION GREEN: inputCls applies
 *    [-webkit-text-fill-color:white] globally, which overrides the emerald colour
 *    on the commission input. Commission input now uses a separate commissionCls
 *    that forces [-webkit-text-fill-color:rgb(52,211,153)].
 *
 * 7. FINANCIALS TAB EAGER FETCH: The useEffect for financials fired whenever
 *    editingCompany.id changed while modalTab was already "financials" (leftover
 *    from a previous session). Added an explicit modalTab === "financials" guard.
 *
 * 8. CSV TOTALS ROW MISALIGNED: Header had 10 columns but totals row only had
 *    7 empty placeholders before the 3 values. Corrected to 7 commas (cols 1-7 blank)
 *    before the gross/aero/partner values in cols 8-10.
 *
 * 9. phone_number_2: New column — documented that the Supabase companies table
 *    must have `phone_number_2 text` column added before deploying this version.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, Save, Car, Loader2, X, Trash2, MapPin,
  PlaneTakeoff, Settings2, LayoutDashboard, Building2,
  CalendarDays, LogOut, Plane, Network, SlidersHorizontal,
  ArrowUpDown, Award, AlertOctagon, FileText, Download,
  Percent, Image as ImageIcon, ArrowUp, ArrowDown,
  ChevronDown, AlertCircle, Filter, Phone
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

// ─── DEFAULT STATE (module-level, never recreated) ───────────────────────────
const defaultCompany = {
  name: "",
  category: "meet-greet",
  luton_price: 0,
  heathrow_price: 0,
  ltn_tier1_extra_rate: 1.99,
  ltn_tier2_extra_rate: 2.99,
  lhr_tier1_extra_rate: 1.99,
  lhr_tier2_extra_rate: 2.99,
  commission_rate: 15,
  logo_url: "",
  is_active: true,
  operates_at_luton: true,
  operates_at_heathrow: false,
  ltn_sold_out: false,
  lhr_sold_out: false,
  ltn_featured: false,
  lhr_featured: false,
  overview: "",
  phone_number: "",
  phone_number_2: "",   // NOTE: requires `phone_number_2 text` column in Supabase
  map_location: "Terminal Forecourt",
  on_arrival_lhr: "",
  on_arrival_ltn: "",
  on_return_lhr: "",
  on_return_ltn: "",
  address: "",
  postcode: "",
  ltn_reviews: [] as Review[],
  lhr_reviews: [] as Review[],
};

// ─── SORT ICON ────────────────────────────────────────────────────────────────
function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: "asc" | "desc" }) {
  if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-25" />;
  return sortOrder === "asc"
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-blue-400" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-blue-400" />;
}

// ─── FIELD HELPERS ───────────────────────────────────────────────────────────
function getField(editing: any, fresh: any, key: string) {
  return editing ? (editing[key] ?? fresh[key]) : fresh[key];
}

function setField(
  editing: any, setEditing: (v: any) => void,
  fresh: any, setFresh: (v: any) => void,
  key: string, value: any
) {
  if (editing) setEditing({ ...editing, [key]: value });
  else setFresh({ ...fresh, [key]: value });
}

// ─── REVIEW SECTION ───────────────────────────────────────────────────────────
// BUG FIX #5: No dynamic Tailwind class interpolation — all classes are static strings
function ReviewSection({
  airport, color, reviews, onAdd, onRemove, onUpdate,
}: {
  airport: "ltn" | "lhr";
  color: "blue" | "purple";
  reviews: Review[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof Review, value: any) => void;
}) {
  const btnCls   = color === "blue"
    ? "bg-blue-600 hover:bg-blue-500"
    : "bg-purple-600 hover:bg-purple-500";
  const ringCls  = color === "blue"
    ? "focus:ring-blue-500/50 hover:border-blue-500/40"
    : "focus:ring-purple-500/50 hover:border-purple-500/40";
  const baseCls  = "w-full bg-[#1A2235] border border-slate-700/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";

  return (
    <div className="pt-8 border-t border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-black text-xl">Customer Reviews ({airport.toUpperCase()})</h3>
        <button type="button" onClick={onAdd} className={`px-5 py-3 ${btnCls} text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-colors`}>
          + Add Review
        </button>
      </div>
      <div className="space-y-5">
        {reviews.map((rev, idx) => (
          <div key={rev.id} className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800 relative">
            <button type="button" onClick={() => onRemove(idx)} className="absolute top-5 right-5 p-2 bg-slate-800/60 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex flex-col sm:flex-row gap-4 mb-4 pr-10">
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block ml-1 mb-2">Reviewer</label>
                <input
                  value={rev.author}
                  onChange={(e) => onUpdate(idx, "author", e.target.value)}
                  className={`${baseCls} ${ringCls}`}
                  placeholder="Author name"
                />
              </div>
              <div className="sm:w-1/3">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block ml-1 mb-2">Rating</label>
                <div className="relative">
                  <select
                    value={rev.rating}
                    onChange={(e) => onUpdate(idx, "rating", parseInt(e.target.value))}
                    className={`w-full appearance-none bg-[#1A2235] border border-slate-700/50 rounded-xl px-5 py-4 text-sm font-bold outline-none cursor-pointer focus:ring-2 transition-all ${ringCls}`}
                    style={{ color: "#fbbf24" }} // amber — static, not dynamic Tailwind
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n} className="bg-[#1A2235] text-white">{n} Stars</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 block ml-1 mb-2">Comment</label>
            <textarea
              value={rev.comment}
              onChange={(e) => onUpdate(idx, "comment", e.target.value)}
              className={`${baseCls} ${ringCls} resize-none leading-relaxed`}
              rows={2}
              placeholder="Customer comment..."
            />
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-slate-600 text-sm font-bold text-center py-6">No reviews yet. Click + Add Review to start.</p>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminCompaniesPage() {
  const router = useRouter();

  const [companies,   setCompanies]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);

  const [searchTerm,     setSearchTerm]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [airportFilter,  setAirportFilter]  = useState("ALL");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [sortBy,         setSortBy]         = useState("name");
  const [sortOrder,      setSortOrder]      = useState<"asc" | "desc">("asc");

  const [showAddModal,    setShowAddModal]    = useState(false);
  const [editingCompany,  setEditingCompany]  = useState<any>(null);
  const [modalTab,        setModalTab]        = useState<"general" | "ltn" | "lhr" | "financials">("general");

  const [companyBookings,    setCompanyBookings]    = useState<any[]>([]);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);

  const [newCompany, setNewCompany] = useState<typeof defaultCompany>(defaultCompany);

  const activeFilterCount = [categoryFilter !== "ALL", airportFilter !== "ALL", statusFilter !== "ALL"].filter(Boolean).length;

  // ─── BUG FIX #4: auth check in [] effect — runs once only ─────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/admin/login");
      else fetchCompanies();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── BUG FIX #7: only fetch financials when tab is "financials" AND id exists ─
  useEffect(() => {
    if (modalTab === "financials" && editingCompany?.id) {
      fetchFinancials(editingCompany.id);
    }
  }, [modalTab]); // intentionally only on tab change, not on editingCompany change

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from("companies").select("*").order("name", { ascending: true });
    if (data) setCompanies(data);
    if (error) console.error("fetchCompanies:", error);
    setLoading(false);
  }

  async function fetchFinancials(companyId: string) {
    setFetchingFinancials(true);
    setCompanyBookings([]);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("company_id", companyId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (data) setCompanyBookings(data);
    if (error) console.error("fetchFinancials:", error);
    setFetchingFinancials(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const closeModal = () => {
    setEditingCompany(null);
    setShowAddModal(false);
    setModalTab("general");
    setCompanyBookings([]);
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").insert([newCompany]);
      if (error) throw error;
      closeModal();
      setNewCompany(defaultCompany);
      await fetchCompanies();
    } catch (err: any) {
      alert("Error adding partner: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").update(editingCompany).eq("id", editingCompany.id);
      if (error) throw error;
      closeModal();
      await fetchCompanies();
    } catch (err: any) {
      alert("Error updating partner: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this partner profile?")) return;
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert("Error deleting partner: " + err.message);
    }
  };

  const handleToggleActive = async (company: any) => {
    const newVal = !company.is_active;
    setCompanies((prev) => prev.map((c) => c.id === company.id ? { ...c, is_active: newVal } : c));
    await supabase.from("companies").update({ is_active: newVal }).eq("id", company.id);
  };

  // ─── CSV INVOICE ──────────────────────────────────────────────────────────
  // BUG FIX #8: TOTALS row columns aligned to header (10 columns, 7 blanks before values)
  const downloadInvoiceCSV = () => {
    if (!editingCompany) return;
    const commRate = Number(editingCompany.commission_rate || 15) / 100;
    let totalGross = 0, totalAero = 0, totalPartner = 0;

    let csv = `AEROPARK DIRECT - PARTNER STATEMENT\n`;
    csv += `Partner: ${editingCompany.name}\n`;
    csv += `Commission Rate: ${(commRate * 100).toFixed(1)}%\n`;
    csv += `Generated On: ${new Date().toLocaleDateString()}\n\n`;
    // 10 columns
    csv += `Booking Ref,Customer,Drop-off Date,Drop-off Time,Pick-up Date,Pick-up Time,Service Type,Gross (£),Aero Fee (£),Partner Payout (£)\n`;

    companyBookings.forEach((b) => {
      const gross      = Number(b.total_price || 0);
      const aeroFee    = gross * commRate;
      const partnerCut = gross - aeroFee;
      totalGross   += gross;
      totalAero    += aeroFee;
      totalPartner += partnerCut;
      const sType = b.service_type || "Meet & Greet";
      csv += `${b.booking_ref},${b.full_name},${b.dropoff_date},${b.dropoff_time || "N/A"},${b.pickup_date},${b.pickup_time || "N/A"},${sType},${gross.toFixed(2)},${aeroFee.toFixed(2)},${partnerCut.toFixed(2)}\n`;
    });

    // BUG FIX #8: 7 empty cells (cols 1-7) then 3 values (cols 8-10)
    csv += `\nTOTALS,,,,,,, ${totalGross.toFixed(2)},${totalAero.toFixed(2)},${totalPartner.toFixed(2)}\n`;

    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `${editingCompany.name.replace(/\s+/g, "_")}_Statement.csv`,
    });
    a.click();
  };

  // ─── FILTER ENGINE ─────────────────────────────────────────────────────────
  // BUG FIX #2: category values match DB exactly ("meet-greet", "park-ride", "hotel")
  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...companies];

    if (searchTerm) {
      result = result.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    // BUG FIX #2: direct equality check on exact DB values
    if (categoryFilter !== "ALL") {
      result = result.filter((c) => (c.category || "") === categoryFilter);
    }
    if (airportFilter === "LTN") result = result.filter((c) => c.operates_at_luton);
    if (airportFilter === "LHR") result = result.filter((c) => c.operates_at_heathrow);
    if (statusFilter === "ACTIVE")  result = result.filter((c) => c.is_active);
    if (statusFilter === "OFFLINE") result = result.filter((c) => !c.is_active);

    result.sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy];
      if (["luton_price", "heathrow_price", "commission_rate"].includes(sortBy)) {
        valA = Number(valA || 0); valB = Number(valB || 0);
      } else {
        valA = String(valA || "").toLowerCase(); valB = String(valB || "").toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchTerm, categoryFilter, airportFilter, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  };

  // ─── REVIEW HANDLERS ──────────────────────────────────────────────────────
  const addReview = (airport: "ltn" | "lhr") => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    const rev: Review = { id: Date.now(), author: "Customer Name", rating: 5, comment: "Write review here...", date: new Date().toLocaleDateString() };
    if (editingCompany) setEditingCompany({ ...editingCompany, [key]: [...(editingCompany[key] || []), rev] });
    else setNewCompany({ ...newCompany, [key]: [...(newCompany[key] || []), rev] });
  };

  const removeReview = (airport: "ltn" | "lhr", idx: number) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) {
      const u = [...(editingCompany[key] || [])]; u.splice(idx, 1);
      setEditingCompany({ ...editingCompany, [key]: u });
    } else {
      const u = [...(newCompany[key] || [])]; u.splice(idx, 1);
      setNewCompany({ ...newCompany, [key]: u });
    }
  };

  const updateReview = (airport: "ltn" | "lhr", idx: number, field: keyof Review, value: any) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) {
      const u = [...(editingCompany[key] || [])]; u[idx] = { ...u[idx], [field]: value };
      setEditingCompany({ ...editingCompany, [key]: u });
    } else {
      const u = [...(newCompany[key] || [])]; u[idx] = { ...u[idx], [field]: value };
      setNewCompany({ ...newCompany, [key]: u });
    }
  };

  const getAvgRating = (reviews: Review[] | null | undefined) => {
    if (!reviews || reviews.length === 0) return "New";
    return (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1);
  };

  const calcGross    = () => companyBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
  const calcAeroCut  = () => calcGross() * (Number(editingCompany?.commission_rate || 15) / 100);
  const calcPayout   = () => calcGross() - calcAeroCut();

  const totalPartners = companies.length;
  const ltnCoverage   = companies.filter((c) => c.operates_at_luton    && c.is_active).length;
  const lhrCoverage   = companies.filter((c) => c.operates_at_heathrow  && c.is_active).length;

  // ─── SHARED STYLES ────────────────────────────────────────────────────────
  // BUG FIX #6: separate commission class that forces emerald text fill
  const inputCls      = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/40 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";
  const commissionCls = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-emerald-500/40 rounded-xl px-5 py-4 text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:rgb(52,211,153)]";
  const textareaCls   = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/40 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500 leading-relaxed resize-none";
  const selectCls     = "w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/40 rounded-xl py-4 pl-10 pr-9 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/40 transition-all";
  const labelCls      = "text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2";

  // BUG FIX #3: select text colour controlled via style prop, not webkit fill
  const filterSelectStyle = (active: boolean) => ({
    color: active ? "#60a5fa" : "#94a3b8", // blue-400 or slate-400
    backgroundColor: "#1A2235",
  });

  if (loading) return (
    <div className="min-h-screen bg-[#060A14] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Initializing Network Hub…</p>
    </div>
  );

  return (
    <>
      {/* BUG FIX #1: native CSS keyframes — no Tailwind plugin required */}
      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(.97) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
        .modal-in { animation: modalIn .2s ease-out both }
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#1e293b; border-radius:99px }
      `}</style>

      <div className="min-h-screen bg-[#060A14] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 antialiased">

        {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
        <aside className="w-64 hidden md:flex flex-col sticky top-0 h-screen bg-[#0F1523] border-r border-slate-800/80 shrink-0 z-50">
          <div className="p-7 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.15)]">
              <Plane className="w-5 h-5 text-blue-500 rotate-45" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white">OPS <span className="text-blue-500">CENTER</span></span>
          </div>

          <nav className="px-4 space-y-2 flex-grow mt-4 text-sm font-bold">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
              <LayoutDashboard className="w-4 h-4 text-slate-500" /> Live Board
            </Link>
            <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 text-white rounded-xl shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:bg-blue-500 transition-all">
              <Building2 className="w-4 h-4" /> Partner Network
            </Link>
            <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
              <CalendarDays className="w-4 h-4 text-slate-500" /> Logistics Plan
            </Link>
          </nav>

          <div className="p-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl text-sm font-bold transition-all border border-slate-800">
              <LogOut className="w-4 h-4 text-slate-500" /> Secure Logout
            </button>
          </div>
        </aside>

        {/* ── MAIN ──────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto h-screen pb-28 md:pb-12 p-4 md:p-8 lg:p-10 space-y-8">

          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between bg-[#131A2B] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 font-black text-lg tracking-tighter text-white uppercase">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Plane className="w-4 h-4 text-white rotate-45" /></div>
              OPS<span className="text-blue-500">CENTER</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Partner Network</h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-2">
                {filteredAndSortedCompanies.length} of {totalPartners} partners shown
              </p>
            </div>
            <button
              onClick={() => { setModalTab("general"); setShowAddModal(true); }}
              className="flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_8px_20px_-4px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Onboard New Partner
            </button>
          </header>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: "Total Network", value: totalPartners, color: "blue",    Icon: Network },
              { label: "LTN Active",    value: ltnCoverage,   color: "emerald", Icon: Car },
              { label: "LHR Active",    value: lhrCoverage,   color: "indigo",  Icon: PlaneTakeoff },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className={`relative bg-[#131A2B] p-7 rounded-2xl border border-${color}-900/30 hover:border-${color}-500/40 overflow-hidden shadow-xl transition-all cursor-default`}>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-${color}-400 mb-3`}>
                  <Icon className="w-4 h-4" /> {label}
                </div>
                <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{value}</p>
                <div className={`w-24 h-24 bg-${color}-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl`} />
              </div>
            ))}
          </div>

          {/* ── FILTER RIBBON ───────────────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-2xl border border-slate-800 shadow-lg p-4 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                autoComplete="off"
                placeholder="Search partners by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/40 rounded-xl py-3.5 pl-11 pr-10 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/40 transition-all [box-shadow:0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500"
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
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-black">{activeFilterCount}</span>
                )}
              </span>

              {/* BUG FIX #2 & #3: category values match DB; colour via style prop */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none z-10" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`${selectCls} pl-9 pr-8`}
                  style={filterSelectStyle(categoryFilter !== "ALL")}
                >
                  <option value="ALL"        className="bg-[#1A2235] text-white">All Services</option>
                  <option value="meet-greet" className="bg-[#1A2235] text-white">Meet &amp; Greet</option>
                  <option value="park-ride"  className="bg-[#1A2235] text-white">Park &amp; Ride</option>
                  <option value="hotel"      className="bg-[#1A2235] text-white">Hotel Parking</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none z-10" />
                <select
                  value={airportFilter}
                  onChange={(e) => setAirportFilter(e.target.value)}
                  className={`${selectCls} pl-9 pr-8`}
                  style={filterSelectStyle(airportFilter !== "ALL")}
                >
                  <option value="ALL" className="bg-[#1A2235] text-white">All Airports</option>
                  <option value="LTN" className="bg-[#1A2235] text-white">Luton (LTN)</option>
                  <option value="LHR" className="bg-[#1A2235] text-white">Heathrow (LHR)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>

              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none z-10" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${selectCls} pl-9 pr-8`}
                  style={filterSelectStyle(statusFilter !== "ALL")}
                >
                  <option value="ALL"     className="bg-[#1A2235] text-white">Any Status</option>
                  <option value="ACTIVE"  className="bg-[#1A2235] text-white">Active Only</option>
                  <option value="OFFLINE" className="bg-[#1A2235] text-white">Offline</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setCategoryFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setSearchTerm(""); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold border border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-all"
                >
                  <X className="w-3 h-3" /> Clear {activeFilterCount}
                </button>
              )}

              {/* Sort buttons */}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sort</span>
                {[
                  { key: "name",            label: "Name" },
                  { key: "commission_rate", label: "Comm" },
                  { key: "luton_price",     label: "LTN £" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`flex items-center gap-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                      sortBy === key
                        ? "bg-blue-500/12 border-blue-500/25 text-blue-400"
                        : "bg-[#1A2235] border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {label} <SortIcon field={key} sortBy={sortBy} sortOrder={sortOrder} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── DATA TABLE ────────────────────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0F1523] border-b border-slate-800">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="px-7 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                      Partner <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
                    </th>
                    <th className="px-7 py-5 text-center">Status</th>
                    <th className="px-7 py-5 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("commission_rate")}>
                      Commission <SortIcon field="commission_rate" sortBy={sortBy} sortOrder={sortOrder} />
                    </th>
                    <th className="px-7 py-5 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("luton_price")}>
                      LTN Rate <SortIcon field="luton_price" sortBy={sortBy} sortOrder={sortOrder} />
                    </th>
                    <th className="px-7 py-5 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("heathrow_price")}>
                      LHR Rate <SortIcon field="heathrow_price" sortBy={sortBy} sortOrder={sortOrder} />
                    </th>
                    <th className="px-7 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredAndSortedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-28 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center">
                            <Search className="w-9 h-9 text-slate-600" />
                          </div>
                          <p className="text-xl font-black uppercase tracking-widest text-white">No Partners Match</p>
                          <p className="text-sm text-slate-400 font-medium">Adjust your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedCompanies.map((c) => (
                      <tr key={c.id} className={`transition-all group hover:bg-slate-800/25 ${!c.is_active ? "opacity-40 grayscale" : ""}`}>
                        {/* Partner */}
                        <td className="px-7 py-6">
                          <div className="flex items-center gap-4">
                            {c.logo_url ? (
                              <img src={c.logo_url} alt={c.name} className="w-11 h-11 rounded-xl object-contain bg-white p-1.5 border border-slate-700/50 shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-[#1A2235] border border-slate-700/50 flex items-center justify-center font-black text-lg text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all shrink-0">
                                {c.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors tracking-tight">{c.name}</p>
                              <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 mt-1 inline-block">
                                {c.category?.replace("-", " ")}
                              </span>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 mt-1.5">
                                {c.operates_at_luton    && <span className={`flex items-center gap-1 ${c.ltn_featured ? "text-amber-400" : ""}`}><Car className="w-3 h-3" /> ★ {getAvgRating(c.ltn_reviews)}</span>}
                                {c.operates_at_heathrow && <span className={`flex items-center gap-1 ${c.lhr_featured ? "text-amber-400" : ""}`}><PlaneTakeoff className="w-3 h-3" /> ★ {getAvgRating(c.lhr_reviews)}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status toggle */}
                        <td className="px-7 py-6 text-center">
                          <button
                            onClick={() => handleToggleActive(c)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] tracking-widest font-black border uppercase transition-all ${
                              c.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            }`}
                          >
                            {c.is_active ? "Active" : "Offline"}
                          </button>
                        </td>

                        {/* Commission */}
                        <td className="px-7 py-6">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-black">
                            <Percent className="w-3 h-3" /> {c.commission_rate || 15}%
                          </div>
                        </td>

                        {/* LTN rate */}
                        <td className="px-7 py-6 text-right">
                          {c.operates_at_luton ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-white text-lg tabular-nums">£{Number(c.luton_price || 0).toFixed(2)}</span>
                              {c.ltn_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Sold Out</span>}
                            </div>
                          ) : <span className="text-slate-600 text-xs font-black">—</span>}
                        </td>

                        {/* LHR rate */}
                        <td className="px-7 py-6 text-right">
                          {c.operates_at_heathrow ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-black text-white text-lg tabular-nums">£{Number(c.heathrow_price || 0).toFixed(2)}</span>
                              {c.lhr_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Sold Out</span>}
                            </div>
                          ) : <span className="text-slate-600 text-xs font-black">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="px-7 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all duration-200">
                            <button onClick={() => { setModalTab("general"); setEditingCompany(c); }} className="p-2.5 bg-[#1A2235] border border-slate-700 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90">
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-[#1A2235] border border-slate-700 text-slate-500 hover:bg-red-500 hover:text-white hover:border-transparent rounded-lg transition-all active:scale-90">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-5 pt-2 bg-gradient-to-t from-[#060A14] to-transparent pointer-events-none">
          <nav className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl h-16 flex items-center justify-around px-4 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center gap-1 text-blue-500 scale-105"><Building2 className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Ops</span></Link>
            <div className="relative -top-5">
              <button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-13 h-13 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#060A14] active:scale-90 transition-all">
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>
            <Link href="/admin/schedule" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><CalendarDays className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Plan</span></Link>
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Exit</span></button>
          </nav>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#060A14]/96 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8">
          <div onClick={closeModal} className="absolute inset-0" />
          <div className="relative z-10 bg-[#0F1523] border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden modal-in">

            {/* Modal Header & Tabs */}
            <div className="pt-7 px-8 border-b border-slate-800 bg-[#131A2B] shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
              <div className="flex justify-between items-start mb-7">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {editingCompany ? "Configure Partner" : "Onboard Partner"}
                  </h2>
                  {editingCompany && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      ID: {editingCompany.id?.substring(0, 8)}
                    </p>
                  )}
                </div>
                <button onClick={closeModal} className="p-2.5 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/15 border border-slate-700/50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 overflow-x-auto">
                {[
                  { key: "general",    label: "General Info",        Icon: Settings2    },
                  { key: "ltn",        label: "Luton Ops",           Icon: Car          },
                  { key: "lhr",        label: "Heathrow Ops",        Icon: PlaneTakeoff },
                  ...(editingCompany ? [{ key: "financials", label: "Invoices", Icon: FileText }] : []),
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setModalTab(key as any)}
                    className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                      modalTab === key
                        ? key === "financials"
                          ? "border-emerald-500 text-emerald-400"
                          : "border-blue-500 text-blue-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {modalTab !== "financials" ? (
                <form
                  onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany}
                  autoComplete="off"
                  className="flex flex-col flex-1 overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* ── GENERAL TAB ─────────────────────────────────── */}
                    {modalTab === "general" && (
                      <div className="space-y-7 text-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className={labelCls}>Brand Name</label>
                            <input required type="text" autoComplete="off"
                              value={getField(editingCompany, newCompany, "name")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "name", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Service Category</label>
                            {/* BUG FIX #2: option values match DB category column */}
                            <div className="relative">
                              <select
                                value={getField(editingCompany, newCompany, "category")}
                                onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "category", e.target.value)}
                                className="w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/40 rounded-xl py-4 px-5 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/40 transition-all"
                                style={{ color: "white" }}
                              >
                                <option value="meet-greet" className="bg-[#1A2235]">Meet &amp; Greet</option>
                                <option value="park-ride"  className="bg-[#1A2235]">Park &amp; Ride</option>
                                <option value="hotel"      className="bg-[#1A2235]">Hotel Parking</option>
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}><ImageIcon className="w-3 h-3 inline mr-1 text-blue-400" />Logo URL</label>
                            <input type="text" autoComplete="off" placeholder="https://..."
                              value={getField(editingCompany, newCompany, "logo_url")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "logo_url", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            {/* BUG FIX #6: commission uses its own class with emerald webkit fill */}
                            <label className={labelCls}><Percent className="w-3 h-3 inline mr-1 text-emerald-400" />Commission Cut (%)</label>
                            <input required type="number" step="0.1" min="0" max="100"
                              value={getField(editingCompany, newCompany, "commission_rate")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "commission_rate", parseFloat(e.target.value) || 0)}
                              className={commissionCls}
                            />
                            <div className="mt-2 mx-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                                style={{ width: `${Math.min(getField(editingCompany, newCompany, "commission_rate"), 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Dual phone numbers */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                          <div>
                            <label className={labelCls}><Phone className="w-3 h-3 inline mr-1 text-amber-400" />Dispatch Phone 1 (Primary)</label>
                            <input type="text" autoComplete="off" placeholder="07700 900 000"
                              value={getField(editingCompany, newCompany, "phone_number")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}><Phone className="w-3 h-3 inline mr-1 text-amber-400/60" />Dispatch Phone 2 (Optional)</label>
                            <input type="text" autoComplete="off" placeholder="07700 900 001"
                              value={getField(editingCompany, newCompany, "phone_number_2")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number_2", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Overview */}
                        <div className="pt-4 border-t border-slate-800">
                          <label className={labelCls}>Marketing Overview</label>
                          <textarea rows={4}
                            value={getField(editingCompany, newCompany, "overview")}
                            onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "overview", e.target.value)}
                            className={textareaCls}
                            placeholder="Highlight key selling points..."
                          />
                        </div>
                      </div>
                    )}

                    {/* ── LTN TAB ─────────────────────────────────────── */}
                    {modalTab === "ltn" && (
                      <div className="space-y-7 text-white">
                        <div className="bg-[#1A2235] p-5 rounded-2xl border border-slate-700/50">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1">
                              <p className="text-white font-black">Operates at Luton Airport?</p>
                              <p className="text-slate-500 text-xs mt-0.5">Enable to show in LTN search results.</p>
                            </div>
                            <input type="checkbox"
                              checked={getField(editingCompany, newCompany, "operates_at_luton")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_luton", e.target.checked)}
                              className="accent-blue-500 w-5 h-5 cursor-pointer"
                            />
                          </label>
                        </div>

                        {getField(editingCompany, newCompany, "operates_at_luton") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 mb-0.5" />Day 1: Base Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "luton_price")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "luton_price", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-2xl`}
                                />
                              </div>
                              <div className="flex flex-col gap-3 pt-5">
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_sold_out", !getField(editingCompany, newCompany, "ltn_sold_out"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_sold_out") ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-[#1A2235] text-slate-500 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out
                                </button>
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_featured", !getField(editingCompany, newCompany, "ltn_featured"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_featured") ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-[#1A2235] text-slate-500 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <Award className="w-3.5 h-3.5" /> Featured Provider
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 mb-0.5" />Days 2–6: Extra Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "ltn_tier1_extra_rate")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_tier1_extra_rate", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-xl`}
                                />
                              </div>
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 mb-0.5" />Days 7+: Extra Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "ltn_tier2_extra_rate")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_tier2_extra_rate", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-xl`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}>Arrival Instructions</label>
                                <textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_ltn")} onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_ltn", e.target.value)} className={textareaCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Return Instructions</label>
                                <textarea rows={5} value={getField(editingCompany, newCompany, "on_return_ltn")} onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_ltn", e.target.value)} className={textareaCls} />
                              </div>
                            </div>

                            <ReviewSection airport="ltn" color="blue"
                              reviews={getField(editingCompany, newCompany, "ltn_reviews") || []}
                              onAdd={() => addReview("ltn")}
                              onRemove={(idx) => removeReview("ltn", idx)}
                              onUpdate={(idx, f, v) => updateReview("ltn", idx, f, v)}
                            />
                          </>
                        )}
                      </div>
                    )}

                    {/* ── LHR TAB ─────────────────────────────────────── */}
                    {modalTab === "lhr" && (
                      <div className="space-y-7 text-white">
                        <div className="bg-[#1A2235] p-5 rounded-2xl border border-slate-700/50">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1">
                              <p className="text-white font-black">Operates at Heathrow Airport?</p>
                              <p className="text-slate-500 text-xs mt-0.5">Enable to show in LHR search results.</p>
                            </div>
                            <input type="checkbox"
                              checked={getField(editingCompany, newCompany, "operates_at_heathrow")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_heathrow", e.target.checked)}
                              className="accent-purple-500 w-5 h-5 cursor-pointer"
                            />
                          </label>
                        </div>

                        {getField(editingCompany, newCompany, "operates_at_heathrow") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 mb-0.5" />Day 1: Base Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "heathrow_price")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "heathrow_price", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-2xl`}
                                />
                              </div>
                              <div className="flex flex-col gap-3 pt-5">
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_sold_out", !getField(editingCompany, newCompany, "lhr_sold_out"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_sold_out") ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-[#1A2235] text-slate-500 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out
                                </button>
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_featured", !getField(editingCompany, newCompany, "lhr_featured"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_featured") ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-[#1A2235] text-slate-500 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <Award className="w-3.5 h-3.5" /> Featured Provider
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 mb-0.5" />Days 2–6: Extra Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "lhr_tier1_extra_rate")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_tier1_extra_rate", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-xl`}
                                />
                              </div>
                              <div>
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 mb-0.5" />Days 7+: Extra Rate (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "lhr_tier2_extra_rate")}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_tier2_extra_rate", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} text-xl`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelCls}>Arrival Instructions</label>
                                <textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_lhr")} onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_lhr", e.target.value)} className={textareaCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Return Instructions</label>
                                <textarea rows={5} value={getField(editingCompany, newCompany, "on_return_lhr")} onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_lhr", e.target.value)} className={textareaCls} />
                              </div>
                            </div>

                            <ReviewSection airport="lhr" color="purple"
                              reviews={getField(editingCompany, newCompany, "lhr_reviews") || []}
                              onAdd={() => addReview("lhr")}
                              onRemove={(idx) => removeReview("lhr", idx)}
                              onUpdate={(idx, f, v) => updateReview("lhr", idx, f, v)}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save footer */}
                  <div className="bg-[#131A2B] p-7 shrink-0 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-4 rounded-xl font-black uppercase tracking-wider text-xs text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {isSaving ? "Syncing…" : "Save & Deploy Partner"}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── FINANCIALS TAB ──────────────────────────────────── */
                <div className="flex-1 overflow-y-auto p-8 space-y-7">
                  {fetchingFinancials ? (
                    <div className="py-24 flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                      <p className="font-black text-[10px] uppercase tracking-widest">Compiling Ledgers…</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-emerald-500/8 border border-emerald-500/20 p-7 rounded-2xl">
                        <div>
                          <h3 className="text-emerald-400 font-black text-2xl tracking-tight">Partner Accounting</h3>
                          <p className="text-emerald-500/60 text-xs font-bold mt-1">{companyBookings.length} completed bookings</p>
                        </div>
                        <button
                          onClick={downloadInvoiceCSV}
                          className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                          <Download className="w-4 h-4" /> Export CSV Invoice
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {[
                          { label: "Total Gross",   value: `£${calcGross().toFixed(2)}`,    color: "text-white" },
                          { label: `Aero Cut (${editingCompany?.commission_rate || 15}%)`, value: `£${calcAeroCut().toFixed(2)}`,  color: "text-blue-400" },
                          { label: "Payout Due",    value: `£${calcPayout().toFixed(2)}`,   color: "text-emerald-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-[#1A2235] p-7 rounded-2xl border border-slate-700/50">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                            <p className={`text-3xl font-black tabular-nums tracking-tighter ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#131A2B]">
                        <div className="p-5 border-b border-slate-800 bg-[#0F1523]">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Ledger</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-600">
                                <th className="px-6 py-4">Ref</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Gross</th>
                                <th className="px-6 py-4">Aero Fee</th>
                                <th className="px-6 py-4">Partner</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {companyBookings.slice(0, 15).map((b) => {
                                const gross   = Number(b.total_price || 0);
                                const aeroCut = gross * ((editingCompany?.commission_rate || 15) / 100);
                                return (
                                  <tr key={b.id} className="hover:bg-white/[0.02]">
                                    <td className="px-6 py-4 text-xs font-bold text-white">{b.booking_ref}</td>
                                    <td className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">{b.service_type || "Meet & Greet"}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400">£{gross.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-blue-400">£{aeroCut.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-xs font-black text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              {companyBookings.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-600 text-xs font-bold">No completed bookings found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}