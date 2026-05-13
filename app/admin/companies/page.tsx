"use client";

/**
 * AeroPark Direct - Partner Network v7.0 (SaaS 2.0 Master Edition)
 * ------------------------------------------------------
 * FEATURES:
 * - Dynamic Pricing Tiers (Base Rate + Tier 1 + Tier 2 Math Controllers)
 * - Complex Partner Profile Management (LTN & LHR splits)
 * - Dynamic Financial Ledger & Commission Auto-Calculator
 * - 1-Click Month-End CSV Invoice Generation
 * - Anti-Autofill CSS Protections (No White Boxes)
 * - Modern Frosted-Glass UI & Custom Dropdowns
 * - Multi-Tab Editing Interface
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Plus, Save, Car, CheckCircle2, XCircle, 
  Loader2, X, Trash2, MapPin, PlaneTakeoff, 
  Settings2, LayoutDashboard, Building2, CalendarDays, 
  LogOut, Plane, Network, Filter, MessageSquare, 
  Percent, Image as ImageIcon, SlidersHorizontal, 
  ArrowUpDown, Award, AlertOctagon, FileText, 
  Download, Banknote, ChevronDown, AlertCircle
} from "lucide-react";

interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  
  // --- 1. CORE STATE ---
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- 2. ADVANCED SEARCH & FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // --- 3. MODAL STATES ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [modalTab, setModalTab] = useState<"general" | "ltn" | "lhr" | "financials">("general");

  // --- 4. FINANCIALS STATE ---
  const [companyBookings, setCompanyBookings] = useState<any[]>([]);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);

  // 🟢 FIXED: Added the Tier pricing to the default state
  const defaultCompany = {
    name: "",
    category: "meet-greet",
    luton_price: 0,
    heathrow_price: 0,
    tier1_extra_rate: 1.99, // Days 2 to 6
    tier2_extra_rate: 2.99, // Days 7+
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
    phone_number: "07700 900 123",
    map_location: "Terminal Forecourt",
    on_arrival_lhr: "",
    on_arrival_ltn: "",
    on_return_lhr: "",
    on_return_ltn: "",
    address: "",
    postcode: "",
    ltn_reviews: [] as Review[],
    lhr_reviews: [] as Review[]
  };
  
  const [newCompany, setNewCompany] = useState(defaultCompany);

  // --- 5. INITIALIZATION & SYNC ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchCompanies();
    };
    checkAuth();
  }, [router]);

  // Fetch Financials dynamically only when the Financials tab is opened
  useEffect(() => {
    if (modalTab === "financials" && editingCompany?.id) {
      fetchFinancials(editingCompany.id);
    }
  }, [modalTab, editingCompany]);

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*').order("name", { ascending: true });
    if (data) setCompanies(data);
    if (error) console.error("Error fetching companies:", error);
    setLoading(false);
  }

  async function fetchFinancials(companyId: string) {
    setFetchingFinancials(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });
    
    if (data) setCompanyBookings(data);
    if (error) console.error("Error fetching financials:", error);
    setFetchingFinancials(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    router.push("/admin/login");
  };

  // --- 6. CRUD OPERATIONS ---
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('companies').insert([newCompany]);
      if (error) throw error;
      setShowAddModal(false);
      setNewCompany(defaultCompany);
      await fetchCompanies();
    } catch (error: any) {
      alert("Error adding partner: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ CRITICAL: Are you sure? This will permanently delete the partner profile.")) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      setCompanies(companies.filter(c => c.id !== id));
    } catch (error: any) {
      alert("Error deleting partner: " + error.message);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('companies').update(editingCompany).eq('id', editingCompany.id);
      if (error) throw error;
      setEditingCompany(null);
      await fetchCompanies();
    } catch (error: any) {
      alert("Error updating partner: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (company: any) => {
    const newVal = !company.is_active;
    setCompanies(companies.map(c => c.id === company.id ? {...c, is_active: newVal} : c));
    await supabase.from('companies').update({ is_active: newVal }).eq('id', company.id);
  };

  // --- 7. EXPORT INVOICE ENGINE ---
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
    csv += `Booking Ref,Customer,Drop-off,Pick-up,Gross (£),Aero Fee (£),Partner Payout (£)\n`;

    companyBookings.forEach(b => {
      const gross = Number(b.total_price || 0);
      const aeroFee = gross * commRate;
      const partnerCut = gross - aeroFee;

      totalGross += gross;
      totalAero += aeroFee;
      totalPartner += partnerCut;

      csv += `${b.booking_ref},${b.full_name},${b.dropoff_date},${b.pickup_date},${gross.toFixed(2)},${aeroFee.toFixed(2)},${partnerCut.toFixed(2)}\n`;
    });

    csv += `\nTOTALS,,,,${totalGross.toFixed(2)},${totalAero.toFixed(2)},${totalPartner.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${editingCompany.name.replace(/\s+/g, '_')}_Statement.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- 8. FILTER ENGINE ---
  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...companies];
    if (searchTerm) result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== "ALL") {
      const target = categoryFilter === "MEET_GREET" ? "meet" : categoryFilter === "PARK_RIDE" ? "park" : "hotel";
      result = result.filter(c => (c.category?.toLowerCase() || "").includes(target));
    }
    if (airportFilter === "LTN") result = result.filter(c => c.operates_at_luton);
    if (airportFilter === "LHR") result = result.filter(c => c.operates_at_heathrow);
    if (statusFilter === "ACTIVE") result = result.filter(c => c.is_active);
    if (statusFilter === "OFFLINE") result = result.filter(c => !c.is_active);

    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === "luton_price" || sortBy === "heathrow_price" || sortBy === "commission_rate") {
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

  const totalPartners = companies.length;
  const ltnCoverage = companies.filter(c => c.operates_at_luton && c.is_active).length;
  const lhrCoverage = companies.filter(c => c.operates_at_heathrow && c.is_active).length;

  // --- 9. REVIEW HANDLERS ---
  const addReview = (airportCode: 'ltn' | 'lhr') => {
    const rev: Review = { id: Date.now(), author: "Customer Name", rating: 5, comment: "Write review here...", date: new Date().toLocaleDateString() };
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    if (editingCompany) setEditingCompany({...editingCompany, [key]: [...(editingCompany[key] || []), rev]});
    else setNewCompany({...newCompany, [key]: [...(newCompany[key] || []), rev]});
  };

  const removeReview = (airportCode: 'ltn' | 'lhr', index: number) => {
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])]; updated.splice(index, 1);
      setEditingCompany({...editingCompany, [key]: updated});
    } else {
      const updated = [...(newCompany[key] || [])]; updated.splice(index, 1);
      setNewCompany({...newCompany, [key]: updated});
    }
  };

  const updateReview = (airportCode: 'ltn' | 'lhr', index: number, field: keyof Review, value: any) => {
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])]; updated[index] = { ...updated[index], [field]: value };
      setEditingCompany({...editingCompany, [key]: updated});
    } else {
      const updated = [...(newCompany[key] || [])]; updated[index] = { ...updated[index], [field]: value };
      setNewCompany({...newCompany, [key]: updated});
    }
  };

  const getAvgRating = (reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return "New";
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return avg.toFixed(1);
  };

  // --- 10. FINANCIAL HELPERS ---
  const calcGross = () => companyBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const calcAeroCut = () => calcGross() * (Number(editingCompany?.commission_rate || 15) / 100);
  const calcPayout = () => calcGross() - calcAeroCut();

  if (loading) return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Syncing Partner Network...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">
      
      {/* SIDEBAR NAVIGATION (DESKTOP) */}
      <aside className="w-full md:w-64 bg-[#0B1121] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-white/5 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-7 h-7 text-blue-500 rotate-45" />
          <span className="font-black text-2xl tracking-tighter uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        
        <nav className="px-4 space-y-2 flex-grow mt-6 font-bold">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-2xl transition-all"><LayoutDashboard className="w-5 h-5" /> Live Board</Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl transition-all shadow-[inset_0_0_15px_rgba(37,99,235,0.1)]"><Building2 className="w-5 h-5" /> Partner Network</Link>
          <Link href="/admin/schedule" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-2xl transition-all"><CalendarDays className="w-5 h-5" /> Logistics Plan</Link>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-2xl border border-white/5">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10 custom-scrollbar">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a]/80 backdrop-blur-xl p-5 rounded-3xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Plane className="w-6 h-6 text-white rotate-45" /></div> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-white/5 rounded-xl text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>

        {/* HEADER & ACTION BUTTONS */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Partner Network</h1>
            <p className="text-slate-400 font-medium mt-3 text-sm uppercase tracking-widest flex items-center gap-2">
              Manage availability, pricing, and integrations.
            </p>
          </div>
          <button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] hover:-translate-y-1">
            <Plus className="w-6 h-6" /> Onboard New Partner
          </button>
        </header>

        {/* METRICS HUD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-blue-900/30 flex items-center justify-between shadow-2xl group hover:border-blue-500/50 transition-all cursor-default">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Total Network</p>
              <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{totalPartners}</p>
            </div>
            <Network className="w-14 h-14 text-blue-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-emerald-900/30 flex items-center justify-between shadow-2xl group hover:border-emerald-500/50 transition-all cursor-default">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">LTN Coverage</p>
              <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{ltnCoverage}</p>
            </div>
            <Car className="w-14 h-14 text-emerald-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>
          <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-purple-900/30 flex items-center justify-between shadow-2xl group hover:border-purple-500/50 transition-all cursor-default">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-2">LHR Coverage</p>
              <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{lhrCoverage}</p>
            </div>
            <PlaneTakeoff className="w-14 h-14 text-purple-500/5 absolute -right-2 -bottom-2 group-hover:scale-125 transition-transform" />
          </div>
        </div>

        {/* 🟢 ADVANCED FROSTED FILTER RIBBON */}
        <div className="bg-[#0f172a]/95 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-3 mb-10 flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search brands..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full !bg-[#0B1121] border border-transparent hover:border-white/5 rounded-[2rem] py-5 pl-14 pr-6 text-sm font-bold !text-white outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" 
            />
          </div>
          
          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full xl:w-auto shrink-0 pr-2">
            <div className="relative group/sel">
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 transition-colors group-hover/sel:text-white" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-transparent hover:border-white/10 rounded-2xl py-4.5 pl-11 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-inner focus:ring-1 focus:ring-blue-500/50">
                <option value="ALL" className="bg-[#0B1121] text-white font-bold">All Categories</option>
                <option value="MEET_GREET" className="bg-[#0B1121] text-white font-bold">Meet & Greet</option>
                <option value="PARK_RIDE" className="bg-[#0B1121] text-white font-bold">Park & Ride</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
            </div>
            
            <div className="relative group/sel">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 transition-colors group-hover/sel:text-white" />
              <select value={airportFilter} onChange={(e) => setAirportFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-transparent hover:border-white/10 rounded-2xl py-4.5 pl-11 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-inner focus:ring-1 focus:ring-blue-500/50">
                <option value="ALL" className="bg-[#0B1121] text-white font-bold">All Airports</option>
                <option value="LTN" className="bg-[#0B1121] text-white font-bold">Luton Only</option>
                <option value="LHR" className="bg-[#0B1121] text-white font-bold">Heathrow Only</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
            </div>

            <div className="relative group/sel">
              <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 transition-colors group-hover/sel:text-white" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-transparent hover:border-white/10 rounded-2xl py-4.5 pl-11 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-inner focus:ring-1 focus:ring-blue-500/50">
                <option value="ALL" className="bg-[#0B1121] text-white font-bold">All Statuses</option>
                <option value="ACTIVE" className="bg-[#0B1121] text-white font-bold">Active Only</option>
                <option value="OFFLINE" className="bg-[#0B1121] text-white font-bold">Offline</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* 🟢 ADVANCED DATA TABLE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800/80 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col mx-2 md:mx-0 mb-20">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B1121] border-b border-slate-800">
                <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                  <th className="px-10 py-7 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('name')}>
                    Partner Details <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-10 py-7 text-center">Status</th>
                  <th className="px-10 py-7 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('commission_rate')}>
                    Commission <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-10 py-7 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('luton_price')}>
                    LTN Rate <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-10 py-7 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('heathrow_price')}>
                    LHR Rate <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-10 py-7 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredAndSortedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center text-slate-500 font-bold">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center animate-pulse"><Search className="w-10 h-10 text-slate-700" /></div>
                        <p className="text-xl font-black uppercase tracking-[0.3em] mt-8 text-white">No Partners Match</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCompanies.map((c) => (
                    <tr key={c.id} className={`transition-all group hover:bg-blue-600/[0.02] ${c.is_active ? '' : 'opacity-40 grayscale'}`}>
                      
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-14 h-14 rounded-2xl object-contain bg-white p-1.5 border border-white/5 shrink-0 shadow-lg" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all shadow-xl shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-black text-white text-lg leading-tight mb-2 group-hover:text-blue-400 transition-colors tracking-tighter">{c.name}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-blue-500 tracking-widest uppercase bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10">{c.category?.replace('-', ' ')}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 mt-2">
                              {c.operates_at_luton && (
                                <span className={`flex items-center gap-1.5 ${c.ltn_featured ? 'text-amber-400' : ''}`}>
                                  <Car className="w-3.5 h-3.5"/> ★ {getAvgRating(c.ltn_reviews)}
                                </span>
                              )}
                              {c.operates_at_heathrow && (
                                <span className={`flex items-center gap-1.5 ${c.lhr_featured ? 'text-amber-400' : ''}`}>
                                  <PlaneTakeoff className="w-3.5 h-3.5"/> ★ {getAvgRating(c.lhr_reviews)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-10 py-8 text-center">
                        <button onClick={() => handleToggleActive(c)} className={`px-4 py-2 rounded-lg text-[9px] tracking-[0.2em] font-black border uppercase transition-all ${c.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                          {c.is_active ? 'Active' : 'Offline'}
                        </button>
                      </td>
                      
                      <td className="px-10 py-8">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-black shadow-sm">
                          <Percent className="w-3.5 h-3.5"/> {c.commission_rate || 15}%
                        </div>
                      </td>

                      <td className="px-10 py-8 text-right">
                        {c.operates_at_luton ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-black text-white text-xl tracking-tighter tabular-nums">£{Number(c.luton_price || 0).toFixed(2)}</span>
                            {c.ltn_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded-md">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-10 py-8 text-right">
                        {c.operates_at_heathrow ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="font-black text-white text-xl tracking-tighter tabular-nums">£{Number(c.heathrow_price || 0).toFixed(2)}</span>
                            {c.lhr_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded-md">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all transform translate-x-6 group-hover:translate-x-0">
                          <button onClick={() => {setModalTab("general"); setEditingCompany(c);}} className="p-3 bg-white/5 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"><Settings2 className="w-5 h-5" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-3 bg-white/5 text-slate-600 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"><Trash2 className="w-5 h-5" /></button>
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

      {/* MOBILE NAV (REDUNDANT BUT NECESSARY FOR MASTER DESIGN) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] h-20 flex items-center justify-around px-5 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center gap-1.5 text-slate-500 transition-all"><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-tighter">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1.5 text-blue-500 scale-110"><Building2 className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-tighter">Ops</span></Link>
          <div className="relative -top-12"><button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-20 h-20 bg-blue-600 rounded-[2.8rem] flex items-center justify-center shadow-[0_20px_50px_-5px_rgba(37,99,235,0.7)] border-[10px] border-[#0B1121] active:scale-90 transition-all"><Plus className="w-10 h-10 text-white font-black" /></button></div>
          <Link href="/admin/schedule" className="flex flex-col items-center justify-center gap-1.5 text-slate-500"><CalendarDays className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-tighter">Plan</span></Link>
          <button onClick={() => router.push("/admin/login")} className="flex flex-col items-center justify-center gap-1.5 text-slate-500"><LogOut className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-tighter">Exit</span></button>
        </nav>
      </div>

      {/* 🟢 TABBED MODAL SECTION (ADD & EDIT) */}
      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#0B1121]/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-5xl rounded-[3.5rem] max-h-[95vh] flex flex-col shadow-[0_100px_200px_-20px_rgba(0,0,0,0.85)] overflow-hidden animate-in zoom-in-95 duration-500">
            
            {/* Modal Header & Tabs */}
            <div className="pt-12 px-12 border-b border-white/5 bg-slate-900/40 z-10 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">{editingCompany ? `Configure Partner` : 'Onboard Partner'}</h2>
                  {editingCompany && <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mt-3">ID: {editingCompany.id.substring(0,8)}</p>}
                </div>
                <button onClick={() => {setEditingCompany(null); setShowAddModal(false);}} className="p-4 bg-white/5 rounded-3xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-all border border-white/5 shadow-inner"><X className="w-8 h-8"/></button>
              </div>
              
              <div className="flex gap-10 overflow-x-auto no-scrollbar pb-[-1px]">
                <button onClick={() => setModalTab("general")} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 transition-colors whitespace-nowrap ${modalTab === "general" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>General Info</button>
                <button onClick={() => setModalTab("ltn")} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${modalTab === "ltn" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}><Car className="w-4 h-4"/> Luton Ops</button>
                <button onClick={() => setModalTab("lhr")} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${modalTab === "lhr" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}><PlaneTakeoff className="w-4 h-4"/> Heathrow Ops</button>
                {editingCompany && (
                  <button onClick={() => setModalTab("financials")} className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${modalTab === "financials" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><FileText className="w-4 h-4"/> Invoices & Ledgers</button>
                )}
              </div>
            </div>
            
            <form onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany} autoComplete="off" className="flex-1 overflow-y-auto custom-scrollbar p-12 relative">
              
              {/* TAB 1: GENERAL */}
              {modalTab === "general" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2">Brand Name</label>
                      <input required type="text" autoComplete="off" value={editingCompany ? (editingCompany.name || "") : newCompany.name} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, name: e.target.value}) : setNewCompany({...newCompany, name: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.5rem] px-6 py-5 !text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white] transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2">Service Category</label>
                      <div className="relative">
                        <select value={editingCompany ? (editingCompany.category || "") : newCompany.category} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, category: e.target.value}) : setNewCompany({...newCompany, category: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.5rem] px-6 py-5 !text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all">
                          <option value="meet-greet">Meet & Greet</option>
                          <option value="park-ride">Park & Ride</option>
                          <option value="hotel">Hotel & Parking</option>
                        </select>
                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 flex items-center gap-2 tracking-widest"><ImageIcon className="w-3.5 h-3.5"/> Logo URL</label>
                      <input type="text" autoComplete="off" placeholder="https://..." value={editingCompany ? (editingCompany.logo_url || "") : newCompany.logo_url} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, logo_url: e.target.value}) : setNewCompany({...newCompany, logo_url: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.5rem] px-6 py-5 !text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white] transition-all" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 flex items-center gap-2 tracking-widest"><Percent className="w-3.5 h-3.5"/> Commission Cut (%)</label>
                      <input required type="number" step="0.1" value={editingCompany ? (editingCompany.commission_rate ?? 15) : newCompany.commission_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, commission_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, commission_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-transparent rounded-[1.5rem] px-6 py-5 !text-emerald-400 text-xl font-black outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:rgb(52,211,153)] transition-all" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest">Marketing Overview (Shown to Customers)</label>
                    <textarea rows={4} value={editingCompany ? (editingCompany.overview || "") : newCompany.overview} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, overview: e.target.value}) : setNewCompany({...newCompany, overview: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 hover:border-white/10 rounded-[1.5rem] px-6 py-5 !text-white text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="Highlight key selling points here..."/>
                  </div>
                </div>
              )}

              {/* TAB 2: LUTON */}
              {modalTab === "ltn" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-[#0B1121] p-10 rounded-[2.5rem] border border-white/5">
                    <label className="flex items-center gap-8 cursor-pointer">
                      <div className="flex-1">
                        <p className="text-white font-black text-xl">Operates at Luton Airport?</p>
                        <p className="text-slate-500 text-sm mt-2">Enable to show this partner in LTN search results.</p>
                      </div>
                      <input type="checkbox" checked={editingCompany?.operates_at_luton ?? newCompany.operates_at_luton} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_luton: e.target.checked}) : setNewCompany({...newCompany, operates_at_luton: e.target.checked})} className="accent-blue-500 w-8 h-8 cursor-pointer" />
                    </label>
                  </div>

                  {(editingCompany?.operates_at_luton || newCompany.operates_at_luton) && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Day 1: Base Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.luton_price || "") : newCompany.luton_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-3xl font-black outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="flex flex-col gap-4 pt-8">
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_sold_out: !editingCompany.ltn_sold_out}) : setNewCompany({...newCompany, ltn_sold_out: !newCompany.ltn_sold_out})} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-3 ${editingCompany?.ltn_sold_out || newCompany.ltn_sold_out ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#0B1121] text-slate-500 border-white/5 hover:border-white/10'}`}><AlertOctagon className="w-4 h-4"/> Mark Sold Out</button>
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_featured: !editingCompany.ltn_featured}) : setNewCompany({...newCompany, ltn_featured: !newCompany.ltn_featured})} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-3 ${editingCompany?.ltn_featured || newCompany.ltn_featured ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-[#0B1121] text-slate-500 border-white/5 hover:border-white/10'}`}><Award className="w-4 h-4"/> Highlight as Featured</button>
                        </div>
                      </div>

                      {/* 🟢 NEW: Pricing Tiers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Days 2 - 6: Extra Day Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.tier1_extra_rate ?? 1.99) : newCompany.tier1_extra_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, tier1_extra_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, tier1_extra_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Days 7+: Extra Day Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.tier2_extra_rate ?? 2.99) : newCompany.tier2_extra_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, tier2_extra_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, tier2_extra_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-xl font-bold outline-none focus:ring-2 focus:ring-amber-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest">Arrival Instructions (Email)</label>
                          <textarea rows={6} value={editingCompany ? (editingCompany.on_arrival_ltn || "") : newCompany.on_arrival_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_ltn: e.target.value}) : setNewCompany({...newCompany, on_arrival_ltn: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 text-sm !text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest">Return Instructions (Email)</label>
                          <textarea rows={6} value={editingCompany ? (editingCompany.on_return_ltn || "") : newCompany.on_return_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_ltn: e.target.value}) : setNewCompany({...newCompany, on_return_ltn: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 text-sm !text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed" />
                        </div>
                      </div>

                      <div className="pt-10 border-t border-white/5">
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-white font-black text-2xl">Customer Reviews (LTN)</h3>
                          <button type="button" onClick={() => addReview('ltn')} className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-colors">+ Add Review</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {(editingCompany?.ltn_reviews || newCompany.ltn_reviews || []).map((rev: any, idx: number) => (
                            <div key={rev.id} className="bg-[#0B1121] p-8 rounded-[2rem] border border-white/5 relative group">
                              <button type="button" onClick={() => removeReview('ltn', idx)} className="absolute top-8 right-8 text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                              <div className="flex gap-6 mb-6 pr-12">
                                <input value={rev.author} onChange={(e) => updateReview('ltn', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 !text-white text-lg font-bold outline-none focus:border-blue-500 pb-2" placeholder="Author Name" />
                                <div className="relative w-1/2">
                                  <select value={rev.rating} onChange={(e) => updateReview('ltn', idx, 'rating', parseInt(e.target.value))} className="w-full appearance-none !bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-4 text-sm !text-amber-400 font-bold outline-none cursor-pointer hover:border-blue-500/50 transition-all">
                                    <option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option>
                                  </select>
                                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <textarea value={rev.comment} onChange={(e) => updateReview('ltn', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-400 text-sm outline-none resize-none leading-relaxed" rows={2} placeholder="Customer comment..." />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: HEATHROW */}
              {modalTab === "lhr" && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-[#0B1121] p-10 rounded-[2.5rem] border border-slate-800">
                    <label className="flex items-center gap-8 cursor-pointer">
                      <div className="flex-1">
                        <p className="text-white font-black text-xl">Operates at Heathrow Airport?</p>
                        <p className="text-slate-500 text-sm mt-2">Enable to show this partner in LHR search results.</p>
                      </div>
                      <input type="checkbox" checked={editingCompany?.operates_at_heathrow ?? newCompany.operates_at_heathrow} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_heathrow: e.target.checked}) : setNewCompany({...newCompany, operates_at_heathrow: e.target.checked})} className="accent-blue-500 w-8 h-8 cursor-pointer" />
                    </label>
                  </div>

                  {(editingCompany?.operates_at_heathrow || newCompany.operates_at_heathrow) && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1 tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block mr-2"></div> Day 1: Base Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.heathrow_price || "") : newCompany.heathrow_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-3xl font-black outline-none focus:ring-2 focus:ring-purple-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="flex flex-col gap-4 pt-8">
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_sold_out: !editingCompany.lhr_sold_out}) : setNewCompany({...newCompany, lhr_sold_out: !newCompany.lhr_sold_out})} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-3 ${editingCompany?.lhr_sold_out || newCompany.lhr_sold_out ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#0B1121] text-slate-500 border-white/5 hover:border-white/10'}`}><AlertOctagon className="w-4 h-4"/> Mark Sold Out</button>
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_featured: !editingCompany.lhr_featured}) : setNewCompany({...newCompany, lhr_featured: !newCompany.lhr_featured})} className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-3 ${editingCompany?.lhr_featured || newCompany.lhr_featured ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-[#0B1121] text-slate-500 border-white/5 hover:border-white/10'}`}><Award className="w-4 h-4"/> Highlight as Featured</button>
                        </div>
                      </div>

                      {/* 🟢 NEW: Pricing Tiers for LHR (Shared columns with LTN) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Days 2 - 6: Extra Day Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.tier1_extra_rate ?? 1.99) : newCompany.tier1_extra_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, tier1_extra_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, tier1_extra_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block ml-2 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Days 7+: Extra Day Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.tier2_extra_rate ?? 2.99) : newCompany.tier2_extra_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, tier2_extra_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, tier2_extra_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 !text-white text-xl font-bold outline-none focus:ring-2 focus:ring-amber-500/50 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1 tracking-widest">Arrival Instructions (Email)</label>
                          <textarea rows={6} value={editingCompany ? (editingCompany.on_arrival_lhr || "") : newCompany.on_arrival_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_lhr: e.target.value}) : setNewCompany({...newCompany, on_arrival_lhr: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 text-sm !text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 ml-1 tracking-widest">Return Instructions (Email)</label>
                          <textarea rows={6} value={editingCompany ? (editingCompany.on_return_lhr || "") : newCompany.on_return_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_lhr: e.target.value}) : setNewCompany({...newCompany, on_return_lhr: e.target.value})} className="w-full !bg-[#0B1121] border border-white/5 rounded-[1.5rem] px-6 py-5 text-sm !text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed" />
                        </div>
                      </div>

                      <div className="pt-10 border-t border-white/5">
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-white font-black text-2xl">Customer Reviews (LHR)</h3>
                          <button type="button" onClick={() => addReview('lhr')} className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-colors">+ Add Review</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {(editingCompany?.lhr_reviews || newCompany.lhr_reviews || []).map((rev: any, idx: number) => (
                            <div key={rev.id} className="bg-[#0B1121] p-8 rounded-[2rem] border border-white/5 relative group">
                              <button type="button" onClick={() => removeReview('lhr', idx)} className="absolute top-8 right-8 text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                              <div className="flex gap-6 mb-6 pr-12">
                                <input value={rev.author} onChange={(e) => updateReview('lhr', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 !text-white text-lg font-bold outline-none focus:border-purple-500 pb-2" placeholder="Author Name" />
                                <div className="relative w-1/2">
                                  <select value={rev.rating} onChange={(e) => updateReview('lhr', idx, 'rating', parseInt(e.target.value))} className="w-full appearance-none !bg-[#0f172a] border border-slate-700 rounded-xl px-5 py-4 text-sm !text-amber-400 font-bold outline-none cursor-pointer hover:border-purple-500/50 transition-all">
                                    <option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option>
                                  </select>
                                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <textarea value={rev.comment} onChange={(e) => updateReview('lhr', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-400 text-sm outline-none resize-none leading-relaxed" rows={2} placeholder="Customer comment..." />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 🟢 TAB 4: FINANCIALS */}
              {modalTab === "financials" && editingCompany && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                  {fetchingFinancials ? (
                    <div className="py-32 flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-12 h-12 animate-spin mb-6 text-emerald-500" />
                      <p className="font-black text-xs uppercase tracking-[0.3em]">Compiling Ledgers...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[2.5rem]">
                        <div>
                          <h3 className="text-emerald-400 font-black text-3xl tracking-tight">Partner Accounting</h3>
                          <p className="text-emerald-500/70 text-sm font-bold mt-2">Based on {companyBookings.length} fully completed bookings.</p>
                        </div>
                        <button type="button" onClick={downloadInvoiceCSV} className="w-full sm:w-auto px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20 hover:-translate-y-0.5 active:translate-y-0">
                          <Download className="w-5 h-5"/> Generate Invoice
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="bg-[#0B1121] p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Total Gross Collected</p>
                          <p className="text-5xl font-black text-white tracking-tighter tabular-nums">£{calcGross().toFixed(2)}</p>
                        </div>
                        <div className="bg-[#0B1121] p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Aero Cut ({editingCompany.commission_rate || 15}%)</p>
                          <p className="text-5xl font-black text-blue-400 tracking-tighter tabular-nums">£{calcAeroCut().toFixed(2)}</p>
                        </div>
                        <div className="bg-[#0B1121] p-10 rounded-[2.5rem] border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-3">Payout Outstanding</p>
                          <p className="text-5xl font-black text-emerald-400 tracking-tighter tabular-nums">£{calcPayout().toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-[#0B1121] shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-slate-900/50">
                          <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Recent Booking Ledger</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                                <th className="px-10 py-6">Reference</th>
                                <th className="px-10 py-6">Gross Paid</th>
                                <th className="px-10 py-6">Aero Commission</th>
                                <th className="px-10 py-6">Partner Cleared</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {companyBookings.slice(0, 15).map(b => {
                                const gross = Number(b.total_price || 0);
                                const aeroCut = gross * ((editingCompany.commission_rate || 15) / 100);
                                return (
                                  <tr key={b.id} className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-6 text-sm font-bold text-white">{b.booking_ref}</td>
                                    <td className="px-10 py-6 text-sm font-bold text-slate-400">£{gross.toFixed(2)}</td>
                                    <td className="px-10 py-6 text-sm font-bold text-blue-400">£{aeroCut.toFixed(2)}</td>
                                    <td className="px-10 py-6 text-sm font-black text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                              {companyBookings.length === 0 && (
                                <tr><td colSpan={4} className="px-10 py-12 text-center text-slate-500 text-sm font-bold">No completed bookings found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </form>

            {modalTab !== "financials" && (
              <div className="bg-slate-900/60 p-10 shrink-0 border-t border-white/5 flex gap-8">
                <button type="submit" disabled={isSaving} onClick={(e) => editingCompany ? handleUpdateCompany(e as any) : handleAddCompany(e as any)} className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs text-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.6)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4">
                  {isSaving ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-6 h-6" />}
                  {isSaving ? "Syncing Network..." : "Save & Push Live"}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}