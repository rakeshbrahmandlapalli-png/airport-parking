"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Loader2, 
  PlaneTakeoff,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      
      {/* DECORATIVE BACKGROUND */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* RETURN TO PUBLIC SITE */}
      <div className="absolute top-8 left-8 z-20">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Public Site
        </Link>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* LOGO & BRANDING */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-blue-600/30 relative">
            <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1 border-2 border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <PlaneTakeoff className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            Ops<span className="text-blue-500">Center</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">
            Authorized Personnel Only
          </p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-5 text-left">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agent Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="email" 
                placeholder="dispatch@aeroparkdirect.com" 
                required 
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                placeholder="••••••••••••" 
                required 
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600 tracking-widest" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-bold leading-relaxed pt-0.5">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 mt-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
            ) : (
              <><ShieldCheck className="w-5 h-5" /> Authenticate Session</>
            )}
          </button>

        </form>
        
        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> 256-bit Encrypted Connection
          </p>
        </div>
      </div>
    </main>
  );
}