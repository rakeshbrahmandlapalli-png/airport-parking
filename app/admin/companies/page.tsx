"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Plus, Save, Car, Bus, Hotel, CheckCircle2, XCircle, 
  Loader2, X, Trash2, Star, MapPin, Info, PlaneTakeoff, 
  PlaneLanding, Settings2, LayoutDashboard, Building2, CalendarDays, LogOut, Plane
} from "lucide-react";

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const [newCompany, setNewCompany] = useState({
    name: "",
    category: "meet-greet",
    luton_price: 0,
    heathrow_price: 0,
    is_sold_out: false,
    is_recommended: false,
    operates_at_luton: true,
    operates_at_heathrow: true,
    overview: "",
    on_arrival: "",
    on_return: "",
    address: "",
    postcode: ""
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setCompanies(data);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut(); 
    router.push("/admin/login");
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('companies').insert([newCompany]);
    if (!error) {
      setShowAddModal(false);
      setNewCompany({ 
        name: "", category: "meet-greet", luton_price: 0, heathrow_price: 0, 
        is_sold_out: false, is_recommended: false, operates_at_luton: true, operates_at_heathrow: true,
        overview: "", on_arrival: "", on_return: "", address: "", postcode: ""
      });
      await fetchCompanies();
    } else alert(error.message);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This is permanent.")) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) await fetchCompanies();
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.from('companies').update(editingCompany).eq('id', editingCompany.id);
    if (!error) {
      setEditingCompany(null);
      fetchCompanies();
    } else alert(error.message);
    setIsSaving(false);
  };

  const handleToggleVip = async (company: any) => {
    setCompanies(companies.map(c => c.id === company.id ? {...c, is_recommended: !c.is_recommended} : c));
    await supabase.from('companies').update({ is_recommended: !company.is_recommended }).eq('id', company.id);
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Loading Providers...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0B1121] text-slate-400 flex flex-col hidden md:flex sticky top-0 h-screen border-r border-slate-800/50 shadow-2xl z-50">
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

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800 mt-2 mx-2">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">
            <Plane className="w-5 h-5 text-blue-500 rotate-45" /> OPS<span className="text-blue-500">CENTER</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white"><LayoutDashboard className="w-5 h-5" /></Link>
            <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 px-2 md:px-0">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Partner Companies</h1>
            <p className="text-slate-400 font-medium mt-1">Manage airport-specific availability and rates.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            {/* 🟢 FIXED BULLETPROOF SEARCH BAR WITH !IMPORTANT OVERRIDE */}
            <div className="flex items-center bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-3.5 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all shadow-sm flex-grow w-full sm:w-80 group">
              <Search className="w-5 h-5 text-slate-500 mr-3 shrink-0 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search partner network..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full !bg-transparent border-none text-sm font-bold outline-none placeholder:text-slate-500 text-white"
              />
            </div>

            <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto whitespace-nowrap px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-500">
              <Plus className="w-4 h-4" /> Add Provider Profile
            </button>
          </div>
        </header>

        {/* TABLE WRAPPER */}
        <div className="bg-[#0f172a] rounded-[2rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col mx-2 md:mx-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B1121]/80">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80">Partner Details</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-center">Coverage</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-right">LTN Rate</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-right">LHR Rate</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80 text-center">VIP</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-slate-800/80"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all">
                          {company.category === 'meet-greet' ? <Car className="w-6 h-6" /> : company.category === 'park-ride' ? <Bus className="w-6 h-6" /> : <Hotel className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base leading-none mb-1.5">{company.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{company.category?.replace('-', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center gap-1.5">
                         <span className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${company.operates_at_luton ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800/50 text-slate-600 border-slate-700/50'}`}>LTN</span>
                         <span className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${company.operates_at_heathrow ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-800/50 text-slate-600 border-slate-700/50'}`}>LHR</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-white text-sm">£{company.luton_price?.toFixed(2) || '0.00'}</td>
                    <td className="px-8 py-5 text-right font-black text-white text-sm">£{company.heathrow_price?.toFixed(2) || '0.00'}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${company.is_sold_out ? 'bg-slate-800/50 text-slate-500 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                        {company.is_sold_out ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {company.is_sold_out ? 'Sold Out' : 'Active'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <button onClick={() => handleToggleVip(company)} className={`p-1.5 rounded-lg transition-all ${company.is_recommended ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] hover:text-amber-300' : 'text-slate-600 hover:text-amber-400/50'}`}>
                         <Star className={`w-5 h-5 ${company.is_recommended ? 'fill-current' : ''}`} />
                       </button>
                    </td>
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
          </div>
        </div>

        {/* PREMIUM EDIT MODAL */}
        {editingCompany && (
          <div className="fixed inset-0 bg-[#0B1121]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-[2rem] p-6 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 relative my-auto">
              <button onClick={() => setEditingCompany(null)} className="absolute top-6 right-6 md:top-10 md:right-10 text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2 pr-10">Edit {editingCompany.name}</h2>
              <p className="text-slate-400 font-medium mb-8">Configure rates, status, and company instructions.</p>
              
              <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Company Name</label>
                  <input required type="text" value={editingCompany.name || ""} onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Luton Rate (£)</label>
                  <input type="number" step="0.01" value={editingCompany.luton_price || 0} onChange={(e) => setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Heathrow Rate (£)</label>
                  <input type="number" step="0.01" value={editingCompany.heathrow_price || 0} onChange={(e) => setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <button type="button" onClick={() => setEditingCompany({...editingCompany, is_sold_out: !editingCompany.is_sold_out})} className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${editingCompany.is_sold_out ? 'bg-slate-800 border-slate-700' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      {editingCompany.is_sold_out ? <XCircle className="w-5 h-5 text-slate-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      <span className={`text-[11px] font-black uppercase tracking-widest ${editingCompany.is_sold_out ? 'text-slate-500' : 'text-emerald-400'}`}>{editingCompany.is_sold_out ? 'Sold Out' : 'Active'}</span>
                   </button>
                   <button type="button" onClick={() => setEditingCompany({...editingCompany, is_recommended: !editingCompany.is_recommended})} className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${editingCompany.is_recommended ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0B1121] border-slate-800'}`}>
                      <Star className={`w-5 h-5 ${editingCompany.is_recommended ? 'text-amber-400 fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-600'}`} />
                      <span className={`text-[11px] font-black uppercase tracking-widest ${editingCompany.is_recommended ? 'text-amber-400' : 'text-slate-500'}`}>Mark VIP</span>
                   </button>
                   <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_luton: !editingCompany.operates_at_luton})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center ${editingCompany.operates_at_luton ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[#0B1121] border-slate-800 text-slate-600'}`}>LTN</button>
                      <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_heathrow: !editingCompany.operates_at_heathrow})} className={`p-2 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center ${editingCompany.operates_at_heathrow ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-[#0B1121] border-slate-800 text-slate-600'}`}>LHR</button>
                   </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block">Company Overview</label>
                  <textarea rows={3} value={editingCompany.overview || ""} onChange={(e) => setEditingCompany({...editingCompany, overview: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="A brief description for the customer..." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-1.5"><PlaneTakeoff className="w-3 h-3"/> Arrival Instructions</label>
                  <textarea rows={3} value={editingCompany.on_arrival || ""} onChange={(e) => setEditingCompany({...editingCompany, on_arrival: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Call dispatch team 15 mins before arrival..." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-1.5"><PlaneLanding className="w-3 h-3"/> Return Instructions</label>
                  <textarea rows={3} value={editingCompany.on_return || ""} onChange={(e) => setEditingCompany({...editingCompany, on_return: e.target.value})} className="w-full px-5 py-4 !bg-[#0B1121] border border-slate-800 rounded-xl font-medium text-white text-sm placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Call returning hotspot after clearing customs..." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Address</label>
                  <input type="text" value={editingCompany.address || ""} onChange={(e) => setEditingCompany({...editingCompany, address: e.target.value})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 block flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Postcode</label>
                  <input type="text" value={editingCompany.postcode || ""} onChange={(e) => setEditingCompany({...editingCompany, postcode: e.target.value})} className="w-full px-5 py-3.5 !bg-[#0B1121] border border-slate-800 rounded-xl font-bold text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                </div>

                <div className="md:col-span-2 pt-2">
                  <button type="submit" disabled={isSaving} className="w-full h-14 font-black rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 active:scale-95 disabled:opacity-50 transition-all">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Syncing...' : 'Update Live Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PREMIUM ADD MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[#0B1121]/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] w-full max-w-lg rounded-[2rem] p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-black text-white mb-2">Create Partner</h2>
              <p className="text-slate-400 font-medium text-sm mb-8">Enter initial airport rates.</p>
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
                <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 py-4 mt-2 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all">
                  {isSaving ? "Creating..." : "Create Profile"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}