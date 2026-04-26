"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Plus, Save, Car, Bus, Hotel, CheckCircle2, XCircle, 
  Loader2, X, Trash2, Star, MapPin, PlaneTakeoff, Power,
  PlaneLanding, Settings2, LayoutDashboard, Building2, CalendarDays, LogOut, Plane, Network,Filter
} from "lucide-react";

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  // Updated to include new fields
  const [newCompany, setNewCompany] = useState({
    name: "",
    category: "meet-greet",
    luton_price: 0,
    heathrow_price: 0,
    is_active: true,      // NEW: Master visibility switch
    is_featured: false,   // NEW: Marketing badge switch
    is_sold_out: false,   // Capacity switch
    operates_at_luton: true,
    operates_at_heathrow: true,
    overview: "",
    on_arrival: "",
    on_return: "",
    address: "",
    postcode: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchCompanies();
    };
    checkAuth();
  }, [router]);

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setCompanies(data);
    if (error) console.error("Error fetching companies:", error);
    setLoading(false);
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
      setNewCompany({ 
        name: "", category: "meet-greet", luton_price: 0, heathrow_price: 0, 
        is_active: true, is_featured: false, is_sold_out: false, 
        operates_at_luton: true, operates_at_heathrow: true,
        overview: "", on_arrival: "", on_return: "", address: "", postcode: ""
      });
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

  // 🟢 QUICK TOGGLES FOR TABLE
  const handleToggleFeatured = async (company: any) => {
    setCompanies(companies.map(c => c.id === company.id ? {...c, is_featured: !c.is_featured} : c));
    await supabase.from('companies').update({ is_featured: !company.is_featured }).eq('id', company.id);
  };

  const handleToggleActive = async (company: any) => {
    setCompanies(companies.map(c => c.id === company.id ? {...c, is_active: !c.is_active} : c));
    await supabase.from('companies').update({ is_active: !company.is_active }).eq('id', company.id);
  };

  // FILTERING & METRICS LOGIC
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === "MEET_GREET") return c.category === "meet-greet";
    if (categoryFilter === "PARK_RIDE") return c.category === "park-ride";
    if (categoryFilter === "HOTEL") return c.category === "hotel";
    return true;
  });

  const totalPartners = companies.length;
  const ltnCoverage = companies.filter(c => c.operates_at_luton && c.is_active).length;
  const lhrCoverage = companies.filter(c => c.operates_at_heathrow && c.is_active).length;

  if (loading) return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Syncing Partner Network...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">
      
      {/* 🟢 DESKTOP SIDEBAR */}
      <aside className="w-64 bg-[#0B1121] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/50 shadow-2xl z-50">
        <div className="p-8 flex items-center gap-3 text-white">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          <span className="font-black text-xl tracking-tight uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        
        <nav className="px-4 space-y-2 flex-grow mt-4">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <LayoutDashboard className="w-5 h-5" /> Live Dispatch
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-3 px-4 py-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl font-bold transition-colors">
            <Building2 className="w-5 h-5" /> Companies
          </Link>
          <Link href="/admin/schedule" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors">
            <CalendarDays className="w-5 h-5" /> Schedule
          </Link>
        </nav>

        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-4 py-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white group-hover:bg-red-500/20 group-hover:text-red-500 transition-colors">N</div>
            Secure Logout
          </button>
        </div>
      </aside>

      {/* 🟢 MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800 mx-2 mt-2">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">
            <Plane className="w-5 h-5 text-blue-500 rotate-45" /> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 px-2 md:px-0">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">Partner Network</h1>
            <p className="text-slate-400 font-medium mt-2">Manage availability, features, and live rates.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center bg-[#0f172a] border border-slate-700/50 rounded-2xl px-5 py-3.5 focus-within:border-blue-500 transition-all w-full sm:w-80 group shadow-sm">
              <Search className="w-5 h-5 text-slate-500 mr-3 shrink-0 group-focus-within:text-blue-400" />
              <input 
                type="text" 
                placeholder="Search network..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full !bg-transparent border-none text-sm font-bold outline-none placeholder:text-slate-500 text-white focus:ring-0"
              />
            </div>
            <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <Plus className="w-4 h-4" /> Add Provider
            </button>
          </div>
        </header>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 px-2 md:px-0">
          <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-blue-900/30 flex items-center justify-between group hover:border-blue-500/50 transition-colors">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Total Partners</p>
              <p className="text-4xl font-black text-white tracking-tighter">{totalPartners}</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Network className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-emerald-900/30 flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Active LTN</p>
              <p className="text-4xl font-black text-white tracking-tighter">{ltnCoverage} <span className="text-xl text-slate-400 font-bold tracking-normal">Providers</span></p>
            </div>
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Car className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0f172a] to-[#0B1121] p-8 rounded-[2rem] border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors sm:col-span-2 lg:col-span-1 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-2">Active LHR</p>
              <p className="text-4xl font-black text-white tracking-tighter">{lhrCoverage} <span className="text-xl text-slate-400 font-bold tracking-normal">Providers</span></p>
            </div>
            <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(168,85,247,0.1)]">
              <PlaneTakeoff className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col mx-2 md:mx-0">
          
          {/* CATEGORY FILTERS */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3 bg-[#0B1121]/50 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2 shrink-0 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {['ALL', 'MEET_GREET', 'PARK_RIDE', 'HOTEL'].map(f => (
              <button 
                key={f}
                onClick={() => setCategoryFilter(f)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${categoryFilter === f ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800'}`}
              >
                {f.replace('_', ' & ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {filteredCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-slate-500">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">No Providers Found</p>
                <p className="text-xs font-medium mt-2 opacity-50">Try adjusting your filters or add a new provider.</p>
              </div>
            ) : (
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0B1121]/80">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Partner Details</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-center">Status (Live)</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-center">Featured</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-right">LTN Rate</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-right">LHR Rate</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className={`transition-colors group ${company.is_active ? 'hover:bg-slate-800/30' : 'bg-slate-900/50 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all">
                            {company.category === 'meet-greet' ? <Car className="w-6 h-6" /> : company.category === 'park-ride' ? <Bus className="w-6 h-6" /> : <Hotel className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="font-bold text-white text-base leading-none">{company.name}</p>
                              {company.is_sold_out && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[9px] font-black uppercase tracking-widest">Sold Out</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{company.category?.replace('-', ' ')}</p>
                              <span className="text-slate-600 font-normal">|</span> 
                              <span className={`px-2 rounded text-[8px] font-black uppercase tracking-widest border ${company.operates_at_luton ? 'text-blue-400 border-blue-500/30' : 'text-slate-700 border-slate-800'}`}>LTN</span>
                              <span className={`px-2 rounded text-[8px] font-black uppercase tracking-widest border ${company.operates_at_heathrow ? 'text-purple-400 border-purple-500/30' : 'text-slate-700 border-slate-800'}`}>LHR</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-5 text-center">
                         <button 
                            onClick={() => handleToggleActive(company)} 
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${company.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:bg-slate-800 hover:text-white'}`}
                          >
                           <Power className="w-3.5 h-3.5" /> {company.is_active ? 'Active' : 'Disabled'}
                         </button>
                      </td>

                      <td className="px-8 py-5 text-center">
                         <button 
                            onClick={() => handleToggleFeatured(company)} 
                            className={`p-2 rounded-xl transition-all ${company.is_featured ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] hover:bg-amber-500/20' : 'bg-slate-800/30 border border-slate-700 text-slate-600 hover:text-amber-400/50 hover:border-amber-500/30'}`}
                            title="Toggle Featured Status"
                          >
                           <Star className={`w-5 h-5 ${company.is_featured ? 'fill-current' : ''}`} />
                         </button>
                      </td>

                      <td className="px-8 py-5 text-right font-black text-white text-sm">£{company.luton_price?.toFixed(2) || '0.00'}</td>
                      <td className="px-8 py-5 text-right font-black text-white text-sm">£{company.heathrow_price?.toFixed(2) || '0.00'}</td>
                      
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => setEditingCompany(company)} className="inline-flex items-center gap-1.5 bg-slate-800/50 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 px-4 py-2.5 rounded-xl font-bold border border-slate-700 hover:border-blue-500/30 transition-all text-xs active:scale-95">
                            <Settings2 className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => handleDelete(company.id)} className="p-2.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* 🟢 MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/90 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl h-16 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-blue-400 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
          </Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center flex-1 gap-1 text-blue-500">
            <Building2 className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Ops</span>
          </Link>
          <div className="relative -top-5 px-2">
            <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/40 border-4 border-[#0B1121] active:scale-90 transition-transform">
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>
          <Link href="/admin/schedule" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-blue-400 transition-colors">
            <CalendarDays className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Plan</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
          </button>
        </nav>
      </div>

      {/* 🟢 PREMIUM ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0B1121]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0f172a] w-full max-w-lg rounded-[2rem] p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 relative my-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-white mb-2">Create Partner</h2>
            <p className="text-slate-400 font-medium text-sm mb-8">Enter initial airport rates and category.</p>
            
            <form onSubmit={handleAddCompany} className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Company Name</label>
                <input required type="text" value={newCompany.name} onChange={(e) => setNewCompany({...newCompany, name: e.target.value})} placeholder="e.g. Heathrow Express VIP" className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Category</label>
                <select className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={newCompany.category} onChange={(e) => setNewCompany({...newCompany, category: e.target.value})}>
                   <option value="meet-greet">Meet & Greet</option>
                   <option value="park-ride">Park & Ride</option>
                   <option value="hotel">Hotel & Parking</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">LTN Rate (£)</label>
                  <input type="number" step="0.01" value={newCompany.luton_price} onChange={(e) => setNewCompany({...newCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">LHR Rate (£)</label>
                  <input type="number" step="0.01" value={newCompany.heathrow_price} onChange={(e) => setNewCompany({...newCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
              </div>

              {/* Master Toggles for Add Modal */}
              <div className="grid grid-cols-2 gap-4">
                 <button type="button" onClick={() => setNewCompany({...newCompany, is_active: !newCompany.is_active})} className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${newCompany.is_active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
                    <Power className={`w-5 h-5 ${newCompany.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${newCompany.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>{newCompany.is_active ? 'Active' : 'Disabled'}</span>
                 </button>
                 <button type="button" onClick={() => setNewCompany({...newCompany, is_featured: !newCompany.is_featured})} className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${newCompany.is_featured ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0B1121] border-slate-800'}`}>
                    <Star className={`w-5 h-5 ${newCompany.is_featured ? 'text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${newCompany.is_featured ? 'text-amber-400' : 'text-slate-500'}`}>Featured</span>
                 </button>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 py-4 mt-4 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Creating..." : "Create Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 PREMIUM EDIT MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 bg-[#0B1121]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-[2rem] p-6 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 relative my-auto mt-10 mb-10">
            <button onClick={() => setEditingCompany(null)} className="absolute top-6 right-6 md:top-10 md:right-10 text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2 pr-10">Edit {editingCompany.name}</h2>
            <p className="text-slate-400 font-medium mb-8">Configure visibility, rates, and customer instructions.</p>
            
            <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Company Name</label>
                <input required type="text" value={editingCompany.name || ""} onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition-all" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Luton Rate (£)</label>
                <input type="number" step="0.01" value={editingCompany.luton_price || 0} onChange={(e) => setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition-all" />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Heathrow Rate (£)</label>
                <input type="number" step="0.01" value={editingCompany.heathrow_price || 0} onChange={(e) => setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 outline-none transition-all" />
              </div>

              {/* MASTER TOGGLES */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-3">
                 {/* Master Active / Disabled */}
                 <button type="button" onClick={() => setEditingCompany({...editingCompany, is_active: !editingCompany.is_active})} className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${editingCompany.is_active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
                    <Power className={`w-4 h-4 ${editingCompany.is_active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${editingCompany.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>{editingCompany.is_active ? 'Active' : 'Disabled'}</span>
                 </button>
                 
                 {/* Capacity Toggle */}
                 <button type="button" onClick={() => setEditingCompany({...editingCompany, is_sold_out: !editingCompany.is_sold_out})} className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${editingCompany.is_sold_out ? 'bg-red-500/10 border-red-500/30' : 'bg-[#0B1121] border-slate-800'}`}>
                    {editingCompany.is_sold_out ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-slate-600" />}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${editingCompany.is_sold_out ? 'text-red-400' : 'text-slate-500'}`}>{editingCompany.is_sold_out ? 'Sold Out' : 'Available'}</span>
                 </button>
                 
                 {/* Featured VIP */}
                 <button type="button" onClick={() => setEditingCompany({...editingCompany, is_featured: !editingCompany.is_featured})} className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-all ${editingCompany.is_featured ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0B1121] border-slate-800'}`}>
                    <Star className={`w-4 h-4 ${editingCompany.is_featured ? 'text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${editingCompany.is_featured ? 'text-amber-400' : 'text-slate-500'}`}>Featured</span>
                 </button>

                 {/* Airports */}
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_luton: !editingCompany.operates_at_luton})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center ${editingCompany.operates_at_luton ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[#0B1121] border-slate-800 text-slate-600'}`}>LTN</button>
                    <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_heathrow: !editingCompany.operates_at_heathrow})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center ${editingCompany.operates_at_heathrow ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-[#0B1121] border-slate-800 text-slate-600'}`}>LHR</button>
                 </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Company Overview</label>
                <textarea rows={2} value={editingCompany.overview || ""} onChange={(e) => setEditingCompany({...editingCompany, overview: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all" placeholder="A brief description..." />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center gap-1.5 block"><PlaneTakeoff className="w-3 h-3"/> Arrival Instructions</label>
                <textarea rows={2} value={editingCompany.on_arrival || ""} onChange={(e) => setEditingCompany({...editingCompany, on_arrival: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all" placeholder="Call dispatch 15 mins before..." />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 flex items-center gap-1.5 block"><PlaneLanding className="w-3 h-3"/> Return Instructions</label>
                <textarea rows={2} value={editingCompany.on_return || ""} onChange={(e) => setEditingCompany({...editingCompany, on_return: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all" placeholder="Call after customs..." />
              </div>

              <div className="md:col-span-2 pt-2">
                <button type="submit" disabled={isSaving} className="w-full h-14 font-black rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 active:scale-95 disabled:opacity-50 transition-all">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Syncing Profile...' : 'Update Live Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}