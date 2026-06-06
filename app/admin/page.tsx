"use client";

/**
 * AeroPark Direct - Command Center v12.8 (Advanced Visual Overhaul)
 * ─────────────────────────────────────────────────────────────────
 * ✅ WHOLE CODE PRESERVED - EVERY FEATURE & HANDLER INTACT
 * ✅ ADVANCED COOL LOOK - glow effects, glassmorphism, depth, gradients
 * ✅ ORIGINAL COLOR DNA KEPT (#0B1120 / #0F1523 / #131A2B / blue accent)
 * Visual layer only — no logic touched.
 */

import { useEffect, useState, useMemo, Suspense } from "react";
import { supabase } from "@/app/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";

import { 
  Users, Trash2, LogOut, Phone, Car, Plane, MessageCircle, 
  Search, TrendingUp, MapPin, Loader2, Filter, 
  LayoutDashboard, Plus, Building2, X, Save, Clock, 
  CheckCircle2, AlertCircle, PlaneLanding, PlaneTakeoff, 
  XCircle, ChevronDown, Download, Briefcase, Receipt, Star, 
  Database, Smartphone, Wallet, Settings2, Activity, Tags, 
  Zap, PiggyBank
} from "lucide-react";

function DashboardContent() {
  // --- 1. CORE APPLICATION STATE ---
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- 2. SEARCH & FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL"); 
  const [companyFilter, setCompanyFilter] = useState("ALL"); 
  const [serviceFilter, setServiceFilter] = useState("ALL");
  
  const router = useRouter();

  // --- 3. MODAL STATE ---
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  // --- 3a. DOSSIER + SORT STATE (new design) ---
  const [viewBooking, setViewBooking] = useState<any>(null); // booking shown in the dossier modal
  const [sortKey, setSortKey] = useState<string>("NEWEST"); // NEW FEATURE 1: sortable grid
  const [assignSel, setAssignSel] = useState<Record<string, string>>({}); // per-booking provider pick for manual transfer

  const defaultNewBooking = {
    full_name: "", 
    email: "", 
    phone_number: "", 
    license_plate: "", 
    car_make: "", 
    car_color: "", 
    flight_number: "", 
    dropoff_date: "", 
    dropoff_time: "", 
    pickup_date: "", 
    pickup_time: "", 
    total_price: 0, 
    status: "confirmed", 
    airport: "Luton Airport (LTN)", 
    terminal: "Main Terminal", 
    company_id: "ALL", 
    service_type: "Meet & Greet", 
    fast_track_count: 0, 
  };
  
  const [newBooking, setNewBooking] = useState<any>(defaultNewBooking);

  // --- 3b. TOAST + CONFIRM STATE ---
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; msg: string }[]>([]);
  const [confirmState, setConfirmState] = useState<{ title: string; body: string; confirmLabel: string; danger: boolean; onConfirm: () => void } | null>(null);

  const notify = (type: "success" | "error" | "info", msg: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const askConfirm = (opts: { title: string; body: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) => {
    setConfirmState({
      title: opts.title,
      body: opts.body,
      confirmLabel: opts.confirmLabel || "Confirm",
      danger: opts.danger || false,
      onConfirm: opts.onConfirm,
    });
  };

  // --- 4. DATA FETCHING & REAL-TIME SYNC ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/admin/login"); 
      } else {
        fetchDashboardData();
      }
    };
    checkUser();

    const subscription = supabase
      .channel('ops-dispatch-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, companiesRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("*").order("name", { ascending: true })
      ]);
      
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch (err) {
      console.error("Critical System Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. 🧮 DYNAMIC PRICING CALCULATOR ---
  useEffect(() => {
    if (newBooking.dropoff_date && newBooking.pickup_date) {
      const start = new Date(newBooking.dropoff_date);
      const end = new Date(newBooking.pickup_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (totalDays > 0) {
        let baseRate = 52.98; 
        let t1Rate = 1.99;
        let t2Rate = 2.99;

        if (newBooking.company_id !== "ALL") {
          const comp = companies.find(c => c.id === newBooking.company_id);
          if (comp) {
            baseRate = newBooking.airport.includes("Heathrow") 
              ? Number(comp.heathrow_price || baseRate) 
              : Number(comp.luton_price || baseRate);
            t1Rate = Number(comp.tier1_extra_rate ?? 1.99);
            t2Rate = Number(comp.tier2_extra_rate ?? 2.99);
          }
        }

        let calculatedTotal = baseRate;
        const extraDays = totalDays - 1;
        
        if (extraDays > 0) {
          const t1Days = Math.min(extraDays, 5);
          calculatedTotal += t1Days * t1Rate;
          
          if (extraDays > 5) {
            const t2Days = extraDays - 5;
            calculatedTotal += t2Days * t2Rate;
          }
        }

        if (newBooking.total_price !== Number(calculatedTotal.toFixed(2))) {
          setNewBooking((prev: any) => ({...prev, total_price: Number(calculatedTotal.toFixed(2))}));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBooking.dropoff_date, newBooking.pickup_date, newBooking.company_id, newBooking.airport]);

  // --- 6. CORE LOGIC HANDLERS ---
  const deleteBooking = (id: string, ref?: string) => {
    askConfirm({
      title: "Permanent Deletion",
      body: `This will permanently delete booking ${ref || id}. This cannot be undone.`,
      confirmLabel: "Delete Record",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("bookings").delete().eq("id", id);
        if (error) {
          notify("error", `Delete failed: ${error.message}`);
        } else {
          setBookings(bookings.filter((b) => b.id !== id));
          notify("success", "Booking deleted.");
        }
      },
    });
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedCompanyId = editingBooking?.company_id === "ALL" ? null : (editingBooking?.company_id || null);

      const { error } = await supabase.from('bookings').update({
        full_name: editingBooking?.full_name || null,
        email: editingBooking?.email || null,
        phone_number: editingBooking?.phone_number || null,
        license_plate: editingBooking?.license_plate || null,
        car_make: editingBooking?.car_make || null,
        car_color: editingBooking?.car_color || null,
        flight_number: editingBooking?.flight_number || null,
        dropoff_date: editingBooking?.dropoff_date || null, 
        dropoff_time: editingBooking?.dropoff_time || null,
        pickup_date: editingBooking?.pickup_date || null,
        pickup_time: editingBooking?.pickup_time || null,
        total_price: Number(editingBooking?.total_price || 0),
        status: editingBooking?.status || 'pending',
        airport: editingBooking?.airport || null,
        terminal: editingBooking?.terminal || null,
        company_id: updatedCompanyId, 
        service_type: editingBooking?.service_type || "Meet & Greet",
        fast_track_count: Number(editingBooking?.fast_track_count || 0)
      }).eq('id', editingBooking.id);
      
      if (error) throw error;
      
      setEditingBooking(null);
      await fetchDashboardData();
      notify("success", "Booking updated.");
    } catch (error: any) {
      notify("error", `Update error: ${error.message}`);
    } finally {
      setIsSaving(false); 
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const booking_ref = generateRef();
      const payload = { ...newBooking, booking_ref };
      if (payload.company_id === "ALL") payload.company_id = null; 
      
      if (!payload.dropoff_date) payload.dropoff_date = null;
      if (!payload.dropoff_time) payload.dropoff_time = null;
      if (!payload.pickup_date) payload.pickup_date = null;
      if (!payload.pickup_time) payload.pickup_time = null;
      payload.fast_track_count = Number(payload.fast_track_count || 0); 
      
      const { error } = await supabase.from('bookings').insert([payload]);
      
      if (error) throw error;

      if (!payload.flight_number || payload.flight_number.trim() === "") {
        fetch('/api/twilio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: payload.full_name,
            phone_number: payload.phone_number,
            booking_ref: payload.booking_ref,
            flight_number: payload.flight_number,
            car_make: payload.car_make
          })
        }).catch(err => console.error("Twilio API failed:", err));
      }
      
      setShowManualModal(false);
      setNewBooking(defaultNewBooking);
      await fetchDashboardData();
      notify("success", `Booking ${booking_ref} created.`);
    } catch (error: any) {
      notify("error", error.message);
    } finally {
      setIsSaving(false); 
    }
  };

  const sendManualEmail = (booking: any, type: 'provider' | 'customer') => {
    const label = type === 'provider' ? 'Provider' : 'Customer';
    askConfirm({
      title: `Dispatch ${label} Email`,
      body: `Send a manual ${type} email for booking ${booking.booking_ref}?`,
      confirmLabel: "Send Email",
      onConfirm: async () => {
        try {
          const payload = {
            booking: booking,
            manual_provider_notify: type === 'provider',
            manual_customer_notify: type === 'customer',
          };
          const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            notify("success", `${label} email dispatched.`);
          } else {
            notify("error", `Failed to send ${type} email. Check server logs.`);
          }
        } catch (error) {
          console.error("Manual Email Error:", error);
          notify("error", "Critical routing error while sending email.");
        }
      },
    });
  };

  // Manually transfer a booking to a chosen provider and email them the job in
  // one action — used for AeroPark Direct bookings you assign after payment.
  const assignAndNotify = (booking: any, companyId: string) => {
    if (!companyId) { notify("error", "Pick a provider first."); return; }
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) { notify("error", "Provider not found."); return; }
    askConfirm({
      title: "Assign & Notify Provider",
      body: `Assign ${booking.booking_ref} to ${comp.name} and email them the job${comp.email ? ` at ${comp.email}` : " (no operator email set — will go to info@)"}?`,
      confirmLabel: "Assign & Email",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("bookings").update({ company_id: companyId }).eq("id", booking.id);
          if (error) { notify("error", `Assign failed: ${error.message}`); return; }

          const res = await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking: { ...booking, company_id: companyId }, manual_provider_notify: true }),
          });

          if (res.ok) notify("success", `Assigned to ${comp.name} & emailed${comp.email ? "" : " (to info@ — set their email!)"}.`);
          else notify("error", "Assigned, but the email failed. Check server logs.");

          fetchDashboardData();
        } catch (e: any) {
          notify("error", "Critical error during assignment.");
          console.error("assignAndNotify error:", e);
        }
      },
    });
  };

  const sendToWhatsApp = (booking: any) => {
    const message = `*AERO OPS DISPATCH: ${booking.booking_ref}*\n👤 Name: ${booking.full_name}\n🚗 Car: ${booking.car_color || ''} ${booking.car_make} [${booking.license_plate}]\n📱 Mob: ${booking.phone_number}\n📍 Airport: ${booking.airport}\n📅 Inbound: ${formatDate(booking.dropoff_date)} @ ${booking.dropoff_time}\n📅 Return: ${formatDate(booking.pickup_date)} @ ${booking.pickup_time}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRequestReview = (booking: any) => {
    if (!booking.email) {
      notify("error", "This booking has no email address on file.");
      return;
    }
    askConfirm({
      title: "Request Customer Review",
      body: `Send a review request email to ${booking.full_name || "the customer"} (${booking.email})?`,
      confirmLabel: "Send Request",
      onConfirm: async () => {
        try {
          const response = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_request: true, booking }),
          });
          if (response.ok) {
            notify("success", `Review request sent to ${booking.email}.`);
          } else {
            notify("error", "Failed to send review request. Check server logs.");
          }
        } catch (error) {
          console.error("Review Request Error:", error);
          notify("error", "Critical routing error while sending review request.");
        }
      },
    });
  };

  const exportToCSV = () => {
    let csv = "Reference,Customer,Email,Phone,Plate,Make,Airport,Terminal,Flight,Inbound Date,Inbound Time,Outbound Date,Outbound Time,Total Paid,Status,Service Type,Partner,Fast Track\n";
    
    filteredBookings.forEach(b => {
      const partner = getCompanyName(b.company_id);
      csv += `"${b.booking_ref}","${b.full_name}","${b.email}","${b.phone_number}","${b.license_plate}","${b.car_make}","${b.airport}","${b.terminal}","${b.flight_number}","${b.dropoff_date}","${b.dropoff_time}","${b.pickup_date}","${b.pickup_time}","${b.total_price}","${b.status}","${b.service_type || 'Meet & Greet'}","${partner}","${b.fast_track_count || 0}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AeroPark_Registry_${todayStrISO}.csv`);
    link.click();
  };

  // NEW FEATURE 2: inline quick-status change (no full edit modal needed)
  const quickStatus = async (b: any, newStatus: string) => {
    if (!b || (b.status?.toLowerCase() || "pending") === newStatus.toLowerCase()) return;
    // optimistic local update
    setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: newStatus } : x)));
    if (viewBooking?.id === b.id) setViewBooking({ ...viewBooking, status: newStatus });
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", b.id);
    if (error) {
      notify("error", `Status update failed: ${error.message}`);
      await fetchDashboardData();
    } else {
      notify("success", `${b.booking_ref} → ${newStatus}`);
    }
  };

  // --- 7. UI HELPERS ---
  const todayDate = new Date();
  const todayStrISO = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  // 🟢 Collision-safe, browser-native booking ref
  const generateRef = (): string => {
    try {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      return "APD-" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    } catch {
      return "APD-" + Date.now().toString(36).toUpperCase();
    }
  };

  const getCompanyName = (id: string) => {
    if (!id) return "AeroPark Direct";
    const match = companies.find(c => c.id === id);
    return match ? match.name : "AeroPark Direct";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBC";
    // Parse YYYY-MM-DD as a LOCAL date to avoid UTC day-shift
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
    const d = isoMatch
      ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
      : new Date(dateStr);
    if (isNaN(d.getTime())) return "TBC";
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    const classes = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-max transition-all backdrop-blur-sm";
    
    if (s === "confirmed") return <div className={`${classes} bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_-2px_rgba(59,130,246,0.4)]`}><CheckCircle2 className="w-3.5 h-3.5"/> Confirmed</div>;
    if (s === "parked") return <div className={`${classes} bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_-2px_rgba(168,85,247,0.4)]`}><Car className="w-3.5 h-3.5"/> Parked</div>;
    if (s === "completed") return <div className={`${classes} bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_-2px_rgba(16,185,129,0.4)]`}><CheckCircle2 className="w-3.5 h-3.5"/> Completed</div>;
    if (s === "cancelled") return <div className={`${classes} bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_12px_-2px_rgba(239,68,68,0.4)]`}><XCircle className="w-3.5 h-3.5"/> Voided</div>;
    return <div className={`${classes} bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_-2px_rgba(245,158,11,0.4)]`}><Clock className="w-3.5 h-3.5"/> Pending</div>;
  };

  // Status → row "spine" colour (lets operators scan status down the table at a glance)
  const statusAccentColor = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    if (s === "confirmed") return "#3b82f6"; // blue
    if (s === "parked") return "#a855f7";    // purple
    if (s === "completed") return "#10b981"; // emerald
    if (s === "cancelled") return "#ef4444"; // red
    return "#f59e0b";                          // amber (pending)
  };

  // --- 8. FILTER ENGINE ---
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const safeSearch = searchTerm.trim().toLowerCase();
      const matchText = !safeSearch || 
                        (b.full_name || '').toLowerCase().includes(safeSearch) ||
                        (b.booking_ref || '').toLowerCase().includes(safeSearch) ||
                        (b.license_plate || '').toLowerCase().includes(safeSearch) ||
                        (b.email || '').toLowerCase().includes(safeSearch) ||
                        (b.phone_number || '').toLowerCase().includes(safeSearch);
                        
      if (!matchText) return false;
      if (airportFilter !== "ALL" && !b.airport?.toLowerCase().includes(airportFilter.toLowerCase())) return false;
      if (statusFilter !== "ALL" && (b.status?.toLowerCase() || "pending") !== statusFilter.toLowerCase()) return false;
      if (timeFilter === "TODAY_DROP" && !String(b.dropoff_date).startsWith(todayStrISO)) return false;
      if (timeFilter === "TODAY_PICK" && !String(b.pickup_date).startsWith(todayStrISO)) return false;
      
      if (serviceFilter !== "ALL") {
        const sType = b.service_type || "Meet & Greet";
        if (sType.toLowerCase() !== serviceFilter.toLowerCase()) return false;
      }

      if (companyFilter !== "ALL") {
        const isDirect = !b.company_id || !companies.some(c => c.id === b.company_id);
        if (companyFilter === "DIRECT") { 
          if (!isDirect) return false; 
        } else { 
          if (b.company_id !== companyFilter) return false; 
        }
      }
      return true;
    });
  }, [bookings, searchTerm, airportFilter, statusFilter, timeFilter, companyFilter, serviceFilter, todayStrISO, companies]);

  // NEW FEATURE 1: sort the filtered grid by the chosen key
  const displayBookings = useMemo(() => {
    const arr = [...filteredBookings];
    const t = (d?: string) => (d ? new Date(d).getTime() || 0 : 0);
    switch (sortKey) {
      case "PRICE_HIGH":
        return arr.sort((a, b) => Number(b.total_price || 0) - Number(a.total_price || 0));
      case "PRICE_LOW":
        return arr.sort((a, b) => Number(a.total_price || 0) - Number(b.total_price || 0));
      case "INBOUND":
        return arr.sort((a, b) => t(a.dropoff_date) - t(b.dropoff_date));
      case "RETURN":
        return arr.sort((a, b) => t(a.pickup_date) - t(b.pickup_date));
      case "NAME":
        return arr.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      case "NEWEST":
      default:
        return arr.sort((a, b) => t(b.created_at) - t(a.created_at));
    }
  }, [filteredBookings, sortKey]);

  // Derived Metrics
  const totalRevenue = filteredBookings
    .filter(b => ['confirmed', 'completed', 'parked'].includes(b.status?.toLowerCase()))
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    
  const arrivalsToday = filteredBookings.filter(b => b.dropoff_date && String(b.dropoff_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;
  const returnsToday = filteredBookings.filter(b => b.pickup_date && String(b.pickup_date).startsWith(todayStrISO) && b.status !== 'cancelled').length;

  // --- Extra context metrics (presentational only) ---
  const paidCount = filteredBookings.filter(b => ['confirmed', 'completed', 'parked'].includes(b.status?.toLowerCase())).length;
  const pendingCount = filteredBookings.filter(b => (b.status?.toLowerCase() || 'pending') === 'pending').length;
  const avgBookingValue = paidCount > 0 ? totalRevenue / paidCount : 0;
  const activeFilterCount = [
    searchTerm.trim() !== "",
    airportFilter !== "ALL",
    statusFilter !== "ALL",
    timeFilter !== "ALL",
    companyFilter !== "ALL",
    serviceFilter !== "ALL",
  ].filter(Boolean).length;
  const resetFilters = () => {
    setSearchTerm("");
    setAirportFilter("ALL");
    setStatusFilter("ALL");
    setTimeFilter("ALL");
    setCompanyFilter("ALL");
    setServiceFilter("ALL");
  };
  const todayPretty = todayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="relative z-10">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
      </div>
      <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6 relative z-10">Initializing Command Hub...</p>
    </div>
  );

  // ADVANCED GLASS INPUT STYLES (same colors, cooler finish)
  const inputStyle = "w-full bg-[#1A2235]/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/60 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] [-webkit-text-fill-color:white] placeholder:text-slate-500";
  const selectStyle = "w-full appearance-none bg-[#1A2235]/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/60 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] [-webkit-text-fill-color:white]";
  const yellowInputStyle = "w-full bg-[#FACC15] border-2 border-yellow-500 rounded-xl px-5 py-4 text-black text-xl text-center font-black uppercase outline-none focus:ring-4 focus:ring-yellow-500/30 transition-all shadow-[0_0_20px_-4px_rgba(250,204,21,0.5)] [-webkit-text-fill-color:black] placeholder:text-yellow-700/50";

  // ── MASTER–DETAIL: the right-hand detail panel for the selected booking ──────
  const detailRow = (label: string, value: any, accent = "text-white") => (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm font-bold text-right ${accent}`}>{value || <span className="text-slate-600">—</span>}</span>
    </div>
  );

  const renderDetail = (b: any) => {
    if (!b) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center py-24 opacity-40">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center mb-5 bg-slate-900/40">
            <LayoutDashboard className="w-9 h-9 text-slate-600" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">No record selected</p>
          <p className="text-xs font-bold text-slate-600 mt-2">Choose a booking from the list to view its dossier.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 bg-[#0F1523]/70 relative" style={{ boxShadow: `inset 4px 0 0 0 ${statusAccentColor(b.status)}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-black font-mono text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20 w-max">{b.booking_ref}</span>
              <h3 className="text-2xl font-black text-white tracking-tight">{b.full_name || "Unnamed Client"}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(b.status)}
                {b.fast_track_count > 0 && (
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {b.fast_track_count}× Fast Track
                  </span>
                )}
              </div>
            </div>
            {/* close the dossier modal */}
            <button onClick={() => setViewBooking(null)} className="p-2.5 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white border border-slate-700/50 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* PRICE BANNER */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-[#131A2B] border border-emerald-500/30 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Transaction Value</p>
              <p className="text-3xl font-black text-white tracking-tight tabular-nums mt-1">£{Number(b.total_price || 0).toFixed(2)}</p>
            </div>
            <Wallet className="w-12 h-12 text-emerald-500/20" />
          </div>

          {/* CONTACT */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Customer</p>
            <div className="bg-[#1A2235]/60 border border-slate-800 rounded-2xl px-5 py-2">
              {detailRow("Phone", b.phone_number)}
              {detailRow("Email", b.email, "text-slate-300 break-all")}
            </div>
          </div>

          {/* VEHICLE */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2"><Car className="w-3.5 h-3.5" /> Vehicle</p>
            <div className="bg-[#1A2235]/60 border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="px-3 py-2 bg-[#FACC15] text-black font-black font-mono text-sm rounded border-b-2 border-yellow-600 shadow-[0_0_15px_-4px_rgba(250,204,21,0.5)] tracking-[0.1em]">
                {b.license_plate || "—"}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
                <div className="w-3 h-3 rounded-full border border-white/20 shadow-inner" style={{ background: b.car_color || "#334155" }}></div>
                {b.car_make || "Standard Fleet"}
              </div>
            </div>
          </div>

          {/* SCHEDULE */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Logistics</p>
            <div className="bg-[#1A2235]/60 border border-slate-800 rounded-2xl px-5 py-2">
              {detailRow("Inbound", <span className="tabular-nums">{formatDate(b.dropoff_date)} {b.dropoff_time || ""}</span>, "text-blue-300")}
              {detailRow("Return", <span className="tabular-nums">{formatDate(b.pickup_date)} {b.pickup_time || ""}</span>, "text-emerald-300")}
              {detailRow("Airport", b.airport)}
              {detailRow("Terminal", b.terminal)}
              {detailRow("Flight", b.flight_number)}
            </div>
          </div>

          {/* COMMERCIAL */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Commercial</p>
            <div className="bg-[#1A2235]/60 border border-slate-800 rounded-2xl px-5 py-2">
              {detailRow("Partner", getCompanyName(b.company_id))}
              {detailRow("Service", b.service_type || "Meet & Greet")}
            </div>

            {/* Manual transfer — assign to the best provider & email them */}
            <div className="mt-3 bg-[#1A2235]/60 border border-slate-800 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Transfer to Provider</p>
              <div className="flex items-center gap-2">
                <select
                  value={assignSel[b.id] ?? (b.company_id || "")}
                  onChange={(e) => setAssignSel((s) => ({ ...s, [b.id]: e.target.value }))}
                  className="flex-1 bg-[#0F1523] border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500"
                >
                  <option value="">— Select provider —</option>
                  {companies.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.email ? "" : " (no email)"}</option>
                  ))}
                </select>
                <button
                  onClick={() => assignAndNotify(b, assignSel[b.id] ?? (b.company_id || ""))}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Assign &amp; Email
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="p-5 border-t border-slate-800 bg-[#0F1523]/70 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <button onClick={() => sendManualEmail(b, "customer")} className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <Receipt className="w-4 h-4" /> Customer
          </button>
          <button onClick={() => sendManualEmail(b, "provider")} className="flex items-center justify-center gap-2 px-3 py-3 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl border border-purple-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <Briefcase className="w-4 h-4" /> Provider
          </button>
          <button onClick={() => sendToWhatsApp(b)} className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          {b.status?.toLowerCase() === "completed" && (
            <button onClick={() => handleRequestReview(b)} className="flex items-center justify-center gap-2 px-3 py-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl border border-amber-500/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
              <Star className="w-4 h-4 fill-current" /> Review
            </button>
          )}
          <button onClick={() => setEditingBooking(b)} className="flex items-center justify-center gap-2 px-3 py-3 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-xl border border-slate-700 hover:border-transparent transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <Settings2 className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => deleteBooking(b.id, b.booking_ref)} className="flex items-center justify-center gap-2 px-3 py-3 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-xl border border-slate-700 hover:border-transparent transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30 relative">
      
      {/* 🌌 AMBIENT BACKGROUND GLOW LAYERS */}
      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* 🟢 PREMIUM SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0F1523]/90 backdrop-blur-xl text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-blue-600/5 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Plane className="w-6 h-6 text-blue-400 rotate-45 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">CENTER</span></span>
        </div>
        
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transition-all hover:shadow-[0_10px_40px_-5px_rgba(37,99,235,0.7)] hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <LayoutDashboard className="w-5 h-5" /> Live Board
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <Building2 className="w-5 h-5 text-slate-500" /> Partner Network
          </Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <Tags className="w-5 h-5 text-slate-500" /> Promo Manager
          </Link>
          <Link href="/admin/financials" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <PiggyBank className="w-5 h-5 text-slate-500" /> Financials
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all border-t border-slate-800/50 mt-4 pt-6 hover:border-l-2 hover:border-blue-500/50">
            <Settings2 className="w-5 h-5 text-slate-500" /> Platform Settings
          </Link>
        </nav>
        
        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.replace("/admin/login"))} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm hover:border-red-500/30 hover:shadow-[0_0_20px_-8px_rgba(239,68,68,0.4)]">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">
        
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B]/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
              <Plane className="w-6 h-6 text-white rotate-45" />
            </div> 
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={() => router.replace("/admin/login")} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* 🟢 COMMAND HERO PANEL (header + live stat rail, one unit) */}
        <div className="relative mb-8 rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-[#131A2B] to-[#0F1523] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          {/* ROW 1 — title + actions */}
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/60">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-600/5 border border-blue-500/30 items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.3)] shrink-0">
                <Activity className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Live Operations</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    Real-Time Sync
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-slate-700"></div>
                  <div className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {todayPretty}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button onClick={exportToCSV} className="px-6 py-3.5 bg-[#1A2235]/80 backdrop-blur-sm hover:bg-[#1A2235] border border-slate-700 hover:border-slate-600 text-slate-300 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-md">
                <Download className="w-4 h-4" /> Export
              </button>
              <button onClick={() => setShowManualModal(true)} className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <Plus className="w-5 h-5" /> New Booking
              </button>
            </div>
          </div>

          {/* ROW 2 — live stat rail */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800/60">
            {[
              { label: "Total Revenue", value: `£${totalRevenue.toFixed(2)}`, sub: `${paidCount} paid · avg £${avgBookingValue.toFixed(0)}`, color: "#10b981", Icon: Wallet },
              { label: "Active Jobs", value: `${filteredBookings.length}`, sub: pendingCount > 0 ? `${pendingCount} awaiting action` : "all up to date", color: "#3b82f6", Icon: Zap },
              { label: "Inbound Today", value: `${arrivalsToday}`, sub: "cars in today", color: "#6366f1", Icon: PlaneLanding },
              { label: "Return Today", value: `${returnsToday}`, sub: "cars out today", color: "#f59e0b", Icon: PlaneTakeoff },
            ].map((s, i) => (
              <div key={i} className="p-5 md:p-6 relative group hover:bg-white/[0.02] transition-colors border-t border-slate-800/60 lg:border-t-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: s.color }}>{s.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: `${s.color}1A`, borderColor: `${s.color}33` }}>
                    <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight tabular-nums">{s.value}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1.5 tabular-nums truncate">{s.sub}</p>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500" style={{ background: s.color }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* 🟢 CONTROL TOOLBAR */}
        <div className="mb-6">
          <div className="relative mb-3">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              autoComplete="off"
              placeholder="Search reference, client name, plate, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#131A2B]/80 backdrop-blur-xl border border-slate-800 hover:border-blue-500/40 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-500 shadow-lg"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: 'time', icon: Filter, state: timeFilter, set: setTimeFilter, opts: [{v: "ALL", l: "Dates: All"}, {v: "TODAY_DROP", l: "Inbound Today"}, {v: "TODAY_PICK", l: "Return Today"}] },
              { id: 'air', icon: MapPin, state: airportFilter, set: setAirportFilter, opts: [{v: "ALL", l: "Hubs: All"}, {v: "Luton", l: "Luton (LTN)"}, {v: "Heathrow", l: "Heathrow (LHR)"}] },
              { id: 'srv', icon: Car, state: serviceFilter, set: setServiceFilter, opts: [{v: "ALL", l: "Service: All"}, {v: "Meet & Greet", l: "Meet & Greet"}, {v: "Park & Ride", l: "Park & Ride"}, {v: "Hotel & Parking", l: "Hotel Parking"}] },
              { id: 'stat', icon: AlertCircle, state: statusFilter, set: setStatusFilter, opts: [{v: "ALL", l: "Status: All"}, {v: "PENDING", l: "Pending"}, {v: "CONFIRMED", l: "Confirmed"}, {v: "PARKED", l: "Parked"}, {v: "COMPLETED", l: "Completed"}] },
              { id: 'comp', icon: Building2, state: companyFilter, set: setCompanyFilter, opts: [{v: "ALL", l: "Partners: All"}, {v: "DIRECT", l: "Aero Direct"}, ...companies.map(c => ({v: c.id, l: c.name}))] }
            ].map((f) => (
              <div key={f.id} className="relative group/sel">
                <f.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 transition-colors group-hover/sel:text-blue-400 pointer-events-none" />
                <select 
                  value={f.state} 
                  onChange={(e) => f.set(e.target.value)} 
                  className="w-full appearance-none bg-[#1A2235]/80 backdrop-blur-sm border border-slate-700 hover:border-blue-500/50 rounded-2xl py-3 pl-10 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-inner focus:ring-2 focus:ring-blue-500/50 truncate"
                >
                  {f.opts.map((o, idx) => <option key={idx} value={o.v} className="bg-[#1A2235] text-white font-bold">{o.l}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sel:text-blue-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* 🟢 RESULTS BAR + SORT (NEW FEATURE 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-1">
          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span className="text-white font-black tabular-nums">{displayBookings.length}</span>
            <span className="uppercase tracking-widest text-slate-500">record{displayBookings.length === 1 ? "" : "s"}</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest text-[9px] font-black">
                <Filter className="w-3 h-3" /> {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
              </span>
            )}
            <span className="hidden md:flex items-center gap-1.5 text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Wallet className="w-3 h-3" /> <span className="tabular-nums">£{totalRevenue.toFixed(2)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 px-3 py-2.5 rounded-xl transition-all">
                <X className="w-3 h-3" /> Clear All
              </button>
            )}
            <div className="relative group/sort flex-1 sm:flex-none">
              <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none group-hover/sort:text-blue-400 transition-colors" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="w-full appearance-none bg-[#1A2235]/80 backdrop-blur-sm border border-slate-700 hover:border-blue-500/50 rounded-xl py-2.5 pl-10 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="NEWEST" className="bg-[#1A2235] text-white">Sort: Newest</option>
                <option value="PRICE_HIGH" className="bg-[#1A2235] text-white">Sort: Price High → Low</option>
                <option value="PRICE_LOW" className="bg-[#1A2235] text-white">Sort: Price Low → High</option>
                <option value="INBOUND" className="bg-[#1A2235] text-white">Sort: Inbound Date</option>
                <option value="RETURN" className="bg-[#1A2235] text-white">Sort: Return Date</option>
                <option value="NAME" className="bg-[#1A2235] text-white">Sort: Name A → Z</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover/sort:text-blue-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* 🟢 BOOKING CARD GRID */}
        {displayBookings.length === 0 ? (
          <div className="bg-[#131A2B]/70 backdrop-blur-xl rounded-3xl border border-slate-800 py-32 flex flex-col items-center justify-center opacity-50 px-6 text-center mb-24">
            <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-600 flex items-center justify-center mb-5 bg-slate-900/50">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-lg font-black uppercase tracking-[0.25em] text-white">No Records</p>
            <p className="text-xs font-bold text-slate-400 mt-2">Adjust filters to retrieve bookings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-24">
            {displayBookings.map((b) => (
              <div
                key={b.id}
                onClick={() => setViewBooking(b)}
                className="group bg-gradient-to-br from-[#131A2B] to-[#0F1523] rounded-3xl border border-slate-800/80 hover:border-blue-500/40 shadow-xl hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.25)] transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col hover:-translate-y-1"
                style={{ boxShadow: `inset 4px 0 0 0 ${statusAccentColor(b.status)}` }}
              >
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>

                {/* CARD HEAD */}
                <div className="p-5 pb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-black font-mono text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{b.booking_ref}</span>
                      {b.fast_track_count > 0 && (
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" /> {b.fast_track_count}×
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight mt-2 truncate">{b.full_name || "Unnamed Client"}</h3>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                {/* CARD BODY */}
                <div className="px-5 pb-4 space-y-3.5 flex-1">
                  {/* vehicle */}
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1.5 bg-[#FACC15] text-black font-black font-mono text-xs rounded border-b-2 border-yellow-600 tracking-[0.08em] shrink-0">{b.license_plate || "—"}</div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider truncate">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ background: b.car_color || "#334155" }}></span>
                      <span className="truncate">{b.car_make || "Standard Fleet"}</span>
                    </div>
                  </div>
                  {/* schedule */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#1A2235]/60 border border-slate-800 rounded-xl px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1"><PlaneLanding className="w-3 h-3" /> Inbound</p>
                      <p className="text-xs font-bold text-white tabular-nums mt-1">{formatDate(b.dropoff_date)} {b.dropoff_time || ""}</p>
                    </div>
                    <div className="bg-[#1A2235]/60 border border-slate-800 rounded-xl px-3 py-2.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1"><PlaneTakeoff className="w-3 h-3" /> Return</p>
                      <p className="text-xs font-bold text-white tabular-nums mt-1">{formatDate(b.pickup_date)} {b.pickup_time || ""}</p>
                    </div>
                  </div>
                  {/* price + partner */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{getCompanyName(b.company_id)}</span>
                    </div>
                    <span className="text-xl font-black text-white tabular-nums shrink-0">£{Number(b.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* CARD FOOTER — quick-status (NEW FEATURE 2) + ALL actions */}
                <div className="px-4 py-3.5 border-t border-slate-800 bg-[#0F1523]/60 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                  {/* quick status */}
                  <div className="relative">
                    <select
                      value={b.status?.toLowerCase() || "pending"}
                      onChange={(e) => quickStatus(b, e.target.value)}
                      className="w-full appearance-none bg-[#1A2235] border rounded-lg py-2 pl-3 pr-7 text-[9px] font-black uppercase tracking-widest text-white outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/40"
                      style={{ borderColor: `${statusAccentColor(b.status)}66` }}
                    >
                      <option value="pending" className="bg-[#1A2235]">Set Status: Pending</option>
                      <option value="confirmed" className="bg-[#1A2235]">Set Status: Confirmed</option>
                      <option value="parked" className="bg-[#1A2235]">Set Status: Parked</option>
                      <option value="completed" className="bg-[#1A2235]">Set Status: Completed</option>
                      <option value="cancelled" className="bg-[#1A2235]">Set Status: Voided</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                  </div>
                  {/* full action row */}
                  <div className="flex items-center gap-1.5">
                    <button title="Email customer" onClick={() => sendManualEmail(b, "customer")} className="flex-1 flex items-center justify-center p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg border border-blue-500/20 transition-all active:scale-95"><Receipt className="w-4 h-4" /></button>
                    <button title="Email provider" onClick={() => sendManualEmail(b, "provider")} className="flex-1 flex items-center justify-center p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg border border-purple-500/20 transition-all active:scale-95"><Briefcase className="w-4 h-4" /></button>
                    <button title="WhatsApp dispatch" onClick={() => sendToWhatsApp(b)} className="flex-1 flex items-center justify-center p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all active:scale-95"><MessageCircle className="w-4 h-4" /></button>
                    {b.status?.toLowerCase() === "completed" && (
                      <button title="Request review" onClick={() => handleRequestReview(b)} className="flex-1 flex items-center justify-center p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg border border-amber-500/20 transition-all active:scale-95"><Star className="w-4 h-4 fill-current" /></button>
                    )}
                    <button title="Edit record" onClick={() => setEditingBooking(b)} className="flex-1 flex items-center justify-center p-2 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95"><Settings2 className="w-4 h-4" /></button>
                    <button title="Delete record" onClick={() => deleteBooking(b.id, b.booking_ref)} className="flex-1 flex items-center justify-center p-2 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🟢 DOSSIER MODAL — full record + all dispatch actions */}
        {viewBooking && (
          <div className="fixed inset-0 z-[200] bg-[#0B1120]/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150" onClick={() => setViewBooking(null)}>
            <div className="bg-[#131A2B] border border-slate-800 w-full max-w-2xl sm:rounded-3xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-10"></div>
              {renderDetail(viewBooking)}
            </div>
          </div>
        )}

        {/* 🟢 FIXED MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
          <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-blue-500 transition-all"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Ops</span></Link>
            <div className="relative -top-8"><button onClick={() => setShowManualModal(true)} className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.6)] border-4 border-[#0B1120] active:scale-95 transition-transform"><Plus className="w-6 h-6 text-white" /></button></div>
            <Link href="/admin/financials" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><PiggyBank className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Finance</span></Link>
            {/* 🟢 NEW SETTINGS TAB FOR MOBILE ADDED HERE */}
            <Link href="/admin/settings" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Settings2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Settings</span></Link>
          </nav>
        </div>
      </main>

      {/* --- 🟢 MODAL: MANUAL BOOKING ENTRY --- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523]/95 backdrop-blur-2xl border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent z-20"></div>
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Manual Booking</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-500" /> Direct Database Injection</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateManualBooking} autoComplete="off" className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar text-white">
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20"><Users className="w-4 h-4 text-blue-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">1. Subject ID</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Full Name</label>
                    <input required type="text" value={newBooking.full_name || ''} onChange={(e) => setNewBooking({...newBooking, full_name: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Email Address</label>
                    <input type="email" value={newBooking.email || ''} onChange={(e) => setNewBooking({...newBooking, email: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Mobile Number</label>
                    <input type="text" value={newBooking.phone_number || ''} onChange={(e) => setNewBooking({...newBooking, phone_number: e.target.value})} className={inputStyle} />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20"><Car className="w-4 h-4 text-amber-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">2. Asset Specs</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-amber-500 block ml-1 tracking-widest">Registration Plate</label>
                    <input required type="text" value={newBooking.license_plate || ''} onChange={(e) => setNewBooking({...newBooking, license_plate: e.target.value.toUpperCase()})} className={yellowInputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Make / Model / Color</label>
                    <input type="text" value={newBooking.car_make || ''} onChange={(e) => setNewBooking({...newBooking, car_make: e.target.value})} className={inputStyle} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Inbound Flight</label>
                    <input type="text" value={newBooking.flight_number || ''} onChange={(e) => setNewBooking({...newBooking, flight_number: e.target.value.toUpperCase()})} className={inputStyle} />
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20"><Clock className="w-4 h-4 text-indigo-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">3. Logistics Timeline</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 tabular-nums">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Arrival Date</label>
                    <input required type="date" value={newBooking.dropoff_date || ''} onChange={(e) => setNewBooking({...newBooking, dropoff_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Time</label>
                    <input type="time" value={newBooking.dropoff_time || ''} onChange={(e) => setNewBooking({...newBooking, dropoff_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Return Date</label>
                    <input required type="date" value={newBooking.pickup_date || ''} onChange={(e) => setNewBooking({...newBooking, pickup_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Time</label>
                    <input type="time" value={newBooking.pickup_time || ''} onChange={(e) => setNewBooking({...newBooking, pickup_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                  </div>
                </div>
              </section>

              <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20"><Wallet className="w-4 h-4 text-emerald-400"/></div>
                   <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">4. Economics</h3>
                   <div className="flex-1 h-px bg-slate-800"></div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Partner Node</label>
                    <div className="relative">
                      <select value={newBooking.company_id || ''} onChange={(e) => setNewBooking({...newBooking, company_id: e.target.value})} className={selectStyle}>
                        <option value="ALL">Aero Direct (Internal)</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Service Level</label>
                    <div className="relative">
                      <select value={newBooking.service_type || ''} onChange={(e) => setNewBooking({...newBooking, service_type: e.target.value})} className={selectStyle}>
                        <option value="Meet & Greet">Meet & Greet</option>
                        <option value="Park & Ride">Park & Ride</option>
                        <option value="Hotel & Parking">Hotel & Parking</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-amber-500 block ml-1 tracking-widest">Fast Track Passes</label>
                    <div className="relative">
                       <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
                       <input type="number" min="0" value={newBooking.fast_track_count || 0} onChange={(e) => setNewBooking({...newBooking, fast_track_count: parseInt(e.target.value) || 0})} className={`${inputStyle} pl-12 text-amber-400 text-xl`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-400 block ml-1 tracking-widest">Transaction (£)</label>
                    <div className="relative">
                       <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                       <input type="number" step="0.01" value={newBooking.total_price || 0} onChange={(e) => setNewBooking({...newBooking, total_price: parseFloat(e.target.value) || 0})} className={`${inputStyle} pl-12 text-emerald-400 text-xl`} />
                    </div>
                  </div>
                </div>
              </section>
            </form>
            
            <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex gap-4">
               <button onClick={() => setShowManualModal(false)} className="px-8 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Cancel</button>
               <button disabled={isSaving} onClick={handleCreateManualBooking} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-4 rounded-xl font-bold text-sm text-white shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Commit Deployment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🟢 MODAL: MODIFY LIVE RECORD --- */}
      {editingBooking && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523]/95 backdrop-blur-2xl border border-slate-800 w-full max-w-4xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent z-20"></div>
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-red-500"></div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Modify Case</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Override Access: {editingBooking?.booking_ref || 'Unknown'}</p>
              </div>
              <button onClick={() => setEditingBooking(null)} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleUpdateBooking} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar text-white">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Client Label</label><input required type="text" value={editingBooking?.full_name || ''} onChange={(e) => setEditingBooking({...editingBooking, full_name: e.target.value})} className={inputStyle} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Secure Email</label><input type="email" value={editingBooking?.email || ''} onChange={(e) => setEditingBooking({...editingBooking, email: e.target.value})} className={inputStyle} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">License ID</label><input required type="text" value={editingBooking?.license_plate || ''} onChange={(e) => setEditingBooking({...editingBooking, license_plate: e.target.value.toUpperCase()})} className={yellowInputStyle} /></div>
               </div>
              
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Inbound Date</label>
                   <input type="date" value={editingBooking?.dropoff_date || ''} onChange={(e) => setEditingBooking({...editingBooking, dropoff_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Inbound Time</label>
                   <input type="time" value={editingBooking?.dropoff_time || ''} onChange={(e) => setEditingBooking({...editingBooking, dropoff_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Return Date</label>
                   <input type="date" value={editingBooking?.pickup_date || ''} onChange={(e) => setEditingBooking({...editingBooking, pickup_date: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Return Time</label>
                   <input type="time" value={editingBooking?.pickup_time || ''} onChange={(e) => setEditingBooking({...editingBooking, pickup_time: e.target.value})} className={`${inputStyle} [color-scheme:dark]`} />
                 </div>
               </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 pt-6 border-t border-slate-800">
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Partner Node</label>
                  <div className="relative">
                    <select value={editingBooking?.company_id || 'ALL'} onChange={(e) => setEditingBooking({...editingBooking, company_id: e.target.value === 'ALL' ? null : e.target.value})} className={selectStyle}>
                      <option value="ALL">Aero Direct</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Service Level</label>
                  <div className="relative">
                    <select value={editingBooking?.service_type || "Meet & Greet"} onChange={(e) => setEditingBooking({...editingBooking, service_type: e.target.value})} className={selectStyle}>
                      <option value="Meet & Greet">M&G</option>
                      <option value="Park & Ride">P&R</option>
                      <option value="Hotel & Parking">Hotel</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Status Lifecycle</label>
                  <div className="relative">
                    <select value={editingBooking?.status || ''} onChange={(e) => setEditingBooking({...editingBooking, status: e.target.value})} className={selectStyle}>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="parked">Parked</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Voided</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase text-amber-500 block ml-1 tracking-widest">Fast Track</label>
                  <div className="relative">
                     <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
                     <input type="number" min="0" value={editingBooking?.fast_track_count || 0} onChange={(e) => setEditingBooking({...editingBooking, fast_track_count: parseInt(e.target.value) || 0})} className={`${inputStyle} pl-12 text-amber-400 text-xl`} />
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black uppercase text-emerald-400 block ml-1 tracking-widest">Override (£)</label>
                  <div className="relative group">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                    <input type="number" step="0.01" value={editingBooking?.total_price || 0} onChange={(e) => setEditingBooking({...editingBooking, total_price: parseFloat(e.target.value) || 0})} className={`${inputStyle} pl-12 text-emerald-400 text-xl`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-800">
                {[
                  {l: 'Node Terminal', k: 'terminal', icon: MapPin},
                  {l: 'Inbound Flight', k: 'flight_number', icon: Plane},
                  {l: 'Model Spec', k: 'car_make', icon: Car},
                  {l: 'Visual Finish', k: 'car_color', icon: Tags}
                ].map(field => (
                  <div key={field.k} className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 flex items-center gap-1.5"><field.icon className="w-3 h-3"/> {field.l}</label>
                    <input type="text" value={editingBooking?.[field.k] || ''} onChange={(e) => setEditingBooking({...editingBooking, [field.k]: e.target.value})} className={inputStyle} />
                  </div>
                ))}
              </div>
            </form>
            
            <div className="p-8 bg-[#131A2B] border-t border-slate-800 flex gap-4">
               <button onClick={() => setEditingBooking(null)} className="px-8 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Abandon</button>
               <button disabled={isSaving} onClick={handleUpdateBooking} className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 py-4 rounded-xl font-bold text-sm text-white shadow-[0_10px_30px_-5px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Authorize Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🟢 CONFIRM DIALOG --- */}
      {confirmState && (
        <div className="fixed inset-0 bg-[#0B1120]/90 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-7">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border ${confirmState.danger ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white tracking-tight">{confirmState.title}</h3>
                  <p className="text-sm font-medium text-slate-400 mt-1.5 leading-relaxed">{confirmState.body}</p>
                </div>
              </div>
            </div>
            <div className="px-7 py-5 bg-[#131A2B] border-t border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setConfirmState(null)} className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 ${confirmState.danger ? 'bg-red-600 hover:bg-red-500 shadow-[0_8px_16px_-4px_rgba(220,38,38,0.4)]' : 'bg-blue-600 hover:bg-blue-500 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4)]'}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🟢 TOAST STACK --- */}
      <div className="fixed bottom-6 right-6 z-[500] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-8 duration-300 max-w-sm ${
              t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" />
              : t.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" />
              : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="text-xs font-bold tracking-wide">{t.msg}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="ml-auto text-current/60 hover:text-current transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 🟢 NEXT.JS 14+ SUSPENSE WRAPPER
export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
          <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Initializing Command Hub...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}