"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/app/lib/supabase";
import { loadPricingSettings } from "@/app/lib/pricing";
import { recordAdminAction } from "@/app/lib/audit-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, LayoutDashboard, Building2, CalendarDays, LogOut, Loader2,
  Tags, Wallet, TrendingUp, CreditCard, Users, Download, Zap, PiggyBank,
  Filter, ChevronDown, ExternalLink, DollarSign, Plus, X,
  Receipt, ArrowDownRight, FolderMinus, Save, CheckCircle2, Trash2,
  FileText, Printer, Settings2, Activity, HandCoins
} from "lucide-react";

// ── Fee constants ──────────────────────────────────────────────
const STRIPE_PERCENT = 0.015;   // UK standard 1.5%
const STRIPE_FIXED = 0.20;      // + 20p per transaction
const FAST_TRACK_PRICE_DEFAULT = 8.0;   // fallback if the live setting is missing

type RangeKey = "all" | "month" | "week" | "today" | "custom";

// Parse a YYYY-MM-DD string to a LOCAL date at 00:00 (no UTC shift).
function parseLocalStart(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
// Parse to LOCAL date at 23:59:59.999 (inclusive end of day).
function parseLocalEnd(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function FinancialsContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); // 🟢 NEW: Expenses State
  const [fastTrackPrice, setFastTrackPrice] = useState(FAST_TRACK_PRICE_DEFAULT); // live add-on price from Platform Settings
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");

  // Custom range (used only when range === "custom")
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // 🟢 NEW: Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const defaultExpense = {
    description: "",
    amount: 0,
    category: "Software",
    is_recurring: false,
    date: toISODate(new Date())
  };
  const [newExpense, setNewExpense] = useState(defaultExpense);

  // 🟢 NEW: Invoice / Remittance generator state
  const monthStartISO = (() => {
    const n = new Date();
    return toISODate(new Date(n.getFullYear(), n.getMonth(), 1));
  })();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceOperatorId, setInvoiceOperatorId] = useState<string>(""); // company_id, or "DIRECT", or "" = all
  const [invFrom, setInvFrom] = useState<string>(monthStartISO);
  const [invTo, setInvTo] = useState<string>(toISODate(new Date()));
  const [invBasis, setInvBasis] = useState<"created" | "dropoff">("created");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchData();
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const [bRes, cRes, eRes, settings] = await Promise.all([
      supabase.from("bookings").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
      supabase.from("companies").select("*"),
      supabase.from("expenses").select("*").order("date", { ascending: false }), // 🟢 NEW: Fetch expenses
      loadPricingSettings(supabase),
    ]);
    if (bRes.data) setBookings(bRes.data);
    if (cRes.data) setCompanies(cRes.data);
    if (eRes.data) setExpenses(eRes.data);
    if (Number(settings.fastTrackPrice) > 0) setFastTrackPrice(Number(settings.fastTrackPrice));
    
    if (bRes.error) logger.error("financials bookings:", bRes.error);
    if (cRes.error) logger.error("financials companies:", cRes.error);
    // Suppress expense error if table doesn't exist yet
    if (eRes.error && eRes.error.code !== '42P01') logger.error("financials expenses:", eRes.error); 
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // 🟢 NEW: Handle Expense Creation
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) throw error;
      recordAdminAction({
        actionType: "expense.create",
        entityType: "expense",
        metadata: {
          label: `Expense · ${(newExpense as any).description || (newExpense as any).category || "untitled"}`,
          after: `£${Number((newExpense as any).amount || 0).toFixed(2)}`,
        },
      });
      setShowExpenseModal(false);
      setNewExpense(defaultExpense);
      await fetchData(); // Refresh to show new expense
    } catch (error: any) {
      alert(`Error saving expense: ${error.message} \n\n(Make sure you have created the 'expenses' table in Supabase)`);
    } finally {
      setIsSaving(false);
    }
  };

  // Expense deletion — requires a second click to confirm (avoids browser confirm())
  const deleteExpense = async (id: string) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      // Auto-cancel the pending state after 3s if user doesn't confirm
      setTimeout(() => setPendingDeleteId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setPendingDeleteId(null);
    const target = expenses.find((e) => e.id === id);
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) {
      setExpenses(expenses.filter(e => e.id !== id));
      recordAdminAction({
        actionType: "expense.delete",
        entityType: "expense",
        entityId: id,
        metadata: {
          label: `Expense · ${(target as any)?.description || (target as any)?.category || id}`,
          before: target ? `£${Number((target as any).amount || 0).toFixed(2)}` : undefined,
          after: "deleted",
        },
      });
    }
  };

  const commissionFor = (companyId: string | null) => {
    if (!companyId) return 100; // Aero Direct: you keep 100% of parking
    const c = companies.find((x) => x.id === companyId);
    return c ? Number(c.commission_rate ?? 100) : 100;
  };

  // Per-booking commission %. Rules:
  //  • No operator assigned (direct/walk-in you fulfil) → you keep 100%; any
  //    stored commission_percentage is ignored (it only makes sense with an operator).
  //  • Operator assigned → use the booking's own commission_percentage if set,
  //    otherwise fall back to the operator's default commission_rate.
  const commissionPctForBooking = (b: any) => {
    if (!b.company_id) return 100;
    if (b.commission_percentage !== null && b.commission_percentage !== undefined) {
      return Number(b.commission_percentage);
    }
    return commissionFor(b.company_id);
  };

  const nameFor = (companyId: string | null) => {
    if (!companyId) return "Aero Direct";
    const c = companies.find((x) => x.id === companyId);
    return c ? c.name : "Aero Direct";
  };

  // ── Resolve the active [start, end] window from the range selector ─────────
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { startDate: s, endDate: now, rangeLabel: "Today" };
    }
    if (range === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 7);
      return { startDate: s, endDate: now, rangeLabel: "Last 7 Days" };
    }
    if (range === "month") {
      const s = new Date(now); s.setMonth(s.getMonth() - 1);
      return { startDate: s, endDate: now, rangeLabel: "Last 30 Days" };
    }
    if (range === "custom") {
      const s = parseLocalStart(fromDate);
      const e = parseLocalEnd(toDate);
      const label =
        s && e ? `${toISODate(s)} → ${toISODate(e)}`
        : s ? `From ${toISODate(s)}`
        : e ? `Until ${toISODate(e)}`
        : "Custom (pick dates)";
      return { startDate: s, endDate: e, rangeLabel: label };
    }
    return { startDate: null, endDate: null, rangeLabel: "All Time" };
  }, [range, fromDate, toDate]);

  // ── Per-booking economics ───────────────────────────────────
  const computed = useMemo(() => {
    const rows = bookings
      .filter((b) => {
        const created = b.created_at ? new Date(b.created_at) : null;
        if (!created) return !startDate && !endDate; // undated rows only show in "all"
        if (startDate && created < startDate) return false;
        if (endDate && created > endDate) return false;
        return true;
      })
      .map((b) => {
        const total = Number(b.total_price || 0);
        const addOns = Number(b.fast_track_count || 0) * fastTrackPrice;
        const parkingGross = Math.max(0, total - addOns);
        const commPct = commissionPctForBooking(b);
        const yourCommission = parkingGross * (commPct / 100);
        const attendantCommission = Number(b.attendant_commission || 0);
        const operatorPayout = Math.max(0, parkingGross - yourCommission - attendantCommission);
        const stripeFee = total > 0 ? total * STRIPE_PERCENT + STRIPE_FIXED : 0;
        const yourNet = yourCommission + addOns + attendantCommission - stripeFee;
        return {
          ...b,
          total, addOns, parkingGross, commPct,
          yourCommission, attendantCommission, operatorPayout, stripeFee, yourNet,
          operatorName: nameFor(b.company_id),
        };
      });

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, companies, startDate, endDate, fastTrackPrice]);

  // 🟢 NEW: Filter Expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = exp.date ? new Date(exp.date) : null;
      if (!expDate) return !startDate && !endDate;
      if (startDate && expDate < startDate) return false;
      if (endDate && expDate > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // ── Totals ──────────────────────────────────────────────────
  const totals = useMemo(() => {
    const baseTotals = computed.reduce(
      (acc, r) => {
        acc.gross += r.total;
        acc.stripe += r.stripeFee;
        acc.operator += r.operatorPayout;
        acc.addOns += r.addOns;
        acc.net += r.yourNet;
        acc.attendant += r.attendantCommission;
        return acc;
      },
      { gross: 0, stripe: 0, operator: 0, addOns: 0, net: 0, attendant: 0, opEx: 0, trueNet: 0 }
    );

    // 🟢 NEW: Add OpEx and calculate True Net
    baseTotals.opEx = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    baseTotals.trueNet = baseTotals.net - baseTotals.opEx;

    return baseTotals;
  }, [computed, filteredExpenses]);

  // ── Period insights (enterprise KPIs) ───────────────────────
  const insights = useMemo(() => {
    const count = computed.length;
    const avgBooking = count ? totals.gross / count : 0;
    const avgNet = count ? totals.net / count : 0;
    const margin = totals.gross > 0 ? (totals.net / totals.gross) * 100 : 0;
    return { count, avgBooking, avgNet, margin };
  }, [computed, totals]);

  // ── Per-operator rollup ─────────────────────────────────────
  const byOperator = useMemo(() => {
    const map = new Map<string, any>();
    computed.forEach((r) => {
      const key = r.company_id || "DIRECT";
      if (!map.has(key)) {
        map.set(key, {
          id: key, name: r.operatorName, commPct: r.commPct, isDirect: !r.company_id,
          gross: 0, operatorPayout: 0, yourCut: 0, count: 0,
        });
      }
      const o = map.get(key);
      o.gross += r.total;
      o.operatorPayout += r.operatorPayout;
      o.yourCut += r.yourCommission + r.addOns + r.attendantCommission - r.stripeFee;
      o.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.yourCut - a.yourCut);
  }, [computed]);

  // ── Invoice / Remittance: independent date range + operator + basis ──────────
  // "What I owe a provider" = sum of operatorPayout (= parkingGross × (1 − comm%/100)).
  const invoice = useMemo(() => {
    const s = parseLocalStart(invFrom);
    const e = parseLocalEnd(invTo);

    const lines = bookings
      .filter((b) => {
        // Operator filter
        const key = b.company_id || "DIRECT";
        if (invoiceOperatorId && key !== invoiceOperatorId) return false;
        // Date filter (basis: booking created date vs drop-off date)
        const raw = invBasis === "dropoff" ? b.dropoff_date : b.created_at;
        const d = raw ? new Date(raw) : null;
        if (!d || isNaN(d.getTime())) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      })
      .map((b) => {
        const total = Number(b.total_price || 0);
        const addOns = Number(b.fast_track_count || 0) * fastTrackPrice;
        const rawParkingGross = Math.max(0, total - addOns);
        const attendantCommission = Number(b.attendant_commission || 0);
        // Net the attendant fee out of the parking value so the provider's
        // remittance reconciles and never reveals the fee as a line item.
        const parkingGross = Math.max(0, rawParkingGross - attendantCommission);
        const commPct = commissionPctForBooking(b);
        const operatorPayout = parkingGross - parkingGross * (commPct / 100);
        return {
          ref: b.booking_ref || b.id,
          operatorName: nameFor(b.company_id),
          createdLabel: b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "",
          dropoffLabel: b.dropoff_date ? new Date(b.dropoff_date).toLocaleDateString("en-GB") : "",
          customer: b.full_name || "",
          plate: b.license_plate || "",
          total, addOns, parkingGross, commPct, operatorPayout,
        };
      })
      .sort((a, b) => {
        const da = invBasis === "dropoff" ? a.dropoffLabel : a.createdLabel;
        const db = invBasis === "dropoff" ? b.dropoffLabel : b.createdLabel;
        return da.localeCompare(db);
      });

    const totalOwed = lines.reduce((sum, l) => sum + l.operatorPayout, 0);
    const grossSold = lines.reduce((sum, l) => sum + l.total, 0);
    const parkingGrossTotal = lines.reduce((sum, l) => sum + l.parkingGross, 0);

    let operatorLabel = "All Providers";
    if (invoiceOperatorId === "DIRECT") operatorLabel = "Aero Direct";
    else if (invoiceOperatorId) operatorLabel = nameFor(invoiceOperatorId);

    const periodLabel = `${s ? toISODate(s) : "start"} → ${e ? toISODate(e) : "today"}`;

    return { lines, totalOwed, grossSold, parkingGrossTotal, count: lines.length, operatorLabel, periodLabel };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, companies, invoiceOperatorId, invFrom, invTo, invBasis, fastTrackPrice]);

  // Operators that actually have bookings (for the invoice dropdown)
  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => {
      const key = b.company_id || "DIRECT";
      if (!map.has(key)) map.set(key, nameFor(b.company_id));
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, companies]);

  // Open the invoice modal pre-filtered to a given operator (from the rollup table)
  const openInvoiceFor = (companyId: string | null) => {
    setInvoiceOperatorId(companyId || "DIRECT");
    setShowInvoiceModal(true);
  };

  // Download the current invoice as a CSV remittance advice
  const exportInvoiceCSV = () => {
    let csv = "AEROPARK DIRECT - SUPPLIER REMITTANCE ADVICE\n";
    csv += `Provider:,${invoice.operatorLabel}\n`;
    csv += `Period (${invBasis === "dropoff" ? "drop-off date" : "booking date"}):,${invoice.periodLabel}\n`;
    csv += `Bookings:,${invoice.count}\n`;
    csv += `Generated:,${new Date().toLocaleString()}\n\n`;
    csv += "Booking Ref,Booking Date,Drop-off Date,Customer,Reg,Total Charged,Add-ons,Parking Value,Comm %,Amount Owed\n";
    invoice.lines.forEach((l) => {
      csv += `${l.ref},${l.createdLabel},${l.dropoffLabel},"${l.customer}",${l.plate},${l.total.toFixed(2)},${l.addOns.toFixed(2)},${l.parkingGross.toFixed(2)},${l.commPct}%,${l.operatorPayout.toFixed(2)}\n`;
    });
    csv += `\nTOTAL PARKING VALUE,,,,,${invoice.parkingGrossTotal.toFixed(2)}\n`;
    csv += `TOTAL AMOUNT OWED,,,,,${invoice.totalOwed.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = invoice.operatorLabel.replace(/[^a-z0-9]+/gi, "_");
    a.href = url;
    a.download = `Remittance_${slug}_${invFrom}_to_${invTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render a clean, printable invoice in a new window (Print → Save as PDF)
  const printInvoice = () => {
    const rows = invoice.lines.map((l) => `
      <tr>
        <td>${l.ref}</td>
        <td>${invBasis === "dropoff" ? l.dropoffLabel : l.createdLabel}</td>
        <td>${l.customer || "—"}</td>
        <td>${l.plate || "—"}</td>
        <td class="num">£${l.parkingGross.toFixed(2)}</td>
        <td class="num">${l.commPct}%</td>
        <td class="num">£${l.operatorPayout.toFixed(2)}</td>
      </tr>`).join("");

    const invNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${(invoice.operatorLabel.replace(/[^A-Z0-9]/gi, "").slice(0, 4) || "ALL").toUpperCase()}`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invNo}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;padding:48px;font-size:13px;line-height:1.5}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #10b981;padding-bottom:24px;margin-bottom:32px}
      .brand{font-size:26px;font-weight:800;letter-spacing:-.5px}
      .brand span{color:#10b981}
      .muted{color:#64748b;font-size:11px}
      .title{text-align:right}
      .title h1{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0f172a}
      .meta{display:flex;justify-content:space-between;margin-bottom:32px;gap:24px}
      .meta .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;flex:1}
      .meta .label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;font-weight:700;margin-bottom:6px}
      .meta .val{font-weight:700;font-size:14px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#0f172a;color:#fff;text-align:left;padding:10px 12px;font-size:9px;text-transform:uppercase;letter-spacing:1px}
      th.num,td.num{text-align:right}
      td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}
      tr:nth-child(even) td{background:#f8fafc}
      .totals{display:flex;justify-content:flex-end;margin-top:8px}
      .totals table{width:340px}
      .totals td{border:none;padding:6px 12px}
      .totals .grand td{border-top:2px solid #0f172a;font-size:18px;font-weight:800;padding-top:14px}
      .totals .grand .amt{color:#10b981}
      .foot{margin-top:48px;border-top:1px solid #e2e8f0;padding-top:20px;color:#64748b;font-size:11px}
      @media print{body{padding:24px}.noprint{display:none}}
      .btn{background:#10b981;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px}
    </style></head><body>
      <div class="noprint" style="text-align:right;margin-bottom:20px">
        <button class="btn" onclick="window.print()">Print / Save as PDF</button>
      </div>
      <div class="head">
        <div>
          <div class="brand">AEROPARK <span>DIRECT</span></div>
          <div class="muted" style="margin-top:6px">Airport Parking Services<br/>info@aeroparkdirect.co.uk</div>
        </div>
        <div class="title">
          <h1>Remittance Advice</h1>
          <div class="muted" style="margin-top:6px">${invNo}</div>
          <div class="muted">Issued: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
      </div>
      <div class="meta">
        <div class="box">
          <div class="label">Payable To</div>
          <div class="val">${invoice.operatorLabel}</div>
        </div>
        <div class="box">
          <div class="label">Period (${invBasis === "dropoff" ? "Drop-off Date" : "Booking Date"})</div>
          <div class="val">${invoice.periodLabel}</div>
        </div>
        <div class="box">
          <div class="label">Bookings</div>
          <div class="val">${invoice.count}</div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Booking Ref</th><th>Date</th><th>Customer</th><th>Reg</th>
          <th class="num">Parking Value</th><th class="num">Comm</th><th class="num">Owed</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8">No bookings for this provider in the selected period.</td></tr>`}</tbody>
      </table>
      <div class="totals"><table>
        <tr><td>Total Parking Value</td><td class="num">£${invoice.parkingGrossTotal.toFixed(2)}</td></tr>
        <tr class="grand"><td>Total Owed</td><td class="num amt">£${invoice.totalOwed.toFixed(2)}</td></tr>
      </table></div>
      <div class="foot">
        Amount owed is the operator's share of parking revenue (parking value net of AeroPark Direct commission). Fast-track add-ons are excluded as they are retained by AeroPark Direct. Please remit payment queries to info@aeroparkdirect.co.uk.
      </div>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { alert("Please allow pop-ups to print the invoice."); return; }
    w.document.write(html);
    w.document.close();
  };

  const isCustomIncomplete = range === "custom" && (!startDate || !endDate);

  const exportCSV = () => {
    if (isCustomIncomplete) {
      alert("Please pick both a From and To date for a custom range before exporting.");
      return;
    }
    // Filename reflects the exact period selected.
    let periodTag: string;
    if (range === "custom" && startDate && endDate) {
      periodTag = `${toISODate(startDate)}_to_${toISODate(endDate)}`;
    } else if (range === "all") {
      periodTag = "all_time";
    } else {
      periodTag = range; // today | week | month
    }

    let csv = "AEROPARK DIRECT - PROFIT & LOSS STATEMENT\n";
    csv += `Range: ${rangeLabel}\n`;
    if (startDate) csv += `From: ${startDate.toLocaleString()}\n`;
    if (endDate) csv += `To: ${endDate.toLocaleString()}\n`;
    csv += `Bookings in period: ${computed.length}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += "Ref,Date,Operator,Comm %,Total Charged,Add-ons,Parking Gross,Operator Payout,Attendant Fee,Your Commission,Stripe Fee,Net from Booking\n";
    computed.forEach((r) => {
      const created = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "";
      csv += `${r.booking_ref},${created},${r.operatorName},${r.commPct}%,${r.total.toFixed(2)},${r.addOns.toFixed(2)},${r.parkingGross.toFixed(2)},${r.operatorPayout.toFixed(2)},${r.attendantCommission.toFixed(2)},${r.yourCommission.toFixed(2)},${r.stripeFee.toFixed(2)},${r.yourNet.toFixed(2)}\n`;
    });
    
    // 🟢 NEW: Export Expenses section
    csv += `\n\nOPERATING EXPENSES & SUBSCRIPTIONS\n`;
    csv += "Date,Description,Category,Recurring,Amount\n";
    filteredExpenses.forEach((e) => {
      const eDate = e.date ? new Date(e.date).toLocaleDateString("en-GB") : "";
      csv += `${eDate},"${e.description}",${e.category},${e.is_recurring ? 'Yes' : 'No'},${Number(e.amount).toFixed(2)}\n`;
    });

    csv += `\n\nFINAL TOTALS\n`;
    csv += `Gross Collected,${totals.gross.toFixed(2)}\n`;
    csv += `Operator Payouts,${totals.operator.toFixed(2)}\n`;
    csv += `Attendant Fees (held by you - included in Net),${totals.attendant.toFixed(2)}\n`;
    csv += `Stripe Fees,${totals.stripe.toFixed(2)}\n`;
    csv += `Operating Expenses,${totals.opEx.toFixed(2)}\n`;
    csv += `TRUE NET PROFIT,${totals.trueNet.toFixed(2)}\n`;
    csv += `\nNote: Attendant fees are held by you and included in Net until you pay the attendant separately.\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AeroPark_PnL_${periodTag}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        <div className="relative z-10">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6 relative z-10">Compiling Ledgers...</p>
      </div>
    );
  }

  const card = "bg-[#131A2B] border rounded-[2rem] p-8 relative overflow-hidden shadow-xl";
  const dateInputCls = "bg-[#131A2B] border border-slate-700 hover:border-blue-500/50 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark] [-webkit-text-fill-color:white]";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30 relative">

      {/* 🌌 AMBIENT BACKGROUND GLOW LAYERS */}
      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-emerald-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* 🟢 PREMIUM SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0F1523]/90 backdrop-blur-xl text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent"></div>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-blue-600/5 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Plane className="w-6 h-6 text-blue-400 rotate-45 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">CENTER</span></span>
        </div>
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <Building2 className="w-5 h-5 text-slate-500" /> Partner Network
          </Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <Tags className="w-5 h-5 text-slate-500" /> Promo Manager
          </Link>
          <Link href="/admin/financials" className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)] transition-all hover:shadow-[0_10px_40px_-5px_rgba(16,185,129,0.7)] hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <PiggyBank className="w-5 h-5" /> Financials
          </Link>
          <Link href="/admin/activity" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50">
            <Activity className="w-5 h-5 text-slate-500" /> Activity Ledger
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all border-t border-slate-800/50 mt-4 pt-6 hover:border-l-2 hover:border-blue-500/50">
            <Settings2 className="w-5 h-5 text-slate-500" /> Platform Settings
          </Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm hover:border-red-500/30 hover:shadow-[0_0_20px_-8px_rgba(239,68,68,0.4)]">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B]/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            FINANCIAL<span className="text-emerald-500">HUB</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>

        {/* 🟢 COMMAND HERO PANEL (header + controls, one unit) */}
        <div className="relative mb-8 rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-[#131A2B] to-[#0F1523] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-600/5 border border-emerald-500/30 items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] shrink-0">
                <PiggyBank className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-emerald-200 bg-clip-text text-transparent">Financial Ledger</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    Real-Time P&amp;L
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-slate-700"></div>
                  <div className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> {rangeLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                  <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)}
                    className="w-full appearance-none bg-[#1A2235]/80 backdrop-blur-sm border border-slate-700 hover:border-emerald-500/50 rounded-xl py-3.5 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-emerald-500/40">
                    <option value="all" className="bg-[#1A2235]">All Time</option>
                    <option value="today" className="bg-[#1A2235]">Today</option>
                    <option value="week" className="bg-[#1A2235]">Last 7 Days</option>
                    <option value="month" className="bg-[#1A2235]">Last 30 Days</option>
                    <option value="custom" className="bg-[#1A2235]">Custom Range…</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
                <button onClick={exportCSV} disabled={isCustomIncomplete}
                  className="px-5 py-3.5 bg-[#1A2235]/80 backdrop-blur-sm hover:bg-[#1A2235] disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-600 text-slate-300 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-md">
                  <Download className="w-4 h-4 text-blue-400" /> Export P&amp;L
                </button>
                <button onClick={() => setShowInvoiceModal(true)}
                  className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <FileText className="w-4 h-4" /> Generate Invoice
                </button>
              </div>

              {/* Custom date pickers */}
              {range === "custom" && (
                <div className="flex flex-wrap items-end gap-3 bg-[#1A2235]/60 border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> From</label>
                    <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={dateInputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> To</label>
                    <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={dateInputCls} />
                  </div>
                  {(fromDate || toDate) && (
                    <button onClick={() => { setFromDate(""); setToDate(""); }}
                      className="flex items-center gap-1.5 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition-all">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                  {isCustomIncomplete && (
                    <p className="text-[10px] font-bold text-amber-400 self-center">Pick both dates to enable export.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🟢 EXPANDED 5-COLUMN HUD METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className={`${card} border-slate-800/80 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4"/> Gross Collected</p>
            <p className="text-3xl font-black text-white tracking-tight tabular-nums">£{totals.gross.toFixed(2)}</p>
            <Wallet className="w-20 h-20 text-slate-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          <div className={`${card} border-blue-900/40 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Operator Payouts</p>
            <p className="text-3xl font-black text-blue-400 tracking-tight tabular-nums">−£{totals.operator.toFixed(2)}</p>
            <Users className="w-20 h-20 text-blue-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          <div className={`${card} border-rose-900/40 group hover:border-rose-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Stripe Fees</p>
            <p className="text-3xl font-black text-rose-400 tracking-tight tabular-nums">−£{totals.stripe.toFixed(2)}</p>
            <CreditCard className="w-20 h-20 text-rose-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          {/* 🟢 NEW: Operating Expenses HUD */}
          <div className={`${card} border-rose-900/40 group hover:border-rose-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 flex items-center gap-2"><FolderMinus className="w-4 h-4"/> OpEx & Subs</p>
            <p className="text-3xl font-black text-rose-400 tracking-tight tabular-nums">−£{totals.opEx.toFixed(2)}</p>
            <ArrowDownRight className="w-20 h-20 text-rose-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          {/* 🟢 MODIFIED: True Net Profit (Subtracts Expenses) */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-[#131A2B] border border-emerald-500/40 rounded-[2rem] p-8 relative overflow-hidden shadow-xl group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> True Net Profit</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tight tabular-nums drop-shadow">£{totals.trueNet.toFixed(2)}</p>
            <TrendingUp className="w-20 h-20 text-emerald-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* STRIPE PAYOUT BRIDGE */}
        <div className="bg-gradient-to-r from-[#635BFF]/10 to-indigo-900/20 border border-[#635BFF]/30 p-8 rounded-3xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#635BFF]/10 rounded-full blur-3xl pointer-events-none"></div>
           <div className="relative z-10">
             <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><DollarSign className="text-[#635BFF]"/> Payout Routing</h3>
             <p className="text-sm font-bold text-slate-400 mt-2 max-w-2xl leading-relaxed">
               Your revenue is processed securely via Stripe. Automated payouts transfer your available balance directly to your bank account. Manage manual top-ups or schedules in the portal.
             </p>
           </div>
           <button
             onClick={() => window.open('https://dashboard.stripe.com/settings/payouts', '_blank')}
             className="relative z-10 px-8 py-4 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(99,91,255,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 shrink-0"
           >
             <ExternalLink className="w-4 h-4" /> Configure Payouts
           </button>
        </div>

        {/* 🟢 PERIOD INSIGHTS (enterprise KPIs) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Bookings", value: `${insights.count}` },
            { label: "Avg Booking Value", value: `£${insights.avgBooking.toFixed(2)}` },
            { label: "Avg Net / Booking", value: `£${insights.avgNet.toFixed(2)}` },
            { label: "Net Margin", value: `${insights.margin.toFixed(1)}%` },
          ].map((k) => (
            <div key={k.label} className="bg-[#131A2B] border border-slate-800/80 rounded-2xl px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{k.label}</p>
              <p className="text-xl font-black text-white mt-1 tabular-nums tracking-tight">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* FAST TRACK STRIP */}
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
            <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0 relative z-10">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Fast Track Add-ons (100% Margin)</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">£{totals.addOns.toFixed(2)}</p>
            </div>
          </div>

          {/* 🟢 ATTENDANT FEES STRIP (pass-through, never profit) */}
          <div className="bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-violet-500/10 blur-2xl rounded-full"></div>
            <div className="w-12 h-12 bg-violet-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center shrink-0 relative z-10">
              <HandCoins className="w-6 h-6 text-violet-400" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Attendant Fees</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">£{totals.attendant.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* BY OPERATOR */}
          <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><Building2 className="w-4 h-4"/> Profit By Operator</h4>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                  <tr>
                    <th className="px-6 py-5">Operator Network</th>
                    <th className="px-4 py-5 text-center">Bookings</th>
                    <th className="px-4 py-5 text-right">Their Payout</th>
                    <th className="px-6 py-5 text-right text-emerald-400">Your Cut</th>
                    <th className="px-4 py-5 text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byOperator.map((o, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-white text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                            {o.name.charAt(0)}
                          </div>
                          {o.name}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-slate-400 font-bold text-xs tabular-nums">{o.count}</td>
                      <td className="px-4 py-5 text-right text-blue-400 font-bold text-xs tabular-nums">£{o.operatorPayout.toFixed(2)}</td>
                      <td className="px-6 py-5 text-right text-emerald-400 font-black text-sm tabular-nums">£{o.yourCut.toFixed(2)}</td>
                      <td className="px-4 py-5 text-center">
                        <button
                          onClick={() => openInvoiceFor(o.id === "DIRECT" ? "DIRECT" : o.id)}
                          title={`Generate remittance invoice for ${o.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest transition-colors">
                          <FileText className="w-3 h-3" /> Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                  {byOperator.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold text-sm">No bookings in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🟢 NEW: OPERATING EXPENSES & SUBSCRIPTIONS */}
          <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-[#0F1523] flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><Receipt className="w-4 h-4"/> OpEx & Subscriptions</h4>
              <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors shadow-md">
                <Plus className="w-3 h-3" /> Add Expense
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                  <tr>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Description</th>
                    <th className="px-4 py-5 text-center">Category</th>
                    <th className="px-6 py-5 text-right text-rose-400">Amount</th>
                    <th className="px-4 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5 text-xs font-bold text-slate-400 tabular-nums">{e.date ? new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                      <td className="px-6 py-5 font-bold text-white text-sm">
                        <div className="flex flex-col gap-1">
                          <span>{e.description}</span>
                          {e.is_recurring && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 w-max">Recurring</span>}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-slate-400 font-bold text-[10px] uppercase tracking-wider">{e.category}</td>
                      <td className="px-6 py-5 text-right text-rose-400 font-black text-sm tabular-nums">−£{Number(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-5 text-right">
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className={`p-2 transition-colors text-xs font-bold ${pendingDeleteId === e.id ? "text-red-400 animate-pulse" : "text-slate-500 hover:text-red-400"}`}
                          title={pendingDeleteId === e.id ? "Click again to confirm deletion" : "Delete expense"}
                        >
                          {pendingDeleteId === e.id ? "Confirm?" : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold text-sm">No expenses logged in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PER-BOOKING LEDGER */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Booking-Level Ledger ({computed.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                <tr>
                  <th className="px-8 py-5">Reference</th>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Operator</th>
                  <th className="px-8 py-5 text-right">Charged</th>
                  <th className="px-8 py-5 text-right">Fast Track</th>
                  <th className="px-8 py-5 text-right">Stripe Fee</th>
                  <th className="px-8 py-5 text-right text-violet-400">Attendant</th>
                  <th className="px-8 py-5 text-right">Operator Owed</th>
                  <th className="px-8 py-5 text-right text-emerald-400">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {computed.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-white">{r.booking_ref}</td>
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-500 tabular-nums">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                    <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{r.operatorName}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-slate-300 tabular-nums">£{r.total.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-amber-400 tabular-nums">
                      {r.addOns > 0 ? `+£${r.addOns.toFixed(2)}` : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-rose-400 tabular-nums">−£{r.stripeFee.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-violet-400 tabular-nums">
                      {r.attendantCommission > 0 ? `−£${r.attendantCommission.toFixed(2)}` : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-blue-400 tabular-nums">£{r.operatorPayout.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-emerald-400 tabular-nums">£{r.yourNet.toFixed(2)}</td>
                  </tr>
                ))}
                {computed.length === 0 && (
                  <tr><td colSpan={9} className="px-8 py-12 text-center text-slate-500 font-bold text-sm">No bookings found in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 🟢 NEW: INVOICE / REMITTANCE GENERATOR MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-start md:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-400" /> Provider Remittance</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">What You Owe · By Date Range</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Provider</label>
                  <div className="relative">
                    <select value={invoiceOperatorId} onChange={(e) => setInvoiceOperatorId(e.target.value)}
                      className="w-full appearance-none bg-[#1A2235] border border-slate-700 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/50 transition-all">
                      <option value="">All Providers</option>
                      {operatorOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 block ml-1 tracking-widest">From</label>
                  <input type="date" value={invFrom} max={invTo || undefined} onChange={(e) => setInvFrom(e.target.value)} className={dateInputCls + " w-full"} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 block ml-1 tracking-widest">To</label>
                  <input type="date" value={invTo} min={invFrom || undefined} onChange={(e) => setInvTo(e.target.value)} className={dateInputCls + " w-full"} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Date Basis</label>
                  <div className="relative">
                    <select value={invBasis} onChange={(e) => setInvBasis(e.target.value as "created" | "dropoff")}
                      className="w-full appearance-none bg-[#1A2235] border border-slate-700 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/50 transition-all">
                      <option value="created">Booking Date</option>
                      <option value="dropoff">Drop-off Date</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* QUICK MONTH PRESETS */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "This Month", from: monthStartISO, to: toISODate(new Date()) },
                  { label: "Last Month", ...(() => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth() - 1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 0); return { from: toISODate(s), to: toISODate(e) }; })() },
                ].map((p) => (
                  <button key={p.label} onClick={() => { setInvFrom(p.from); setInvTo(p.to); }}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300 bg-[#1A2235] hover:bg-[#222b40] border border-slate-700 rounded-lg transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>

              {/* SUMMARY BAR */}
              <div className="bg-gradient-to-r from-emerald-900/30 to-[#131A2B] border border-emerald-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Owed to {invoice.operatorLabel}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">{invoice.count} booking{invoice.count === 1 ? "" : "s"} · {invoice.periodLabel}</p>
                </div>
                <p className="text-4xl font-black text-emerald-400 tracking-tight tabular-nums drop-shadow">£{invoice.totalOwed.toFixed(2)}</p>
              </div>

              {/* PREVIEW TABLE */}
              <div className="bg-[#131A2B] rounded-2xl border border-slate-800 overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120] sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Ref</th>
                      <th className="px-4 py-3">{invBasis === "dropoff" ? "Drop-off" : "Booked"}</th>
                      <th className="px-4 py-3">Customer</th>
                      {!invoiceOperatorId && <th className="px-4 py-3">Provider</th>}
                      <th className="px-4 py-3 text-right">Parking</th>
                      <th className="px-4 py-3 text-right">Comm</th>
                      <th className="px-4 py-3 text-right text-emerald-400">Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {invoice.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-white">{l.ref}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400 tabular-nums">{invBasis === "dropoff" ? l.dropoffLabel : l.createdLabel}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-300">{l.customer || "—"}</td>
                        {!invoiceOperatorId && <td className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">{l.operatorName}</td>}
                        <td className="px-4 py-3 text-right text-xs font-bold text-slate-300 tabular-nums">£{l.parkingGross.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 tabular-nums">{l.commPct}%</td>
                        <td className="px-4 py-3 text-right text-xs font-black text-emerald-400 tabular-nums">£{l.operatorPayout.toFixed(2)}</td>
                      </tr>
                    ))}
                    {invoice.lines.length === 0 && (
                      <tr><td colSpan={!invoiceOperatorId ? 7 : 6} className="px-4 py-10 text-center text-slate-500 font-bold text-sm">No bookings for this selection.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Close</button>
                <div className="flex-1" />
                <button onClick={exportInvoiceCSV} disabled={invoice.lines.length === 0}
                  className="px-6 py-4 bg-[#1A2235] hover:bg-[#222b40] disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" /> CSV
                </button>
                <button onClick={printInvoice} disabled={invoice.lines.length === 0}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)]">
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 NEW: ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500"></div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Log Expense</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operating Costs & Subscriptions</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateExpense} className="p-8 space-y-6 text-white">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Description</label>
                <input required type="text" placeholder="e.g. Vercel Hosting, Google Ads" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} 
                  className="w-full bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-rose-400 block ml-1 tracking-widest">Amount (£)</label>
                  <input required type="number" step="0.01" min="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-[#1A2235] border border-slate-700 hover:border-rose-500/50 rounded-xl px-5 py-4 text-xl text-rose-400 font-black outline-none focus:ring-2 focus:ring-rose-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Date</label>
                  <input required type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} 
                    className="w-full bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Category</label>
                  <div className="relative">
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} 
                      className="w-full appearance-none bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all">
                      <option value="Software">Software & Hosting</option>
                      <option value="Marketing">Marketing & Ads</option>
                      <option value="Operations">Operations</option>
                      <option value="Contractors">Contractors</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-6 h-6 rounded bg-[#1A2235] border border-slate-700 group-hover:border-blue-500 transition-colors">
                      <input type="checkbox" checked={newExpense.is_recurring} onChange={(e) => setNewExpense({...newExpense, is_recurring: e.target.checked})} className="opacity-0 absolute" />
                      {newExpense.is_recurring && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <span className="text-xs font-bold text-slate-300">Monthly Recurring</span>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-4 mt-8">
                 <button type="button" onClick={() => setShowExpenseModal(false)} className="px-6 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Cancel</button>
                 <button type="submit" disabled={isSaving} className="flex-1 bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Ops</span></Link>
          <Link href="/admin/promos" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Tags className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Promo</span></Link>
          <Link href="/admin/financials" className="flex flex-col items-center justify-center gap-1 text-emerald-500 transition-all"><PiggyBank className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Finance</span></Link>
          <Link href="/admin/settings" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Settings2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Settings</span></Link>
        </nav>
      </div>
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Compiling Ledgers...</p>
      </div>
    }>
      <FinancialsContent />
    </Suspense>
  );
}