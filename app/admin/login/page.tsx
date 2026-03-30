"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Loader2 } from "lucide-react";

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-xl p-10 text-center border border-slate-100">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-blue-200">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Admin Portal</h1>
        <form onSubmit={handleLogin} className="space-y-4 text-left mt-8">
          <input type="email" placeholder="Email" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify Identity"}
          </button>
        </form>
      </div>
    </main>
  );
}