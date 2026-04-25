"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, Save, Car, Bus, Hotel, CheckCircle2, XCircle, 
  Loader2, X, AlertCircle, Trash2, Star, Edit3, MapPin, Info, 
  PlaneTakeoff, PlaneLanding, Settings2 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminCompaniesPage() {
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

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('companies')
      .insert([newCompany]);

    if (!error) {
      setShowAddModal(false);
      setNewCompany({ 
        name: "", category: "meet-greet", luton_price: 0, heathrow_price: 0, 
        is_sold_out: false, is_recommended: false, operates_at_luton: true, operates_at_heathrow: true,
        overview: "", on_arrival: "", on_return: "", address: "", postcode: ""
      });
      await fetchCompanies();
    } else {
      alert("Error adding company: " + error.message);
    }
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
    
    const { error } = await supabase
      .from('companies')
      .update(editingCompany)
      .eq('id', editingCompany.id);
    
    if (!error) {
      setEditingCompany(null);
      fetchCompanies();
    } else {
      alert(error.message);
    }
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 pb-32 font-sans text-slate-900 text-[13px] antialiased">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operator Dashboard</h1>
          <p className="text-slate-500 font-medium">Add providers, manage airport coverage, and edit instructions.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            {/* 🟢 FIXED: Adjusted left position and padding to fix overlap */}
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search partner network..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 text-sm"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-600/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Provider Profile
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Partner Details</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Airport Coverage</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LTN Rate</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LHR Rate</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">VIP</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-10 py-5">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100/60 text-slate-500 flex items-center justify-center shrink-0 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      {company.category === 'meet-greet' ? <Car className="w-6 h-6" /> : company.category === 'park-ride' ? <Bus className="w-6 h-6" /> : <Hotel className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-950 text-base leading-none mb-1">{company.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{company.category?.replace('-', ' ')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex justify-center gap-1.5">
                     <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${company.operates_at_luton ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-300'}`}>LTN</span>
                     <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${company.operates_at_heathrow ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-300'}`}>LHR</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">£{company.luton_price?.toFixed(2) || '0.00'}</td>
                <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">£{company.heathrow_price?.toFixed(2) || '0.00'}</td>
                <td className="px-8 py-5 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${company.is_sold_out ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    {company.is_sold_out ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {company.is_sold_out ? 'Sold Out' : 'Active'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                   <button 
                    onClick={() => handleToggleVip(company)} 
                    className={`p-1.5 rounded-lg transition-colors ${company.is_recommended ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                   >
                     <Star className={`w-5 h-5 ${company.is_recommended ? 'fill-current' : ''}`} />
                   </button>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <button 
                      onClick={() => setEditingCompany(company)} 
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-bold border border-slate-200 shadow-sm transition-colors text-xs"
                    >
                      <Settings2 className="w-4 h-4" /> Full Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(company.id)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SINGLE, POWERFUL EDIT MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl relative my-auto">
            <button onClick={() => setEditingCompany(null)} className="absolute top-10 right-10 text-slate-400 hover:text-slate-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Edit {editingCompany.name}</h2>
            <p className="text-slate-500 font-medium mb-10">Configure rates, status, and company instructions.</p>
            
            <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Company Name</label>
                <input required type="text" value={editingCompany.name || ""} onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-base" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Luton Rate (£)</label>
                <input type="number" step="0.01" value={editingCompany.luton_price || 0} onChange={(e) => setEditingCompany({...editingCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Heathrow Rate (£)</label>
                <input type="number" step="0.01" value={editingCompany.heathrow_price || 0} onChange={(e) => setEditingCompany({...editingCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900" />
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-3">
                 <button type="button" onClick={() => setEditingCompany({...editingCompany, is_sold_out: !editingCompany.is_sold_out})} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${editingCompany.is_sold_out ? 'bg-slate-100 border-slate-200' : 'bg-emerald-50 border-emerald-100'}`}>
                    {editingCompany.is_sold_out ? <XCircle className="w-5 h-5 text-slate-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    <span className={`text-[11px] font-black uppercase tracking-widest ${editingCompany.is_sold_out ? 'text-slate-400' : 'text-emerald-700'}`}>{editingCompany.is_sold_out ? 'Sold Out' : 'Active'}</span>
                 </button>
                 <button type="button" onClick={() => setEditingCompany({...editingCompany, is_recommended: !editingCompany.is_recommended})} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${editingCompany.is_recommended ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}`}>
                    <Star className={`w-5 h-5 ${editingCompany.is_recommended ? 'text-amber-500 fill-current' : 'text-slate-300'}`} />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${editingCompany.is_recommended ? 'text-amber-700' : 'text-slate-400'}`}>Mark VIP</span>
                 </button>
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_luton: !editingCompany.operates_at_luton})} className={`p-2 rounded-lg text-[9px] font-black uppercase border transition-all ${editingCompany.operates_at_luton ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>LTN</button>
                    <button type="button" onClick={() => setEditingCompany({...editingCompany, operates_at_heathrow: !editingCompany.operates_at_heathrow})} className={`p-2 rounded-lg text-[9px] font-black uppercase border transition-all ${editingCompany.operates_at_heathrow ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>LHR</button>
                 </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Company Overview</label>
                <textarea rows={3} value={editingCompany.overview || ""} onChange={(e) => setEditingCompany({...editingCompany, overview: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm" placeholder="A brief description for the customer..." />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5"><PlaneTakeoff className="w-3 h-3"/> Arrival Instructions</label>
                <textarea rows={4} value={editingCompany.on_arrival || ""} onChange={(e) => setEditingCompany({...editingCompany, on_arrival: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm" placeholder="Call dispatch team 15 mins before arrival..." />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5"><PlaneLanding className="w-3 h-3"/> Return Instructions</label>
                <textarea rows={4} value={editingCompany.on_return || ""} onChange={(e) => setEditingCompany({...editingCompany, on_return: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-sm" placeholder="Call returning hotspot after clearing customs..." />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Address</label>
                <input type="text" value={editingCompany.address || ""} onChange={(e) => setEditingCompany({...editingCompany, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Postcode</label>
                <input type="text" value={editingCompany.postcode || ""} onChange={(e) => setEditingCompany({...editingCompany, postcode: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
              </div>

              <div className="md:col-span-2">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full h-14 font-black rounded-xl shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-[11px] bg-slate-950 hover:bg-blue-600 text-white shadow-slate-900/10 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Syncing Profile...' : 'Update Live Company Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD COMPANY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Create Partner Profile</h2>
            <p className="text-slate-500 font-medium mb-8">Enter name, category, and initial airport rates.</p>
            <form onSubmit={handleAddCompany} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Company Name</label>
                <input required type="text" value={newCompany.name} onChange={(e) => setNewCompany({...newCompany, name: e.target.value})} placeholder="e.g. Heathrow Express VIP" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Category</label>
                <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 appearance-none outline-none focus:ring-2 focus:ring-blue-500" value={newCompany.category} onChange={(e) => setNewCompany({...newCompany, category: e.target.value})}>
                   <option value="meet-greet">Meet & Greet</option>
                   <option value="park-ride">Park & Ride</option>
                   <option value="hotel">Hotel & Parking</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">LTN Rate (£)</label>
                  <input type="number" step="0.01" value={newCompany.luton_price} onChange={(e) => setNewCompany({...newCompany, luton_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">LHR Rate (£)</label>
                  <input type="number" step="0.01" value={newCompany.heathrow_price} onChange={(e) => setNewCompany({...newCompany, heathrow_price: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/20 transition-all">
                {isSaving ? "Creating Profile..." : "Create Provider Profile"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}