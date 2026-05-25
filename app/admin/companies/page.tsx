"use client";

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
  ChevronDown, AlertCircle, Filter, Phone, Code2, Tags, Zap
} from "lucide-react";

interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  source: string;
}

// ─── DEFAULT DATA ──────────────────────────────────────
const defaultCompany = {
  name: "",
  category: "meet-greet",
  luton_price: 0,
  heathrow_price: 0,
  price_modifier: 1.0, // 🟢 NEW: Default base price modifier
  
  ltn_day2_price: 0, ltn_day5_price: 0, ltn_day8_price: 0, ltn_day11_price: 0,
  ltn_day14_price: 0, ltn_day17_price: 0, ltn_day22_price: 0, ltn_day32_price: 0,

  lhr_day2_price: 0, lhr_day5_price: 0, lhr_day8_price: 0, lhr_day11_price: 0,
  lhr_day14_price: 0, lhr_day17_price: 0, lhr_day22_price: 0, lhr_day32_price: 0,

  terminal_data: {
    T2: { address: "Terminal 2 Short Stay", postcode: "TW6 1EW", map_url: "" },
    T3: { address: "Terminal 3 Short Stay", postcode: "TW6 1QG", map_url: "" },
    T4: { address: "Terminal 4 Short Stay", postcode: "TW6 3XA", map_url: "" },
    T5: { address: "Terminal 5 Short Stay", postcode: "TW6 2GA", map_url: "" },
  },

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
  phone_number_2: "",  
  map_location: "Terminal Forecourt",
  on_arrival_lhr: "",
  on_arrival_ltn: "",
  on_return_lhr: "",
  on_return_ltn: "",
  address: "",
  postcode: "",
  map_url: "", 
  ltn_reviews: [] as Review[],
  lhr_reviews: [] as Review[],
  badges: [],
};

// ─── SORT ICON HELPER ────────────────────────────────────────────────────────
function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: "asc" | "desc" }) {
  if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-30" />;
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

export default function AdminCompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const [pricingEngine, setPricingEngine] = useState<any[]>([]);

  const [modalTab, setModalTab] = useState<"general" | "ltn" | "lhr" | "terminals" | "financials">("general");

  const [companyBookings, setCompanyBookings] = useState<any[]>([]);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);

  const [newCompany, setNewCompany] = useState(defaultCompany);

  const activeFilterCount = [
    categoryFilter !== "ALL",
    airportFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  useEffect(() => {
    fetch('https://script.google.com/macros/s/AKfycbwd4zT_JLMbufzexsJ4GKtkyvVh5EvxUQ0XA_i5cg6f19QXFutErdrU3i57TIF-D8Ku/exec', {
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    })
      .then(res => res.json())
      .then(data => setPricingEngine(data))
      .catch(err => console.error("Pricing Engine Error:", err));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchCompanies();
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (modalTab === "financials" && editingCompany?.id) {
      fetchFinancials(editingCompany.id);
    }
  }, [modalTab, editingCompany?.id]);

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

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").insert([newCompany]);
      if (error) throw error;
      closeModal();
      setNewCompany(defaultCompany);
      await fetchCompanies();
    } catch (error: any) {
      alert("Error adding partner: " + error.message);
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
    } catch (error: any) {
      alert("Error updating partner: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 🟢 MASTER OVERRIDE FUNCTION ─────────────────────────────────────
  const masterUpdate = async (val: number) => {
    const isIncrease = val > 1;
    const isReset = val === 1;
    const text = isReset ? "RESET all prices to BASE" : `apply a ${isIncrease ? '+' : ''}${Math.round((val-1)*100)}% modifier to ALL operators`;
    
    if (!confirm(`⚠️ Are you sure you want to ${text}?`)) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").update({ price_modifier: val }).neq("id", "0");
      if (error) throw error;
      await fetchCompanies();
      alert(`Successfully updated all operators to ${val}x modifier.`);
    } catch (error: any) {
      alert("Error updating master pricing: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBadge = (label: string, category: string) => {
    if (!label) return;
    const current = getField(editingCompany, newCompany, "badges") || [];
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "badges", 
      [...current, { label: label.toUpperCase(), category }]
    );
  };

  const handleRemoveBadge = (index: number) => {
    const current = getField(editingCompany, newCompany, "badges") || [];
    const updated = current.filter((_: any, i: number) => i !== index);
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "badges", updated);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ CRITICAL: Permanently delete this partner profile?")) return;
    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      setCompanies(companies.filter((c) => c.id !== id));
    } catch (error: any) {
      alert("Error deleting partner: " + error.message);
    }
  };

  const handleToggleActive = async (company: any) => {
    const newVal = !company.is_active;
    setCompanies(companies.map((c) => (c.id === company.id ? { ...c, is_active: newVal } : c)));
    await supabase.from("companies").update({ is_active: newVal }).eq("id", company.id);
  };

  const updateTerminalField = (term: string, field: string, value: string) => {
    const currentData = getField(editingCompany, newCompany, "terminal_data") || defaultCompany.terminal_data;
    const newData = {
      ...currentData,
      [term]: { ...(currentData[term as keyof typeof currentData] || {}), [field]: value }
    };
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "terminal_data", newData);
  };

  const downloadInvoiceCSV = () => {
    if (!editingCompany) return;
    const commRate = Number(editingCompany.commission_rate || 15) / 100;
    let totalGross = 0;
    let totalAero = 0;
    let totalPartner = 0;

    let csv = `AEROPARK DIRECT - PARTNER STATEMENT\n`;
    csv += `Partner: ${editingCompany.name}\n`;
    csv += `Commission Rate: ${(commRate * 100).toFixed(1)}%\n`;
    csv += `Generated On: ${new Date().toLocaleDateString()}\n\n`;
    
    csv += `Booking Ref,Customer,Drop-off Date,Drop-off Time,Pick-up Date,Pick-up Time,Service Type,Gross (£),Aero Fee (£),Partner Payout (£)\n`;
    
    companyBookings.forEach((b) => {
      const gross = Number(b.total_price || 0);
      const aeroFee = gross * commRate;
      const partnerCut = gross - aeroFee;
      
      totalGross += gross; 
      totalAero += aeroFee; 
      totalPartner += partnerCut;
      
      const sType = b.service_type || "Meet & Greet";
      csv += `${b.booking_ref},${b.full_name},${b.dropoff_date},${b.dropoff_time || 'N/A'},${b.pickup_date},${b.pickup_time || 'N/A'},${sType},${gross.toFixed(2)},${aeroFee.toFixed(2)},${partnerCut.toFixed(2)}\n`;
    });
    
    csv += `\nTOTALS,,,,,,,${totalGross.toFixed(2)},${totalAero.toFixed(2)},${totalPartner.toFixed(2)}\n`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editingCompany.name.replace(/\s+/g, "_")}_Statement.csv`;
    a.click();
  };

  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...companies];
    
    if (searchTerm) {
      result = result.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    if (categoryFilter !== "ALL") {
      result = result.filter((c) => (c.category || "") === categoryFilter);
    }
    
    if (airportFilter === "LTN") result = result.filter((c) => c.operates_at_luton);
    if (airportFilter === "LHR") result = result.filter((c) => c.operates_at_heathrow);
    if (statusFilter === "ACTIVE") result = result.filter((c) => c.is_active);
    if (statusFilter === "OFFLINE") result = result.filter((c) => !c.is_active);
    
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (["luton_price", "heathrow_price", "commission_rate"].includes(sortBy)) {
        valA = Number(valA || 0); 
        valB = Number(valB || 0);
      } else {
        valA = String(valA || "").toLowerCase(); 
        valB = String(valB || "").toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [companies, searchTerm, categoryFilter, airportFilter, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else { 
      setSortBy(field); 
      setSortOrder("asc"); 
    }
  };

  const addReview = (airport: "ltn" | "lhr") => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    const rev: Review = { 
      id: Date.now(), 
      author: "Customer Name", 
      rating: 5, 
      comment: "Write review here...", 
      date: new Date().toISOString().split('T')[0], 
      verified: true,
      source: "Trustpilot"
    };
    if (editingCompany) {
      setEditingCompany({ ...editingCompany, [key]: [...(editingCompany[key] || []), rev] });
    } else {
      setNewCompany({ ...newCompany, [key]: [...(newCompany[key] || []), rev] });
    }
  };

  const removeReview = (airport: "ltn" | "lhr", idx: number) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])]; 
      updated.splice(idx, 1);
      setEditingCompany({ ...editingCompany, [key]: updated });
    } else {
      const updated = [...(newCompany[key] || [])]; 
      updated.splice(idx, 1);
      setNewCompany({ ...newCompany, [key]: updated });
    }
  };

  const updateReview = (airport: "ltn" | "lhr", idx: number, field: keyof Review, value: any) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])]; 
      updated[idx] = { ...updated[idx], [field]: value };
      setEditingCompany({ ...editingCompany, [key]: updated });
    } else {
      const updated = [...(newCompany[key] || [])]; 
      updated[idx] = { ...updated[idx], [field]: value };
      setNewCompany({ ...newCompany, [key]: updated });
    }
  };

  const getAvgRating = (reviews: Review[] | undefined | null) => {
    if (!reviews || reviews.length === 0) return "New";
    const avg = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length;
    return avg.toFixed(1);
  };

  const calcGross = () => companyBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const calcAeroCut = () => calcGross() * (Number(editingCompany?.commission_rate || 15) / 100);
  const calcPayout = () => calcGross() - calcAeroCut();

  const totalPartners = companies.length;
  const ltnCoverage = companies.filter((c) => c.operates_at_luton && c.is_active).length;
  const lhrCoverage = companies.filter((c) => c.operates_at_heathrow && c.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060A14] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
          <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Initializing Network Hub...</p>
      </div>
    );
  }

  const inputCls = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";
  const labelCls = "text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2";
  const filterSelectCls = "w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl py-4 pl-10 pr-9 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white]";
  const textareaCls = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500 leading-relaxed";

  return (
    <div className="min-h-screen bg-[#060A14] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-[#0F1523] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 bg-blue-600 text-white rounded-xl shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500">
            <Building2 className="w-5 h-5" /> Partner Network
          </Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <Tags className="w-5 h-5 text-slate-500" /> Promo Manager
          </Link>
          <Link href="/admin/schedule" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <CalendarDays className="w-5 h-5 text-slate-500" /> Logistics Plan
          </Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar">
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B] p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Plane className="w-6 h-6 text-white rotate-45" />
            </div>
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Partner Network</h1>
            <p className="text-slate-400 font-medium mt-3 text-xs uppercase tracking-widest">
              {filteredAndSortedCompanies.length} of {totalPartners} partners shown
            </p>
          </div>
          <button
            onClick={() => { setModalTab("general"); setShowAddModal(true); }}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:translate-y-0"
          >
            <Plus className="w-5 h-5" /> Onboard New Partner
          </button>
        </header>

        {/* Metrics HUD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Total Network", value: totalPartners, color: "blue", Icon: Network },
            { label: "LTN Active", value: ltnCoverage, color: "emerald", Icon: Car },
            { label: "LHR Active", value: lhrCoverage, color: "indigo", Icon: PlaneTakeoff },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className={`relative bg-[#131A2B] p-8 rounded-[2rem] border border-${color}-900/30 hover:border-${color}-500/40 overflow-hidden shadow-xl transition-all cursor-default`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] text-${color}-400 mb-3 flex items-center gap-2`}>
                <Icon className="w-4 h-4" /> {label}
              </p>
              <p className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-md">{value}</p>
              <div className={`w-24 h-24 bg-${color}-500/5 rounded-full absolute -right-6 -bottom-6 blur-2xl`}></div>
            </div>
          ))}
        </div>

        {/* 🟢 NEW: MASTER PRICING ENGINE */}
        <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-[2rem] border border-blue-500/20 shadow-lg p-6 md:p-8 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Zap className="w-5 h-5 text-blue-400" /> Master Pricing Engine</h2>
              <p className="text-xs text-slate-400 mt-1 font-bold">Apply a global price modifier across ALL active operators instantly.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
                <button 
                  key={v} 
                  type="button"
                  onClick={() => masterUpdate(v)} 
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border ${v === 1 ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : v < 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'}`}
                >
                  {v === 1 ? 'RESET TO BASE' : `${v > 1 ? '+' : ''}${Math.round((v-1)*100)}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── SEARCH RIBBON ─────────────────────────────── */}
        <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-lg p-4 mb-10 flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10 pointer-events-none" />
            <input
              type="text"
              autoComplete="off"
              placeholder="Search partners by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl py-4 pl-12 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-700 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto shrink-0">
            <div className="relative group/sel">
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`${filterSelectCls} ${categoryFilter !== "ALL" ? "text-blue-400" : ""}`}
              >
                <option value="ALL">All Services</option>
                <option value="meet-greet">Meet & Greet</option>
                <option value="park-ride">Park & Ride</option>
                <option value="hotel">Hotel Parking</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
            </div>

            <div className="relative group/sel">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
              <select
                value={airportFilter}
                onChange={(e) => setAirportFilter(e.target.value)}
                className={`${filterSelectCls} ${airportFilter !== "ALL" ? "text-blue-400" : ""}`}
              >
                <option value="ALL">All Airports</option>
                <option value="LTN">Luton (LTN)</option>
                <option value="LHR">Heathrow (LHR)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
            </div>

            <div className="relative group/sel">
              <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`${filterSelectCls} ${statusFilter !== "ALL" ? "text-blue-400" : ""}`}
              >
                <option value="ALL">Any Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="OFFLINE">Offline</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sel:text-blue-400 transition-colors" />
            </div>

            {activeFilterCount > 0 ? (
              <button
                onClick={() => { setCategoryFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setSearchTerm(""); }}
                className="flex items-center justify-center gap-1.5 w-full bg-[#1A2235] border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
              >
                <X className="w-4 h-4" /> Clear
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 w-full bg-[#1A2235] border border-slate-700/50 text-slate-500 rounded-xl py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-50 cursor-not-allowed">
                <Filter className="w-4 h-4" /> Filters
              </div>
            )}
          </div>
        </div>

        {/* ── DATA TABLE ──────────────────────────────────────────────────── */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0F1523] border-b border-slate-800">
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-8 py-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                    Partner Profile <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} />
                  </th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-center">Modifier</th>
                  <th className="px-8 py-6 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("luton_price")}>
                    LTN Base Rate <SortIcon field="luton_price" sortBy={sortBy} sortOrder={sortOrder} />
                  </th>
                  <th className="px-8 py-6 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("heathrow_price")}>
                    LHR Base Rate <SortIcon field="heathrow_price" sortBy={sortBy} sortOrder={sortOrder} />
                  </th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAndSortedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center mb-6 bg-slate-900/50">
                          <Search className="w-10 h-10 text-slate-500" />
                        </div>
                        <p className="text-2xl font-black uppercase tracking-[0.3em] text-white">No Partners Match</p>
                        <p className="text-sm font-bold text-slate-400 mt-3">Adjust system filters to retrieve records.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCompanies.map((c) => (
                    <tr key={c.id} className={`transition-all group hover:bg-slate-800/30 ${!c.is_active ? "opacity-40 grayscale" : ""}`}>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-5">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 border border-slate-700/50 shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#1A2235] border border-slate-700/50 flex items-center justify-center font-black text-xl text-slate-400 shrink-0 shadow-sm group-hover:text-blue-500 group-hover:border-blue-500/50 transition-all">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors tracking-tight">{c.name}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {c.category?.replace("-", " ")}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-2">
                              {c.operates_at_luton && (
                                <span className={`flex items-center gap-1.5 ${c.ltn_featured ? "text-amber-400" : ""}`}>
                                  <Car className="w-3 h-3" /> ★ {getAvgRating(c.ltn_reviews)}
                                </span>
                              )}
                              {c.operates_at_heathrow && (
                                <span className={`flex items-center gap-1.5 ${c.lhr_featured ? "text-amber-400" : ""}`}>
                                  <PlaneTakeoff className="w-3 h-3" /> ★ {getAvgRating(c.lhr_reviews)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-7 text-center">
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

                      <td className="px-8 py-7 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm border ${
                          (c.price_modifier || 1) === 1 
                            ? 'border-slate-700 bg-slate-800 text-slate-400' 
                            : (c.price_modifier < 1 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400')
                        }`}>
                          <Zap className="w-3.5 h-3.5" /> 
                          {(c.price_modifier || 1) === 1 ? 'BASE' : `${c.price_modifier > 1 ? '+' : ''}${Math.round(((c.price_modifier || 1) - 1) * 100)}%`}
                        </div>
                      </td>

                      <td className="px-8 py-7 text-right">
                        {c.operates_at_luton ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-black text-white text-lg tracking-tighter tabular-nums">£{Number(c.luton_price || 0).toFixed(2)}</span>
                            {c.ltn_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-8 py-7 text-right">
                        {c.operates_at_heathrow ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-black text-white text-lg tracking-tighter tabular-nums">£{Number(c.heathrow_price || 0).toFixed(2)}</span>
                            {c.lhr_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-8 py-7 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => { setModalTab("general"); setEditingCompany(c); }} className="p-2.5 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Configure Partner">
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Delete Partner">
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] h-20 flex items-center justify-around px-5 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Live</span>
          </Link>
          <Link href="/admin/companies" className="flex flex-col items-center gap-1 text-blue-500 transition-all scale-110">
            <Building2 className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Ops</span>
          </Link>
          <div className="relative -top-8">
            <button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#0B1120] active:scale-95 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </button>
          </div>
          <Link href="/admin/schedule" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
            <CalendarDays className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Plan</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Exit</span>
          </button>
        </nav>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header & Tabs */}
            <div className="pt-8 px-8 border-b border-slate-800 bg-[#131A2B] shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {editingCompany ? "Configure Partner" : "Onboard Partner"}
                  </h2>
                  {editingCompany && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-blue-500" /> ID: {editingCompany.id?.substring(0, 8)}
                    </p>
                  )}
                </div>
                <button onClick={closeModal} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors border border-slate-700/50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-8 overflow-x-auto pb-px">
                {[
                  { key: "general", label: "General Info", Icon: Settings2 },
                  { key: "ltn", label: "Luton Ops", Icon: Car },
                  { key: "lhr", label: "Heathrow Ops", Icon: PlaneTakeoff },
                  { key: "terminals", label: "LHR Terminals", Icon: MapPin },
                  ...(editingCompany ? [{ key: "financials", label: "Invoices & Ledgers", Icon: FileText }] : []),
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

            {/* ── MODAL FORMS ──────────────── */}
            <div className="flex-1 overflow-y-auto">
              {modalTab !== "financials" ? (
                <form
                  onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany}
                  autoComplete="off"
                  className="h-full flex flex-col"
                >
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* TAB: GENERAL */}
                    {modalTab === "general" && (
                      <div className="space-y-8 text-white">
                        
                        {/* 🟢 NEW: INDIVIDUAL PRICE MODIFIER */}
                        <div className="bg-[#1A2235] p-6 rounded-2xl border border-slate-700/50">
                          <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400"/> Custom Price Modifier</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Adjust pricing for this specific operator.</p>
                          <div className="flex flex-wrap gap-2">
                            {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "price_modifier", v)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                  (getField(editingCompany, newCompany, "price_modifier") || 1.0) === v 
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                                    : 'bg-[#0F1523] text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-white'
                                }`}
                              >
                                {v === 1 ? 'BASE (0%)' : `${v > 1 ? '+' : ''}${Math.round((v-1)*100)}%`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={labelCls}>Brand Name</label>
                            <input required type="text" autoComplete="off"
                              value={getField(editingCompany, newCompany, "name") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "name", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          
                          <div className="bg-[#1A2235] p-6 rounded-2xl border border-slate-700/50 mb-8">
                            <h3 className="text-sm font-black text-white mb-4">Manage Badges</h3>
                            <div className="flex gap-2 mb-6">
                              <input id="new-badge-label" className={inputCls} placeholder="e.g. £10 FEE EXCLUDED" />
                              <select id="new-badge-cat" className="bg-[#0F1523] border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none">
                                <option value="General">General</option>
                                <option value="meet-greet">Meet & Greet</option>
                                <option value="park-ride">Park & Ride</option>
                                <option value="hotel">Hotel</option>
                              </select>
                              <button 
                                type="button"
                                onClick={() => {
                                  const label = (document.getElementById('new-badge-label') as HTMLInputElement).value;
                                  const category = (document.getElementById('new-badge-cat') as HTMLSelectElement).value;
                                  handleAddBadge(label, category);
                                  (document.getElementById('new-badge-label') as HTMLInputElement).value = '';
                                }}
                                className="bg-blue-600 px-6 rounded-xl text-white font-black hover:bg-blue-500 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(getField(editingCompany, newCompany, "badges") || []).map((b: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase shadow-sm">
                                  {b.label} <span className="opacity-50 text-[8px]">({b.category})</span>
                                  <button type="button" onClick={() => handleRemoveBadge(i)} className="hover:text-red-300">×</button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {editingCompany && ["APD", "Airport Parking Bay", "24/7 meet and greet", "24/7 Meet & Greet"].includes(editingCompany.name) && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mt-8 md:col-span-2">
                              <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4" /> Live Pricing Engine (Date Sets)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {pricingEngine.map((p, idx) => (
                                  <div key={idx} className="bg-[#0F1523] p-4 rounded-xl border border-slate-700 shadow-sm">
                                    <p className="text-blue-500 font-black text-sm mb-1">{p.PriceSet}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                      {p.StartDate} to {p.EndDate}
                                    </p>
                                    <p className="text-xl font-black text-white mt-2">£{p.StartingPrice || "0.00"}</p>
                                    <p className="text-[9px] text-slate-400 uppercase mt-1 tracking-widest">Starting Rate</p>
                                  </div>
                                ))}
                                {pricingEngine.length === 0 && (
                                  <p className="text-xs text-slate-500 italic col-span-3">Loading live pricing data...</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className={labelCls}>Service Category</label>
                            <div className="relative">
                              <select
                                value={getField(editingCompany, newCompany, "category") || ""}
                                onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "category", e.target.value)}
                                className={filterSelectCls}
                              >
                                <option value="meet-greet">Meet & Greet</option>
                                <option value="park-ride">Park & Ride</option>
                                <option value="hotel">Hotel Parking</option>
                              </select>
                              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className={labelCls}><ImageIcon className="w-3 h-3 inline mr-1 text-blue-500" /> Logo URL</label>
                            <input type="text" autoComplete="off" placeholder="https://..."
                              value={getField(editingCompany, newCompany, "logo_url") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "logo_url", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Percent className="w-3 h-3 inline mr-1 text-emerald-500" /> Commission Cut (%)</label>
                            <div className="relative">
                               <input required type="number" step="0.1" min="0" max="100"
                                 value={getField(editingCompany, newCompany, "commission_rate") || 0}
                                 onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "commission_rate", parseFloat(e.target.value) || 0)}
                                 className={`${inputCls} text-emerald-400 !text-xl`}
                               />
                            </div>
                            <div className="mt-2 mx-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                                style={{ width: `${Math.min(getField(editingCompany, newCompany, "commission_rate") || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80 mt-6">
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Dispatch Phone 1 (Primary)</label>
                            <input type="text" autoComplete="off" placeholder="07700..."
                              value={getField(editingCompany, newCompany, "phone_number") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Dispatch Phone 2 (Optional)</label>
                            <input type="text" autoComplete="off" placeholder="07700..."
                              value={getField(editingCompany, newCompany, "phone_number_2") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number_2", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80 mt-6">
                          <div className="space-y-2 md:col-span-2">
                            <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Physical Address</label>
                            <input type="text" autoComplete="off"
                              value={getField(editingCompany, newCompany, "address") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "address", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}>Postcode</label>
                            <input type="text" autoComplete="off"
                              value={getField(editingCompany, newCompany, "postcode") || ""}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "postcode", e.target.value)}
                              className={inputCls}
                            />
                          </div>
                        </div>
                        <div className="space-y-2 pt-4">
                          <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Google Map Embed URL (src only)</label>
                          <input type="text" autoComplete="off" placeholder="http://googleusercontent.com/maps.google.com/..."
                            value={getField(editingCompany, newCompany, "map_url") || ""}
                            onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "map_url", e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-800">
                          <label className={labelCls}><Code2 className="w-3.5 h-3.5 inline mr-1 text-blue-500" /> Marketing Overview (HTML Support)</label>
                          <textarea rows={4}
                            value={getField(editingCompany, newCompany, "overview") || ""}
                            onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "overview", e.target.value)}
                            className={textareaCls}
                            placeholder="Highlight key selling points..."
                          />
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-2">💡 Pro Tip: Use <br/> for line breaks and <b>Text</b> for bolding.</p>
                        </div>
                      </div>
                    )}

                    {/* TAB: TERMINALS */}
                    {modalTab === "terminals" && (
                      <div className="space-y-6 text-white">
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800 mb-6">
                          <h3 className="text-lg font-black text-white mb-2">Heathrow Terminal Maps & Addresses</h3>
                          <p className="text-xs text-slate-400">These details are dynamically injected into customer confirmation emails based on the terminal they select during checkout.</p>
                        </div>

                        {["T2", "T3", "T4", "T5"].map((term) => {
                          const tData = getField(editingCompany, newCompany, "terminal_data")?.[term] || defaultCompany.terminal_data[term as keyof typeof defaultCompany.terminal_data];
                          
                          return (
                            <div key={term} className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                              <h4 className="text-blue-400 font-black mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> {term} Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className={labelCls}>Meeting Address</label>
                                  <input type="text" className={inputCls} value={tData?.address || ""} onChange={(e) => updateTerminalField(term, "address", e.target.value)} placeholder="e.g. Terminal 2 Short Stay Car Park" />
                                </div>
                                <div className="space-y-2">
                                  <label className={labelCls}>Postcode</label>
                                  <input type="text" className={inputCls} value={tData?.postcode || ""} onChange={(e) => updateTerminalField(term, "postcode", e.target.value)} placeholder="e.g. TW6 1EW" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className={labelCls}>Google Maps Link (For Emails)</label>
                                  <input type="text" className={inputCls} value={tData?.map_url || ""} onChange={(e) => updateTerminalField(term, "map_url", e.target.value)} placeholder="https://maps.google.com/..." />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* TAB: LTN */}
                    {modalTab === "ltn" && (
                      <div className="space-y-8 text-white">
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1">
                              <p className="text-white font-black text-lg">Operates at Luton Airport?</p>
                              <p className="text-slate-500 text-xs mt-1">Enable to show in LTN search results.</p>
                            </div>
                            <input type="checkbox"
                              checked={!!getField(editingCompany, newCompany, "operates_at_luton")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_luton", e.target.checked)}
                              className="accent-blue-500 w-6 h-6 cursor-pointer"
                            />
                          </label>
                        </div>

                        {getField(editingCompany, newCompany, "operates_at_luton") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-800 pb-8">
                              <div className="space-y-2">
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />Day 1: Starting Price (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "luton_price") || 0}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "luton_price", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} !text-2xl text-blue-400`}
                                />
                              </div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_sold_out", !getField(editingCompany, newCompany, "ltn_sold_out"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out
                                </button>
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_featured", !getField(editingCompany, newCompany, "ltn_featured"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <Award className="w-3.5 h-3.5" /> Featured Provider
                                </button>
                              </div>
                            </div>

                            {/* 8-TIER SPREADSHEET INPUTS FOR LTN */}
                            <div className="pt-2">
                              <p className="text-sm font-black text-white mb-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Spreadsheet Pivot Points</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-5">Set exact TOTAL PRICE for these specific durations. Algorithm interpolates the rest.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: "Day 2 Total (£)", key: "ltn_day2_price" },
                                  { label: "Day 5 Total (£)", key: "ltn_day5_price" },
                                  { label: "Day 8 Total (£)", key: "ltn_day8_price" },
                                  { label: "Day 11 Total (£)", key: "ltn_day11_price" },
                                  { label: "Day 14 Total (£)", key: "ltn_day14_price" },
                                  { label: "Day 17 Total (£)", key: "ltn_day17_price" },
                                  { label: "Day 22 Total (£)", key: "ltn_day22_price" },
                                  { label: "Day 32 Total (£)", key: "ltn_day32_price" }
                                ].map(pivot => (
                                  <div key={pivot.key} className="space-y-2">
                                    <label className={labelCls}>{pivot.label}</label>
                                    <input type="number" step="0.01"
                                      value={getField(editingCompany, newCompany, pivot.key) || 0}
                                      onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)}
                                      className={`${inputCls} !py-3 !text-emerald-400`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-800 mt-6">
                              <div className="space-y-2">
                                <label className={labelCls}>Arrival Instructions (HTML Support)</label>
                                <textarea rows={5}
                                  value={getField(editingCompany, newCompany, "on_arrival_ltn") || ""}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_ltn", e.target.value)}
                                  className={textareaCls}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={labelCls}>Return Instructions (HTML Support)</label>
                                <textarea rows={5}
                                  value={getField(editingCompany, newCompany, "on_return_ltn") || ""}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_ltn", e.target.value)}
                                  className={textareaCls}
                                />
                              </div>
                            </div>
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-3">💡 Pro Tip: Use <br/> for line breaks to make instructions easier to read on mobile.</p>

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

                    {/* TAB: LHR */}
                    {modalTab === "lhr" && (
                      <div className="space-y-8 text-white">
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1">
                              <p className="text-white font-black text-lg">Operates at Heathrow Airport?</p>
                              <p className="text-slate-500 text-xs mt-1">Enable to show in LHR search results.</p>
                            </div>
                            <input type="checkbox"
                              checked={!!getField(editingCompany, newCompany, "operates_at_heathrow")}
                              onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_heathrow", e.target.checked)}
                              className="accent-purple-500 w-6 h-6 cursor-pointer"
                            />
                          </label>
                        </div>

                        {getField(editingCompany, newCompany, "operates_at_heathrow") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-800 pb-8">
                              <div className="space-y-2">
                                <label className={labelCls}><span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />Day 1: Starting Price (£)</label>
                                <input type="number" step="0.01"
                                  value={getField(editingCompany, newCompany, "heathrow_price") || 0}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "heathrow_price", parseFloat(e.target.value) || 0)}
                                  className={`${inputCls} !text-2xl text-purple-400`}
                                />
                              </div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_sold_out", !getField(editingCompany, newCompany, "lhr_sold_out"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out
                                </button>
                                <button type="button"
                                  onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_featured", !getField(editingCompany, newCompany, "lhr_featured"))}
                                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}
                                >
                                  <Award className="w-3.5 h-3.5" /> Featured Provider
                                </button>
                              </div>
                            </div>

                            {/* 8-TIER SPREADSHEET INPUTS FOR LHR */}
                            <div className="pt-2">
                              <p className="text-sm font-black text-white mb-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />Spreadsheet Pivot Points</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-5">Set exact TOTAL PRICE for these specific durations. Algorithm interpolates the rest.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: "Day 2 Total (£)", key: "lhr_day2_price" },
                                  { label: "Day 5 Total (£)", key: "lhr_day5_price" },
                                  { label: "Day 8 Total (£)", key: "lhr_day8_price" },
                                  { label: "Day 11 Total (£)", key: "lhr_day11_price" },
                                  { label: "Day 14 Total (£)", key: "lhr_day14_price" },
                                  { label: "Day 17 Total (£)", key: "lhr_day17_price" },
                                  { label: "Day 22 Total (£)", key: "lhr_day22_price" },
                                  { label: "Day 32 Total (£)", key: "lhr_day32_price" }
                                ].map(pivot => (
                                  <div key={pivot.key} className="space-y-2">
                                    <label className={labelCls}>{pivot.label}</label>
                                    <input type="number" step="0.01"
                                      value={getField(editingCompany, newCompany, pivot.key) || 0}
                                      onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)}
                                      className={`${inputCls} !py-3 !text-emerald-400`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-800 mt-6">
                              <div className="space-y-2">
                                <label className={labelCls}>Arrival Instructions (HTML Support)</label>
                                <textarea rows={5}
                                  value={getField(editingCompany, newCompany, "on_arrival_lhr") || ""}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_lhr", e.target.value)}
                                  className={textareaCls}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className={labelCls}>Return Instructions (HTML Support)</label>
                                <textarea rows={5}
                                  value={getField(editingCompany, newCompany, "on_return_lhr") || ""}
                                  onChange={(e) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_lhr", e.target.value)}
                                  className={textareaCls}
                                />
                              </div>
                            </div>
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-3">💡 Pro Tip: Use <br/> for line breaks to make instructions easier to read on mobile.</p>

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

                  {/* Save Footer */}
                  <div className="bg-[#131A2B] p-8 shrink-0 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                      {isSaving ? "Syncing Network..." : "Save & Deploy Partner"}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── FINANCIALS TAB (outside form) ────────────────────────── */
                <div className="p-8 space-y-8">
                  {fetchingFinancials ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                      <p className="font-black text-[10px] uppercase tracking-[0.3em]">Compiling Ledgers...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl">
                        <div>
                          <h3 className="text-emerald-400 font-black text-2xl tracking-tight">Partner Accounting</h3>
                          <p className="text-emerald-500/70 text-xs font-bold mt-1">{companyBookings.length} completed bookings</p>
                        </div>
                        <button
                          onClick={downloadInvoiceCSV}
                          className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                        >
                          <Download className="w-4 h-4" /> Export CSV Invoice
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                          { label: "Total Gross Collected", value: `£${calcGross().toFixed(2)}`, color: "white" },
                          { label: `Aero Cut (${editingCompany?.commission_rate || 15}%)`, value: `£${calcAeroCut().toFixed(2)}`, color: "text-blue-400" },
                          { label: "Payout Outstanding", value: `£${calcPayout().toFixed(2)}`, color: "text-emerald-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-[#1A2235] p-8 rounded-3xl border border-slate-700/50">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</p>
                            <p className={`text-3xl font-black tracking-tighter tabular-nums ${color}`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border border-slate-800 rounded-3xl overflow-hidden bg-[#131A2B]">
                        <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Ledger History</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <th className="px-8 py-5">Reference</th>
                                <th className="px-8 py-5">Type</th>
                                <th className="px-8 py-5">Gross Paid</th>
                                <th className="px-8 py-5">Aero Fee</th>
                                <th className="px-8 py-5">Partner Clear</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {companyBookings.slice(0, 15).map((b) => {
                                const gross = Number(b.total_price || 0);
                                const aeroCut = gross * ((editingCompany?.commission_rate || 15) / 100);
                                return (
                                  <tr key={b.id} className="hover:bg-white/[0.02]">
                                    <td className="px-8 py-4 text-xs font-bold text-white">{b.booking_ref}</td>
                                    <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{b.service_type || 'Meet & Greet'}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-slate-400">£{gross.toFixed(2)}</td>
                                    <td className="px-8 py-4 text-xs font-bold text-blue-400">£{aeroCut.toFixed(2)}</td>
                                    <td className="px-8 py-4 text-xs font-black text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              {companyBookings.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-xs font-bold">No completed bookings found.</td></tr>
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
    </div>
  );
}

// ─── REVIEW SECTION COMPONENT ────────────────────────────────────────────────
function ReviewSection({
  airport, color, reviews, onAdd, onRemove, onUpdate
}: {
  airport: "ltn" | "lhr";
  color: "blue" | "purple";
  reviews: Review[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, field: keyof Review, value: any) => void;
}) {
  const accent = color === "blue" ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500";
  const ring = color === "blue" ? "focus:ring-blue-500/50" : "focus:ring-purple-500/50";
  
  return (
    <div className="pt-8 border-t border-slate-800 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-black text-xl uppercase tracking-widest">
          {airport.toUpperCase()} Reviews <span className="text-slate-600 ml-2">({reviews.length})</span>
        </h3>
        <button type="button" onClick={onAdd} className={`px-5 py-3 ${accent} text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg`}>
          + Add Review
        </button>
      </div>
      
      <div className="space-y-6">
        {reviews.map((rev, idx) => (
          <div key={rev.id} className="bg-[#0F1523] p-6 rounded-2xl border border-slate-700/50 relative shadow-sm">
            <button type="button" onClick={() => onRemove(idx)} className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-10">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Author</label>
                <input value={rev.author || ""} onChange={(e) => onUpdate(idx, "author", e.target.value)} className={`w-full bg-[#1A2235] rounded-xl px-4 py-3 text-sm font-bold text-white border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all`} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Rating</label>
                <div className="relative">
                  <select value={rev.rating || 5} onChange={(e) => onUpdate(idx, "rating", parseInt(e.target.value) || 5)} className={`w-full appearance-none bg-[#1A2235] rounded-xl px-4 py-3 text-sm font-bold text-amber-400 border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all cursor-pointer`}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Source</label>
                <div className="relative">
                  <select value={rev.source || "Trustpilot"} onChange={(e) => onUpdate(idx, "source", e.target.value)} className={`w-full appearance-none bg-[#1A2235] rounded-xl px-4 py-3 text-sm font-bold text-white border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all cursor-pointer`}>
                    <option value="Trustpilot">Trustpilot</option>
                    <option value="Google">Google</option>
                    <option value="Internal">Internal</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Date</label>
                <input type="date" value={rev.date || ""} onChange={(e) => onUpdate(idx, "date", e.target.value)} className={`w-full bg-[#1A2235] rounded-xl px-4 py-3 text-sm font-bold text-white border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all cursor-pointer`} />
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Comment</label>
              <textarea value={rev.comment || ""} onChange={(e) => onUpdate(idx, "comment", e.target.value)} className={`w-full bg-[#1A2235] rounded-xl px-4 py-3 text-sm font-bold text-white border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all resize-none leading-relaxed`} rows={3} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer w-fit group">
              <input type="checkbox" checked={!!rev.verified} onChange={(e) => onUpdate(idx, "verified", e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-[#1A2235] accent-emerald-500 cursor-pointer" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Mark as Verified Booking</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}