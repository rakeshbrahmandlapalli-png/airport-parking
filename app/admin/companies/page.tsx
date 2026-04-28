"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Plus, Save, Car, Bus, Hotel, CheckCircle2, XCircle, 
  Loader2, X, Trash2, Star, MapPin, PlaneTakeoff, Power,
  PlaneLanding, Settings2, LayoutDashboard, Building2, CalendarDays, LogOut, Plane, Network, Filter, MessageSquare
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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const defaultCompany = {
    name: "",
    category: "meet-greet",
    luton_price: 0,
    heathrow_price: 0,
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

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    const cat = c.category?.toLowerCase() || "";
    if (categoryFilter === "MEET_GREET") return cat.includes("meet");
    if (categoryFilter === "PARK_RIDE") return cat.includes("park") || cat.includes("bus");
    if (categoryFilter === "HOTEL") return cat.includes("hotel");
    return true;
  });

  const totalPartners = companies.length;
  const ltnCoverage = companies.filter(c => c.operates_at_luton && c.is_active).length;
  const lhrCoverage = companies.filter(c => c.operates_at_heathrow && c.is_active).length;

  const addReview = (airportCode: 'ltn' | 'lhr') => {
    const rev: Review = { id: Date.now(), author: "Customer Name", rating: 5, comment: "Write review here...", date: new Date().toLocaleDateString() };
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    
    if (editingCompany) {
      setEditingCompany({...editingCompany, [key]: [...(editingCompany[key] || []), rev]});
    } else {
      setNewCompany({...newCompany, [key]: [...(newCompany[key] || []), rev]});
    }
  };

  const removeReview = (airportCode: 'ltn' | 'lhr', index: number) => {
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])];
      updated.splice(index, 1);
      setEditingCompany({...editingCompany, [key]: updated});
    } else {
      const updated = [...(newCompany[key] || [])];
      updated.splice(index, 1);
      setNewCompany({...newCompany, [key]: updated});
    }
  };

  const updateReview = (airportCode: 'ltn' | 'lhr', index: number, field: keyof Review, value: any) => {
    const key = airportCode === 'ltn' ? 'ltn_reviews' : 'lhr_reviews';
    if (editingCompany) {
      const updated = [...(editingCompany[key] || [])];
      updated[index] = { ...updated[index], [field]: value };
      setEditingCompany({...editingCompany, [key]: updated});
    } else {
      const updated = [...(newCompany[key] || [])];
      updated[index] = { ...updated[index], [field]: value };
      setNewCompany({...newCompany, [key]: updated});
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
      <p className="font-black text-slate-400 animate-pulse tracking-widest uppercase text-sm">Syncing Partner Network...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased">
      
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

      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative pb-32 md:pb-10">
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#0f172a] p-5 rounded-2xl text-white shadow-xl border border-slate-800 mx-2 mt-2">
          <div className="flex items-center gap-2 font-black text-lg uppercase tracking-tighter">OPS<span className="text-blue-500">CENTER</span></div>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-lg text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
        </div>

        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10 px-2 md:px-0">
          <div><h1 className="text-3xl md:text-4xl font-black text-white">Partner Network</h1><p className="text-slate-400 font-medium mt-2">Manage availability and live rates.</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center bg-[#0f172a] border border-slate-700/50 rounded-2xl px-5 py-3.5 w-full sm:w-80 group shadow-sm"><Search className="w-5 h-5 text-slate-500 mr-3" /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full !bg-transparent border-none text-sm font-bold outline-none placeholder:text-slate-500 text-white focus:ring-0" /></div>
            <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]"><Plus className="w-4 h-4" /> Add Provider</button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 px-2 md:px-0">
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-blue-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Total Partners</p><p className="text-3xl font-black text-white tracking-tighter">{totalPartners}</p></div>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20"><Network className="w-5 h-5" /></div>
          </div>
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-emerald-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Active LTN</p><p className="text-3xl font-black text-white tracking-tighter">{ltnCoverage}</p></div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20"><Car className="w-5 h-5" /></div>
          </div>
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-purple-900/30 flex items-center justify-between shadow-lg">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-1">Active LHR</p><p className="text-3xl font-black text-white tracking-tighter">{lhrCoverage}</p></div>
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/20"><PlaneTakeoff className="w-5 h-5" /></div>
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col mx-2 md:mx-0">
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3 bg-[#0B1121]/50 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mr-2 shrink-0 flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Filter:</span>
            {['ALL', 'MEET_GREET', 'PARK_RIDE', 'HOTEL'].map(f => (
              <button key={f} onClick={() => setCategoryFilter(f)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${categoryFilter === f ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800'}`}>{f.replace('_', ' & ')}</button>
            ))}
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B1121]">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Partner Details</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">Live Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 text-right tracking-widest">LTN Rate</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-500 text-right tracking-widest">LHR Rate</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCompanies.map((c) => (
                  <tr key={c.id} className={`transition-colors ${c.is_active ? 'hover:bg-slate-800/30' : 'opacity-40 grayscale'}`}>
                    <td className="px-8 py-5">
                      <p className="font-bold text-white text-base">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-slate-500">{c.category?.replace('-', ' ')}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${c.operates_at_luton ? 'text-blue-400 border-blue-500/20' : 'text-slate-700 border-slate-800'}`}>LTN</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${c.operates_at_heathrow ? 'text-purple-400 border-purple-500/20' : 'text-slate-700 border-slate-800'}`}>LHR</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <button onClick={() => handleToggleActive(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-black border ${c.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                         {c.is_active ? 'ACTIVE' : 'OFFLINE'}
                       </button>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-white">£{c.luton_price?.toFixed(2)}</td>
                    <td className="px-8 py-5 text-right font-black text-white">£{c.heathrow_price?.toFixed(2)}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => setEditingCompany(c)} className="p-2.5 bg-slate-800/50 hover:bg-blue-600/20 rounded-xl transition-all border border-slate-700 hover:border-blue-500/30 shadow-sm"><Settings2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-slate-800/50 hover:bg-red-600/20 rounded-xl transition-all border border-slate-700 hover:border-red-500/30 text-slate-500 hover:text-red-400 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1121] via-[#0B1121]/90 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl h-16 flex items-center justify-around px-2 pointer-events-auto shadow-2xl">
          <Link href="/admin" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center flex-1 gap-1 text-blue-500"><Building2 className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Ops</span></Link>
          <div className="relative -top-4"><button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border-4 border-[#0B1121] active:scale-90 transition-transform"><Plus className="w-7 h-7 text-white" /></button></div>
          <Link href="/admin/schedule" className="flex flex-col items-center justify-center flex-1 gap-1 text-slate-500"><CalendarDays className="w-5 h-5" /><span className="text-[8px] font-black uppercase">Plan</span></Link>
        </nav>
      </div>

      {/* MODAL SECTION (ADD & EDIT) */}
      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#0B1121]/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-5xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col custom-scrollbar">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center shrink-0 sticky top-0 bg-[#0f172a] z-10 shadow-lg">
              <h2 className="text-2xl font-black text-white">{editingCompany ? `Edit Partner` : 'Add New Provider'}</h2>
              <button onClick={() => {setEditingCompany(null); setShowAddModal(false);}} className="p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Brand Name</label><input required type="text" value={editingCompany?.name || newCompany.name} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, name: e.target.value}) : setNewCompany({...newCompany, name: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold outline-none focus:border-blue-500" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Category</label><select value={editingCompany?.category || newCompany.category} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, category: e.target.value}) : setNewCompany({...newCompany, category: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold outline-none"><option value="meet-greet">Meet & Greet</option><option value="park-ride">Park & Ride</option><option value="hotel">Hotel & Parking</option></select></div>
                <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-500 block mb-2 tracking-widest ml-1">Marketing Overview</label><textarea rows={2} value={editingCompany?.overview || newCompany.overview} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, overview: e.target.value}) : setNewCompany({...newCompany, overview: e.target.value})} className="w-full bg-[#0B1121] border border-slate-800 rounded-xl px-5 py-3.5 text-white text-sm outline-none focus:border-blue-500" /></div>
              </div>

              {/* SPLIT AIRPORTS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* LUTON CONTROLS */}
                <div className="p-6 bg-[#0B1121] rounded-3xl border border-blue-900/30 space-y-4">
                  <div className="flex justify-between items-center mb-2"><h3 className="text-blue-400 font-black text-sm uppercase flex items-center gap-2"><Car className="w-4 h-4"/> LUTON (LTN)</h3><input type="checkbox" checked={editingCompany?.operates_at_luton ?? newCompany.operates_at_luton} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_luton: e.target.checked}) : setNewCompany({...newCompany, operates_at_luton: e.target.checked})} className="accent-blue-500 w-5 h-5" /></div>
                  <input type="number" placeholder="Daily Rate £" value={editingCompany?.luton_price ?? newCompany.luton_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value)}) : setNewCompany({...newCompany, luton_price: parseFloat(e.target.value)})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500" />
                  <div className="flex gap-2">
                     <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_sold_out: !editingCompany.ltn_sold_out}) : setNewCompany({...newCompany, ltn_sold_out: !newCompany.ltn_sold_out})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${editingCompany?.ltn_sold_out || newCompany.ltn_sold_out ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>SOLD OUT</button>
                     <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, ltn_featured: !editingCompany.ltn_featured}) : setNewCompany({...newCompany, ltn_featured: !newCompany.ltn_featured})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${editingCompany?.ltn_featured || newCompany.ltn_featured ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>FEATURED</button>
                  </div>
                  <textarea placeholder="Arrival Instructions" value={editingCompany?.on_arrival_ltn || newCompany.on_arrival_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_ltn: e.target.value}) : setNewCompany({...newCompany, on_arrival_ltn: e.target.value})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500" rows={2} />
                  <textarea placeholder="Return Instructions" value={editingCompany?.on_return_ltn || newCompany.on_return_ltn} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_ltn: e.target.value}) : setNewCompany({...newCompany, on_return_ltn: e.target.value})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500" rows={2} />
                  
                  {/* LUTON REVIEWS */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare className="w-3 h-3 inline mr-1 text-blue-500"/> LTN Reviews</span><button type="button" onClick={() => addReview('ltn')} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[9px] font-black uppercase">+ Review</button></div>
                    <div className="space-y-3">
                      {(editingCompany?.ltn_reviews || newCompany.ltn_reviews || []).map((rev: any, idx: number) => (
                        <div key={rev.id} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 space-y-2 relative">
                          <button type="button" onClick={() => removeReview('ltn', idx)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                          <div className="flex gap-2 w-[85%]">
                            <input value={rev.author} onChange={(e) => updateReview('ltn', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 text-white text-xs font-bold outline-none" placeholder="Author" />
                            <select value={rev.rating} onChange={(e) => updateReview('ltn', idx, 'rating', parseInt(e.target.value))} className="w-1/2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white outline-none"><option value="5">5 Star</option><option value="4">4 Star</option><option value="3">3 Star</option><option value="2">2 Star</option><option value="1">1 Star</option></select>
                          </div>
                          <textarea value={rev.comment} onChange={(e) => updateReview('ltn', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-400 text-xs outline-none" rows={2} placeholder="Comment..." />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* HEATHROW CONTROLS */}
                <div className="p-6 bg-[#0B1121] rounded-3xl border border-purple-900/30 space-y-4">
                  <div className="flex justify-between items-center mb-2"><h3 className="text-purple-400 font-black text-sm uppercase flex items-center gap-2"><PlaneTakeoff className="w-4 h-4"/> HEATHROW (LHR)</h3><input type="checkbox" checked={editingCompany?.operates_at_heathrow ?? newCompany.operates_at_heathrow} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, operates_at_heathrow: e.target.checked}) : setNewCompany({...newCompany, operates_at_heathrow: e.target.checked})} className="accent-purple-500 w-5 h-5" /></div>
                  <input type="number" placeholder="Daily Rate £" value={editingCompany?.heathrow_price ?? newCompany.heathrow_price} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value)}) : setNewCompany({...newCompany, heathrow_price: parseFloat(e.target.value)})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:border-purple-500" />
                  <div className="flex gap-2">
                     <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_sold_out: !editingCompany.lhr_sold_out}) : setNewCompany({...newCompany, lhr_sold_out: !newCompany.lhr_sold_out})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${editingCompany?.lhr_sold_out || newCompany.lhr_sold_out ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>SOLD OUT</button>
                     <button type="button" onClick={() => editingCompany ? setEditingCompany({...editingCompany, lhr_featured: !editingCompany.lhr_featured}) : setNewCompany({...newCompany, lhr_featured: !newCompany.lhr_featured})} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${editingCompany?.lhr_featured || newCompany.lhr_featured ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>FEATURED</button>
                  </div>
                  <textarea placeholder="Arrival Instructions" value={editingCompany?.on_arrival_lhr || newCompany.on_arrival_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_arrival_lhr: e.target.value}) : setNewCompany({...newCompany, on_arrival_lhr: e.target.value})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500" rows={2} />
                  <textarea placeholder="Return Instructions" value={editingCompany?.on_return_lhr || newCompany.on_return_lhr} onChange={(e) => editingCompany ? setEditingCompany({...editingCompany, on_return_lhr: e.target.value}) : setNewCompany({...newCompany, on_return_lhr: e.target.value})} className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500" rows={2} />
                  
                  {/* HEATHROW REVIEWS */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><MessageSquare className="w-3 h-3 inline mr-1 text-purple-500"/> LHR Reviews</span><button type="button" onClick={() => addReview('lhr')} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-lg text-[9px] font-black uppercase">+ Review</button></div>
                    <div className="space-y-3">
                      {(editingCompany?.lhr_reviews || newCompany.lhr_reviews || []).map((rev: any, idx: number) => (
                        <div key={rev.id} className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 space-y-2 relative">
                          <button type="button" onClick={() => removeReview('lhr', idx)} className="absolute top-3 right-3 text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                          <div className="flex gap-2 w-[85%]">
                            <input value={rev.author} onChange={(e) => updateReview('lhr', idx, 'author', e.target.value)} className="w-1/2 bg-transparent border-b border-slate-700 text-white text-xs font-bold outline-none" placeholder="Author" />
                            <select value={rev.rating} onChange={(e) => updateReview('lhr', idx, 'rating', parseInt(e.target.value))} className="w-1/2 bg-slate-900 border border-slate-700 rounded-md text-xs text-white outline-none"><option value="5">5 Star</option><option value="4">4 Star</option><option value="3">3 Star</option><option value="2">2 Star</option><option value="1">1 Star</option></select>
                          </div>
                          <textarea value={rev.comment} onChange={(e) => updateReview('lhr', idx, 'comment', e.target.value)} className="w-full bg-transparent text-slate-400 text-xs outline-none" rows={2} placeholder="Comment..." />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-[#0f172a] pt-4 pb-4 shrink-0 border-t border-slate-800 flex gap-4">
                <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                  {isSaving ? "SYNCING..." : "SAVE & PUSH LIVE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}