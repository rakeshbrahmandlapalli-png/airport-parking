"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Plus, Save, Car, CheckCircle2, XCircle, 
  Loader2, X, Trash2, MapPin, PlaneTakeoff, 
  Settings2, LayoutDashboard, Building2,AlertCircle, CalendarDays, LogOut, Plane, Network, Filter, MessageSquare, Percent, Image as ImageIcon, SlidersHorizontal, ArrowUpDown, Award, AlertOctagon,
  FileText, Download, ChevronDown
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
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Advanced Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [modalTab, setModalTab] = useState<"general" | "ltn" | "lhr" | "financials">("general");

  // Financials State
  const [companyBookings, setCompanyBookings] = useState<any[]>([]);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);

  const defaultCompany = {
    name: "",
    category: "meet-greet",
    luton_price: 0,
    heathrow_price: 0,
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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchCompanies();
    };
    checkAuth();
  }, [router]);

  // 🟢 FETCH FINANCIALS WHEN TAB OPENS
  useEffect(() => {
    if (modalTab === "financials" && editingCompany?.id) {
      fetchFinancials(editingCompany.id);
    }
  }, [modalTab, editingCompany]);

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*');
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
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will permanently delete the partner profile.")) return;
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      setCompanies(companies.filter(c => c.id !== id));
    } catch (error: any) {
      alert(error.message);
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
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (company: any) => {
    const newVal = !company.is_active;
    setCompanies(companies.map(c => c.id === company.id ? {...c, is_active: newVal} : c));
    await supabase.from('companies').update({ is_active: newVal }).eq('id', company.id);
  };

  // 🟢 CSV INVOICE GENERATOR
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

  // Advanced Filter Engine
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

  // Financial Helpers
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
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0B1121] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/50 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          <span className="font-black text-xl tracking-tight uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        <nav className="px-4 space-y-2 flex-grow mt-4">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><LayoutDashboard className="w-5 h-5" /> Live Dispatch</Link>
          <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl font-bold transition-colors"><Building2 className="w-5 h-5" /> Companies</Link>
          <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><CalendarDays className="w-5 h-5" /> Schedule</Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-4 py-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">N</div> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10 custom-scrollbar">
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800 mx-2 mt-2">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">OPS<span className="text-blue-500">CENTER</span></div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>

        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 px-2 md:px-0">
          <div><h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Partner Network</h1><p className="text-slate-400 font-medium mt-2">Manage availability, pricing, and live integrations.</p></div>
          <button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-full xl:w-auto px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]"><Plus className="w-5 h-5" /> Onboard New Partner</button>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 px-2 md:px-0">
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-blue-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Total Network</p><p className="text-3xl font-black text-white tracking-tighter">{totalPartners}</p></div>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20"><Network className="w-5 h-5" /></div>
          </div>
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-emerald-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">LTN Coverage</p><p className="text-3xl font-black text-white tracking-tighter">{ltnCoverage}</p></div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20"><Car className="w-5 h-5" /></div>
          </div>
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-purple-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-1">LHR Coverage</p><p className="text-3xl font-black text-white tracking-tighter">{lhrCoverage}</p></div>
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/20"><PlaneTakeoff className="w-5 h-5" /></div>
          </div>
        </div>

        {/* 🟢 MODERN ADVANCED FILTER RIBBON */}
        <div className="bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] border border-slate-700/50 shadow-2xl p-3 mb-6 mx-2 md:mx-0 flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text" 
              autoComplete="off"
              placeholder="Search brands..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full !bg-[#0B1121] border border-slate-800 hover:border-slate-700 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold !text-white outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-600 transition-all shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" 
            />
          </div>
          
          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full xl:w-auto shrink-0">
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Categories</option><option value="MEET_GREET">Meet & Greet</option><option value="PARK_RIDE">Park & Ride</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={airportFilter} onChange={(e) => setAirportFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Airports</option><option value="LTN">Luton Only</option><option value="LHR">Heathrow Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-[#0B1121] border border-slate-800 hover:border-slate-600 rounded-xl py-3.5 pl-9 pr-8 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50 shadow-inner">
                <option value="ALL">All Statuses</option><option value="ACTIVE">Active Only</option><option value="OFFLINE">Offline</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ADVANCED DATA TABLE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col mx-2 md:mx-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B1121] border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                    Partner Details <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest cursor-pointer hover:text-white" onClick={() => toggleSort('commission_rate')}>
                    Commission <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right cursor-pointer hover:text-white" onClick={() => toggleSort('luton_price')}>
                    LTN Rate <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right cursor-pointer hover:text-white" onClick={() => toggleSort('heathrow_price')}>
                    LHR Rate <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50"/>
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredAndSortedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-500 font-bold">No partners match your filters.</td>
                  </tr>
                ) : (
                  filteredAndSortedCompanies.map((c) => (
                    <tr key={c.id} className={`transition-colors ${c.is_active ? 'hover:bg-slate-800/30' : 'opacity-40 grayscale hover:bg-slate-800/30'}`}>
                      
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 border border-slate-700 shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-black text-xl border border-slate-700 shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-sm md:text-base leading-tight mb-1.5">{c.name}</p>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{c.category?.replace('-', ' ')}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                              {c.operates_at_luton && (
                                <span className={`flex items-center gap-1 ${c.ltn_featured ? 'text-amber-400' : ''}`}>
                                  <Car className="w-3.5 h-3.5"/> ★ {getAvgRating(c.ltn_reviews)}
                                </span>
                              )}
                              {c.operates_at_heathrow && (
                                <span className={`flex items-center gap-1 ${c.lhr_featured ? 'text-amber-400' : ''}`}>
                                  <PlaneTakeoff className="w-3.5 h-3.5"/> ★ {getAvgRating(c.lhr_reviews)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 text-center">
                        <button onClick={() => handleToggleActive(c)} className={`px-4 py-1.5 rounded-full text-[9px] tracking-widest font-black border uppercase ${c.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {c.is_active ? 'Active' : 'Offline'}
                        </button>
                      </td>
                      
                      <td className="px-8 py-5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-black">
                          <Percent className="w-3 h-3"/> {c.commission_rate || 15}%
                        </div>
                      </td>

                      <td className="px-8 py-5 text-right">
                        {c.operates_at_luton ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-black text-white text-base">£{Number(c.luton_price || 0).toFixed(2)}</span>
                            {c.ltn_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-1.5 rounded">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-8 py-5 text-right">
                        {c.operates_at_heathrow ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-black text-white text-base">£{Number(c.heathrow_price || 0).toFixed(2)}</span>
                            {c.lhr_sold_out && <span className="text-[8px] font-black uppercase text-red-400 bg-red-400/10 px-1.5 rounded">Sold Out</span>}
                          </div>
                        ) : <span className="text-slate-600 font-black text-xs">—</span>}
                      </td>

                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => {setModalTab("general"); setEditingCompany(c);}} className="p-2.5 bg-slate-800/50 hover:bg-blue-600/20 rounded-xl transition-all border border-slate-700 hover:border-blue-500/30 text-slate-300 hover:text-blue-400 shadow-sm"><Settings2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-slate-800/50 hover:bg-red-600/20 rounded-xl transition-all border border-slate-700 hover:border-red-500/30 text-slate-500 hover:text-red-400 shadow-sm"><Trash2 className="w-4 h-4" /></button>
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/90 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl h-16 flex items-center justify-around px-2 pointer-events-auto shadow-2xl">
          <Link href="/admin" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center flex-1 gap-1 text-blue-500"><Building2 className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Ops</span></Link>
          <div className="relative -top-4"><button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border-4 border-[#0B1121] active:scale-90 transition-transform"><Plus className="w-7 h-7 text-white" /></button></div>
          <Link href="/admin/schedule" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500"><CalendarDays className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Plan</span></Link>
        </nav>
      </div>

      {/* 🟢 TABBED MODAL SECTION (ADD & EDIT) */}
      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#0B1121]/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-4xl rounded-[2.5rem] max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col">
            
            {/* Modal Header & Tabs */}
            <div className="pt-8 px-8 border-b border-slate-800 bg-[#0f172a] z-10 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{editingCompany ? `Configure Partner` : 'Onboard Partner'}</h2>
                <button onClick={() => {setEditingCompany(null); setShowAddModal(false);}} className="p-2 bg-slate-800/80 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="flex gap-6 overflow-x-auto no-scrollbar pb-[-1px]">
                <button onClick={() => setModalTab("general")} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${modalTab === "general" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>General Details</button>
                <button onClick={() => setModalTab("ltn")} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === "ltn" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}><Car className="w-3.5 h-3.5"/> Luton Ops</button>
                <button onClick={() => setModalTab("lhr")} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === "lhr" ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}><PlaneTakeoff className="w-3.5 h-3.5"/> Heathrow Ops</button>
                {/* 🟢 NEW FINANCIALS TAB */}
                {editingCompany && (
                  <button onClick={() => setModalTab("financials")} className={`pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === "financials" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><FileText className="w-3.5 h-3.5"/> Financials & Invoices</button>
                )}
              </div>
            </div>
            
            <form onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany} autoComplete="off" className="flex-1 overflow-y-auto custom-scrollbar p-8 relative">
              
              {/* TAB 1: GENERAL */}
              {modalTab === "general" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Brand Name</label>
                      <input required type="text" autoComplete="off" value={editingCompany ? (editingCompany.name || "") : newCompany.name} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, name: e.target.value}) : setNewCompany({...newCompany, name: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Service Category</label>
                      <div className="relative">
                        <select value={editingCompany ? (editingCompany.category || "") : newCompany.category} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, category: e.target.value}) : setNewCompany({...newCompany, category: e.target.value})} className="w-full appearance-none !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white font-bold outline-none focus:border-blue-500 cursor-pointer">
                          <option value="meet-greet">Meet & Greet</option>
                          <option value="park-ride">Park & Ride</option>
                          <option value="hotel">Hotel & Parking</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Logo URL</label>
                      <input type="text" autoComplete="off" placeholder="https://..." value={editingCompany ? (editingCompany.logo_url || "") : newCompany.logo_url} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, logo_url: e.target.value}) : setNewCompany({...newCompany, logo_url: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white text-sm outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1 flex items-center gap-1"><Percent className="w-3 h-3"/> Commission Cut (%)</label>
                      <input required type="number" step="0.1" value={editingCompany ? (editingCompany.commission_rate ?? 15) : newCompany.commission_rate} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, commission_rate: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, commission_rate: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-emerald-400 font-black outline-none focus:border-emerald-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:rgb(52,211,153)]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Marketing Overview (Shown to Customers)</label>
                    <textarea rows={4} value={editingCompany ? (editingCompany.overview || "") : newCompany.overview} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, overview: e.target.value}) : setNewCompany({...newCompany, overview: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 !text-white text-sm leading-relaxed outline-none focus:border-blue-500" placeholder="Highlight key selling points here..."/>
                  </div>
                </div>
              )}

              {/* TAB 2: LUTON */}
              {modalTab === "ltn" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-[#0B1121] p-6 rounded-3xl border border-slate-800">
                    <label className="flex items-center gap-4 cursor-pointer">
                      <div className="flex-1">
                        <p className="text-white font-black">Operates at Luton Airport?</p>
                        <p className="text-slate-500 text-xs mt-1">Enable to show this partner in LTN search results.</p>
                      </div>
                      <input type="checkbox" checked={editingCompany?.operates_at_luton ?? newCompany.operates_at_luton} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_luton: e.target.checked}) : setNewCompany({...newCompany, operates_at_luton: e.target.checked})} className="accent-blue-500 w-6 h-6" />
                    </label>
                  </div>

                  {(editingCompany?.operates_at_luton || newCompany.operates_at_luton) && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Base Daily Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.luton_price || "") : newCompany.luton_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-4 !text-white text-xl font-black outline-none focus:border-blue-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="flex flex-col gap-3 pt-6">
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_sold_out: !editingCompany.ltn_sold_out}) : setNewCompany({...newCompany, ltn_sold_out: !newCompany.ltn_sold_out})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingCompany?.ltn_sold_out || newCompany.ltn_sold_out ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#0B1121] text-slate-500 border-slate-800 hover:border-slate-700'}`}><AlertOctagon className="w-4 h-4"/> Mark Sold Out</button>
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_featured: !editingCompany.ltn_featured}) : setNewCompany({...newCompany, ltn_featured: !newCompany.ltn_featured})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingCompany?.ltn_featured || newCompany.ltn_featured ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-[#0B1121] text-slate-500 border-slate-800 hover:border-slate-700'}`}><Award className="w-4 h-4"/> Highlight as Featured</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Arrival Instructions (Email)</label>
                          <textarea rows={4} value={editingCompany ? (editingCompany.on_arrival_ltn || "") : newCompany.on_arrival_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_ltn: e.target.value}) : setNewCompany({...newCompany, on_arrival_ltn: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-xs !text-slate-300 outline-none focus:border-blue-500 leading-relaxed" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Return Instructions (Email)</label>
                          <textarea rows={4} value={editingCompany ? (editingCompany.on_return_ltn || "") : newCompany.on_return_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_ltn: e.target.value}) : setNewCompany({...newCompany, on_return_ltn: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-xs !text-slate-300 outline-none focus:border-blue-500 leading-relaxed" />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-white font-black text-lg">Customer Reviews (LTN)</h3><button type="button" onClick={() => addReview('ltn')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">+ Add Review</button></div>
                        <div className="grid grid-cols-1 gap-4">
                          {(editingCompany?.ltn_reviews || newCompany.ltn_reviews || []).map((rev: any, idx: number) => (
                            <div key={rev.id} className="bg-[#0B1121] p-5 rounded-2xl border border-slate-800 relative group">
                              <button type="button" onClick={() => removeReview('ltn', idx)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                              <div className="flex gap-4 mb-4 pr-8">
                                <input value={rev.author} onChange={(e) => updateReview('ltn', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 !text-white text-sm font-bold outline-none focus:border-blue-500 pb-1" placeholder="Author Name" />
                                <div className="relative w-1/2">
                                  <select value={rev.rating} onChange={(e) => updateReview('ltn', idx, 'rating', parseInt(e.target.value))} className="w-full appearance-none !bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs !text-amber-400 font-bold outline-none cursor-pointer"><option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option></select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <textarea value={rev.comment} onChange={(e) => updateReview('ltn', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-300 text-sm outline-none resize-none" rows={2} placeholder="Customer comment..." />
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
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-[#0B1121] p-6 rounded-3xl border border-slate-800">
                    <label className="flex items-center gap-4 cursor-pointer">
                      <div className="flex-1">
                        <p className="text-white font-black">Operates at Heathrow Airport?</p>
                        <p className="text-slate-500 text-xs mt-1">Enable to show this partner in LHR search results.</p>
                      </div>
                      <input type="checkbox" checked={editingCompany?.operates_at_heathrow ?? newCompany.operates_at_heathrow} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_heathrow: e.target.checked}) : setNewCompany({...newCompany, operates_at_heathrow: e.target.checked})} className="accent-blue-500 w-6 h-6" />
                    </label>
                  </div>

                  {(editingCompany?.operates_at_heathrow || newCompany.operates_at_heathrow) && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Base Daily Rate (£)</label>
                          <input type="number" step="0.01" value={editingCompany ? (editingCompany.heathrow_price || "") : newCompany.heathrow_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value) || 0}) : setNewCompany({...newCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-4 !text-white text-xl font-black outline-none focus:border-purple-500 shadow-[0_0_0_1000px_#0B1121_inset] [-webkit-text-fill-color:white]" />
                        </div>
                        <div className="flex flex-col gap-3 pt-6">
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_sold_out: !editingCompany.lhr_sold_out}) : setNewCompany({...newCompany, lhr_sold_out: !newCompany.lhr_sold_out})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingCompany?.lhr_sold_out || newCompany.lhr_sold_out ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#0B1121] text-slate-500 border-slate-800 hover:border-slate-700'}`}><AlertOctagon className="w-4 h-4"/> Mark Sold Out</button>
                          <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_featured: !editingCompany.lhr_featured}) : setNewCompany({...newCompany, lhr_featured: !newCompany.lhr_featured})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${editingCompany?.lhr_featured || newCompany.lhr_featured ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-[#0B1121] text-slate-500 border-slate-800 hover:border-slate-700'}`}><Award className="w-4 h-4"/> Highlight as Featured</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Arrival Instructions (Email)</label>
                          <textarea rows={4} value={editingCompany ? (editingCompany.on_arrival_lhr || "") : newCompany.on_arrival_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_lhr: e.target.value}) : setNewCompany({...newCompany, on_arrival_lhr: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-xs !text-slate-300 outline-none focus:border-purple-500 leading-relaxed" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Return Instructions (Email)</label>
                          <textarea rows={4} value={editingCompany ? (editingCompany.on_return_lhr || "") : newCompany.on_return_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_lhr: e.target.value}) : setNewCompany({...newCompany, on_return_lhr: e.target.value})} className="w-full !bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-xs !text-slate-300 outline-none focus:border-purple-500 leading-relaxed" />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-white font-black text-lg">Customer Reviews (LHR)</h3><button type="button" onClick={() => addReview('lhr')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">+ Add Review</button></div>
                        <div className="grid grid-cols-1 gap-4">
                          {(editingCompany?.lhr_reviews || newCompany.lhr_reviews || []).map((rev: any, idx: number) => (
                            <div key={rev.id} className="bg-[#0B1121] p-5 rounded-2xl border border-slate-800 relative group">
                              <button type="button" onClick={() => removeReview('lhr', idx)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                              <div className="flex gap-4 mb-4 pr-8">
                                <input value={rev.author} onChange={(e) => updateReview('lhr', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 !text-white text-sm font-bold outline-none focus:border-blue-500 pb-1" placeholder="Author Name" />
                                <div className="relative w-1/2">
                                  <select value={rev.rating} onChange={(e) => updateReview('lhr', idx, 'rating', parseInt(e.target.value))} className="w-full appearance-none !bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs !text-amber-400 font-bold outline-none cursor-pointer"><option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option></select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                </div>
                              </div>
                              <textarea value={rev.comment} onChange={(e) => updateReview('lhr', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-300 text-sm outline-none resize-none" rows={2} placeholder="Customer comment..." />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 🟢 TAB 4: FINANCIALS (NEW) */}
              {modalTab === "financials" && editingCompany && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  {fetchingFinancials ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                      <p className="font-black text-xs uppercase tracking-widest">Compiling ledgers...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
                        <div>
                          <h3 className="text-emerald-400 font-black text-lg">Partner Accounting</h3>
                          <p className="text-emerald-500/70 text-xs font-bold mt-1">Based on {companyBookings.length} completed bookings.</p>
                        </div>
                        <button type="button" onClick={downloadInvoiceCSV} className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                          <Download className="w-4 h-4"/> Generate Invoice (CSV)
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-[#0B1121] p-6 rounded-2xl border border-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Gross (Customer Paid)</p>
                          <p className="text-3xl font-black text-white">£{calcGross().toFixed(2)}</p>
                        </div>
                        <div className="bg-[#0B1121] p-6 rounded-2xl border border-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Aero Commission ({editingCompany.commission_rate || 15}%)</p>
                          <p className="text-3xl font-black text-blue-400">£{calcAeroCut().toFixed(2)}</p>
                        </div>
                        <div className="bg-[#0B1121] p-6 rounded-2xl border border-emerald-900/30">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Total Owed to Partner</p>
                          <p className="text-3xl font-black text-emerald-400">£{calcPayout().toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0B1121]">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Booking Ledger</h4>
                        </div>
                        <table className="w-full text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-800/50">
                              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Ref</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Gross</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Aero Cut</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-500">Partner Payout</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {companyBookings.slice(0, 10).map(b => {
                              const gross = Number(b.total_price || 0);
                              const aeroCut = gross * ((editingCompany.commission_rate || 15) / 100);
                              return (
                                <tr key={b.id}>
                                  <td className="px-6 py-4 text-xs font-bold text-white">{b.booking_ref}</td>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-400">£{gross.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-xs font-bold text-blue-400">£{aeroCut.toFixed(2)}</td>
                                  <td className="px-6 py-4 text-xs font-black text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                            {companyBookings.length === 0 && (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-xs">No bookings found for this partner.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

            </form>

            {modalTab !== "financials" && (
              <div className="bg-[#0f172a] p-6 shrink-0 border-t border-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-10">
                <button type="submit" disabled={isSaving} onClick={(e) => editingCompany ? handleUpdateCompany(e as any) : handleAddCompany(e as any)} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {isSaving ? "Syncing to Database..." : "Save & Push Live"}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}