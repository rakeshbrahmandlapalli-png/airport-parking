"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/app/lib/supabase";
import { loadPricingSettings } from "@/app/lib/pricing";
import { recordAdminAction } from "@/app/lib/audit-client";
import { useRouter } from "next/navigation";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import {
  CalendarDays, Loader2, Wallet, TrendingUp, CreditCard,
  Users, Download, PiggyBank, ChevronDown, ExternalLink,
  Plus, X, FolderMinus, Save, CheckCircle2, Trash2,
  FileText, Printer,
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
  // Format the LOCAL calendar date. Using toISOString() here would convert to
  // UTC first and shift the date back a day for users ahead of UTC (e.g. IST),
  // which mislabelled invoice/period ranges (1 Jun showing as 31 May).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
      return { startDate: s, endDate: now, rangeLabel: "Last 7 days" };
    }
    if (range === "month") {
      const s = new Date(now); s.setMonth(s.getMonth() - 1);
      return { startDate: s, endDate: now, rangeLabel: "Last 30 days" };
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
    return { startDate: null, endDate: null, rangeLabel: "All time" };
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
        const attendantCommission = Number(b.attendant_commission || 0);
        // Net the attendant fee out of the parking value BEFORE commission, so the
        // operator never sees it and their payout matches the remittance invoice
        // and provider email exactly (commission is charged on the reduced base).
        const parkingGross = Math.max(0, total - addOns - attendantCommission);
        const commPct = commissionPctForBooking(b);
        const yourCommission = parkingGross * (commPct / 100);
        const operatorPayout = Math.max(0, parkingGross - yourCommission);
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

  // Bookings that arrived with a Google Ads click id. Our own record, so it
  // counts every one, whatever the customer chose on the cookie banner (only
  // those who accepted are ever sent to Google). Ad spend = Marketing expenses.
  const fromAds = useMemo(() => {
    const rows = computed.filter((r) => String(r.gclid || "").trim() && (r.status || "").toLowerCase() !== "pending");
    const spend = filteredExpenses
      .filter((e) => String(e.category || "").toLowerCase() === "marketing")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const taken = rows.reduce((sum, r) => sum + r.total, 0);
    const profit = rows.reduce((sum, r) => sum + r.yourNet, 0);
    return {
      count: rows.length,
      taken,
      profit,
      spend,
      afterSpend: profit - spend,
      sentToGoogle: rows.filter((r) => r.ad_consent === "granted").length,
    };
  }, [computed, filteredExpenses]);

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
          <th class="num">Parking Value</th><th class="num">Commission</th><th class="num">Owed</th>
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
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg relative overflow-hidden">
        <div className="relative z-10">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-semibold text-fg-3 text-xs mt-6 relative z-10">Loading financials…</p>
      </div>
    );
  }

  const dateInputCls = "bg-panel border border-fg/10 hover:border-fg/20 rounded-lg py-2.5 px-3 text-base md:text-sm text-fg outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors  [-webkit-text-fill-color:rgb(var(--admin-fg))]";

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased selection:bg-blue-600/30 relative">


      <AdminSidebar />

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* HEADER */}
        <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-fg">Financials</h1>
              <p className="mt-1 text-sm text-fg-3">Profit and loss · {rangeLabel}</p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
              <div className="relative col-span-2 sm:col-span-1">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none z-10" aria-hidden="true" />
                <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} aria-label="Period"
                  className="w-full appearance-none bg-panel border border-fg/10 hover:border-fg/20 rounded-lg py-2.5 pl-9 pr-9 text-sm text-fg-2 outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-blue-500/40">
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="custom">Choose dates…</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" aria-hidden="true" />
              </div>
              <button type="button" onClick={exportCSV} disabled={isCustomIncomplete}
                className="px-4 py-2.5 bg-fg/[0.04] hover:bg-fg/[0.08] disabled:opacity-40 disabled:cursor-not-allowed border border-fg/10 text-fg-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" aria-hidden="true" /> Export
              </button>
              <button type="button" onClick={() => setShowInvoiceModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" aria-hidden="true" /> Operator invoice
              </button>
            </div>
          </div>

          {range === "custom" && (
            <div className="mt-4 pt-4 border-t border-fg/[0.08] flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5 text-sm text-fg-3">
                From
                <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={dateInputCls} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-fg-3">
                To
                <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={dateInputCls} />
              </label>
              {(fromDate || toDate) && (
                <button type="button" onClick={() => { setFromDate(""); setToDate(""); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-fg-3 hover:text-red-400 border border-fg/10 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear dates
                </button>
              )}
              {isCustomIncomplete && <p className="text-sm text-amber-400 self-center">Pick both dates to export.</p>}
            </div>
          )}
        </div>

        {/* PROFIT AND LOSS */}
        <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-fg/[0.08]">
            {[
              { label: "Taken from customers", value: `£${totals.gross.toFixed(2)}`, cls: "text-fg", Icon: Wallet },
              { label: "Paid to operators", value: `−£${totals.operator.toFixed(2)}`, cls: "text-fg-2", Icon: Users },
              { label: "Stripe fees", value: `−£${totals.stripe.toFixed(2)}`, cls: "text-fg-2", Icon: CreditCard },
              { label: "Expenses", value: `−£${totals.opEx.toFixed(2)}`, cls: "text-fg-2", Icon: FolderMinus },
            ].map((m) => (
              <div key={m.label} className="p-4 md:p-5 border-t border-fg/[0.08] lg:border-t-0">
                <p className="text-sm text-fg-3 flex items-center gap-1.5"><m.Icon className="w-3.5 h-3.5 text-fg-4" aria-hidden="true" /> {m.label}</p>
                <p className={`mt-2 text-xl md:text-2xl font-semibold tabular-nums ${m.cls}`}>{m.value}</p>
              </div>
            ))}
            <div className="col-span-2 lg:col-span-1 p-4 md:p-5 border-t border-fg/[0.08] lg:border-t-0 bg-emerald-500/[0.06]">
              <p className="text-sm text-emerald-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Net profit</p>
              <p className="mt-2 text-xl md:text-2xl font-semibold tabular-nums text-emerald-400">£{totals.trueNet.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 divide-x divide-fg/[0.08] border-t border-fg/[0.08] bg-panel-2">
            {[
              { label: "Bookings", value: `${insights.count}` },
              { label: "Average booking", value: `£${insights.avgBooking.toFixed(2)}` },
              { label: "Average profit per booking", value: `£${insights.avgNet.toFixed(2)}` },
              { label: "Margin", value: `${insights.margin.toFixed(1)}%` },
              { label: "Fast Track (all ours)", value: `£${totals.addOns.toFixed(2)}` },
              { label: "Attendant fees", value: `£${totals.attendant.toFixed(2)}` },
            ].map((k) => (
              <div key={k.label} className="px-4 py-3 md:px-5 border-t border-fg/[0.08] lg:border-t-0">
                <p className="text-xs text-fg-4">{k.label}</p>
                <p className="mt-0.5 text-base font-semibold text-fg tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FROM GOOGLE ADS */}
        <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-fg/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-fg">From Google Ads</h2>
              <p className="text-sm text-fg-3">Bookings that came from an ad click, whether or not the customer accepted cookies.</p>
            </div>
            <button type="button" onClick={() => setShowExpenseModal(true)} className="text-sm text-blue-400 hover:underline underline-offset-4 self-start sm:self-auto">
              Add ad spend
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-fg/[0.08]">
            {[
              { label: "Bookings from ads", value: `${fromAds.count}`, cls: "text-fg" },
              { label: "Taken", value: `£${fromAds.taken.toFixed(2)}`, cls: "text-fg" },
              { label: "Our profit", value: `£${fromAds.profit.toFixed(2)}`, cls: "text-fg" },
              { label: "Ad spend", value: fromAds.spend ? `−£${fromAds.spend.toFixed(2)}` : "Not added", cls: "text-fg-2" },
              { label: "Profit after ad spend", value: `${fromAds.afterSpend < 0 ? "−" : ""}£${Math.abs(fromAds.afterSpend).toFixed(2)}`, cls: fromAds.afterSpend < 0 ? "text-red-400" : "text-emerald-400" },
            ].map((m) => (
              <div key={m.label} className="p-4 md:p-5 border-t border-fg/[0.08] lg:border-t-0">
                <p className="text-sm text-fg-3">{m.label}</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${m.cls}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <p className="px-5 py-3 border-t border-fg/[0.08] bg-panel-2 text-xs text-fg-4">
            Ad spend is your expenses in the Marketing category for this period: add each Google Ads bill as a Marketing expense.
            {" "}{fromAds.sentToGoogle} of {fromAds.count} can be sent to Google (customer accepted advertising cookies).
          </p>
        </div>

        <p className="mb-8 text-sm text-fg-3">
          Stripe pays your balance into your bank automatically.{" "}
          <a href="https://dashboard.stripe.com/settings/payouts" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline underline-offset-4 inline-flex items-center gap-1">
            Stripe payout settings <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* BY OPERATOR */}
          <div className="bg-panel rounded-xl border border-fg/[0.08] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-fg/[0.08]">
              <h2 className="text-base font-semibold text-fg">Profit by operator</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-fg/[0.08] text-xs font-medium text-fg-3 bg-panel-2">
                  <tr>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3 text-center">Bookings</th>
                    <th className="px-4 py-3 text-right">Paid to them</th>
                    <th className="px-4 py-3 text-right text-emerald-400">Our share</th>
                    <th className="px-4 py-3 text-center">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fg/[0.08]">
                  {byOperator.map((o, i) => (
                    <tr key={i} className="hover:bg-fg/[0.045] transition-colors">
                      <td className="px-4 py-3 font-medium text-fg text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-panel-3 border border-fg/[0.12] flex items-center justify-center text-fg-3 text-xs">
                            {o.name.charAt(0)}
                          </div>
                          {o.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-fg-3 font-medium text-xs tabular-nums">{o.count}</td>
                      <td className="px-4 py-3 text-right text-blue-400 font-medium text-xs tabular-nums">£{o.operatorPayout.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-semibold text-sm tabular-nums">£{o.yourCut.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openInvoiceFor(o.id === "DIRECT" ? "DIRECT" : o.id)}
                          title={`Generate remittance invoice for ${o.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors">
                          <FileText className="w-3.5 h-3.5" /> Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                  {byOperator.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-fg-4 font-medium text-sm">No bookings in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🟢 NEW: OPERATING EXPENSES & SUBSCRIPTIONS */}
          <div className="bg-panel rounded-xl border border-fg/[0.08] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-fg/[0.08] flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Expenses and subscriptions</h2>
              <button type="button" onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add expense
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-fg/[0.08] text-xs font-medium text-fg-3 bg-panel-2">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Category</th>
                    <th className="px-4 py-3 text-right text-rose-400">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fg/[0.08]">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-fg/[0.045] transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-fg-3 tabular-nums">{e.date ? new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                      <td className="px-4 py-3 font-medium text-fg text-sm">
                        <div className="flex flex-col gap-1">
                          <span>{e.description}</span>
                          {e.is_recurring && <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 w-max">Recurring</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-fg-3 font-medium text-xs">{e.category}</td>
                      <td className="px-4 py-3 text-right text-rose-400 font-semibold text-sm tabular-nums">−£{Number(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteExpense(e.id)}
                          className={`p-2 transition-colors text-xs font-medium ${pendingDeleteId === e.id ? "text-red-400 animate-pulse" : "text-fg-4 hover:text-red-400"}`}
                          title={pendingDeleteId === e.id ? "Click again to confirm deletion" : "Delete expense"}
                        >
                          {pendingDeleteId === e.id ? "Confirm?" : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-fg-4 font-medium text-sm">No expenses in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PER-BOOKING LEDGER */}
        <div className="bg-panel rounded-xl border border-fg/[0.08] overflow-hidden mb-24">
          <div className="px-5 py-4 border-b border-fg/[0.08]">
            <h2 className="text-base font-semibold text-fg">Bookings <span className="font-normal text-fg-3">({computed.length}{computed.length > 50 ? ", latest 50 shown" : ""})</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-fg/[0.08] text-xs font-medium text-fg-3 bg-panel-2">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Fast Track</th>
                  <th className="px-4 py-3 text-right">Stripe fee</th>
                  <th className="px-4 py-3 text-right text-violet-400">Attendant</th>
                  <th className="px-4 py-3 text-right">To operator</th>
                  <th className="px-4 py-3 text-right text-emerald-400">Our profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/[0.08]">
                {computed.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-fg/[0.045] transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-fg">{r.booking_ref}</td>
                    <td className="px-4 py-3 text-xs font-medium text-fg-4 tabular-nums">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-fg-4">{r.operatorName}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-fg-2 tabular-nums">£{r.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-amber-400 tabular-nums">
                      {r.addOns > 0 ? `+£${r.addOns.toFixed(2)}` : <span className="text-fg-4">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-rose-400 tabular-nums">−£{r.stripeFee.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-violet-400 tabular-nums">
                      {r.attendantCommission > 0 ? `−£${r.attendantCommission.toFixed(2)}` : <span className="text-fg-4">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-blue-400 tabular-nums">£{r.operatorPayout.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-400 tabular-nums">£{r.yourNet.toFixed(2)}</td>
                  </tr>
                ))}
                {computed.length === 0 && (
                  <tr><td colSpan={9} className="px-8 py-12 text-center text-fg-4 font-medium text-sm">No bookings found in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 🟢 NEW: INVOICE / REMITTANCE GENERATOR MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-[#060A14]/80 z-[300] flex items-start md:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-panel sm:border border-fg/[0.08] w-full max-w-4xl min-h-full sm:min-h-0 sm:rounded-xl overflow-hidden sm:my-8">
            <div className="px-5 py-4 sm:px-6 border-b border-fg/[0.08] flex justify-between items-start gap-4 bg-panel-2">
              <div>
                <h2 className="text-xl font-semibold text-fg">Operator invoice</h2>
                <p className="text-sm text-fg-3 mt-1">What we owe an operator for a period.</p>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} aria-label="Close" className="p-2 -mr-2 rounded-lg text-fg-3 hover:text-fg hover:bg-fg/[0.06]"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">Operator</label>
                  <div className="relative">
                    <select value={invoiceOperatorId} onChange={(e) => setInvoiceOperatorId(e.target.value)}
                      className="w-full appearance-none bg-panel-3 border border-fg/[0.12] hover:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/50 transition-colors">
                      <option value="">All operators</option>
                      {operatorOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">From</label>
                  <input type="date" value={invFrom} max={invTo || undefined} onChange={(e) => setInvFrom(e.target.value)} className={dateInputCls + " w-full"} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">To</label>
                  <input type="date" value={invTo} min={invFrom || undefined} onChange={(e) => setInvTo(e.target.value)} className={dateInputCls + " w-full"} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">Count bookings by</label>
                  <div className="relative">
                    <select value={invBasis} onChange={(e) => setInvBasis(e.target.value as "created" | "dropoff")}
                      className="w-full appearance-none bg-panel-3 border border-fg/[0.12] hover:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/50 transition-colors">
                      <option value="created">Date booked</option>
                      <option value="dropoff">Drop-off date</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* QUICK MONTH PRESETS */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "This month", from: monthStartISO, to: toISODate(new Date()) },
                  { label: "Last month", ...(() => { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth() - 1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 0); return { from: toISODate(s), to: toISODate(e) }; })() },
                ].map((p) => (
                  <button key={p.label} onClick={() => { setInvFrom(p.from); setInvTo(p.to); }}
                    className="px-3 py-1.5 text-sm text-fg-2 bg-panel-3 hover:bg-panel-4 border border-fg/[0.12] rounded-lg transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>

              {/* SUMMARY BAR */}
              <div className="bg-emerald-900/10 border border-emerald-500/40 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-400">Owed to {invoice.operatorLabel}</p>
                  <p className="text-sm font-medium text-fg-3 mt-1">{invoice.count} booking{invoice.count === 1 ? "" : "s"} · {invoice.periodLabel}</p>
                </div>
                <p className="text-3xl font-semibold text-emerald-400 tabular-nums">£{invoice.totalOwed.toFixed(2)}</p>
              </div>

              {/* PREVIEW TABLE */}
              <div className="bg-panel-2 rounded-xl border border-fg/[0.08] overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="border-b border-fg/[0.08] text-xs font-medium text-fg-3 bg-panel-2 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">{invBasis === "dropoff" ? "Drop-off" : "Booked"}</th>
                      <th className="px-4 py-3">Customer</th>
                      {!invoiceOperatorId && <th className="px-4 py-3">Operator</th>}
                      <th className="px-4 py-3 text-right">Parking</th>
                      <th className="px-4 py-3 text-right">Commission</th>
                      <th className="px-4 py-3 text-right text-emerald-400">Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fg/[0.08]">
                    {invoice.lines.map((l, i) => (
                      <tr key={i} className="hover:bg-fg/[0.045] transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-fg">{l.ref}</td>
                        <td className="px-4 py-3 text-xs font-medium text-fg-3 tabular-nums">{invBasis === "dropoff" ? l.dropoffLabel : l.createdLabel}</td>
                        <td className="px-4 py-3 text-sm font-medium text-fg-2">{l.customer || "—"}</td>
                        {!invoiceOperatorId && <td className="px-4 py-3 text-xs font-semibold text-fg-4">{l.operatorName}</td>}
                        <td className="px-4 py-3 text-right text-xs font-medium text-fg-2 tabular-nums">£{l.parkingGross.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-fg-4 tabular-nums">{l.commPct}%</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-emerald-400 tabular-nums">£{l.operatorPayout.toFixed(2)}</td>
                      </tr>
                    ))}
                    {invoice.lines.length === 0 && (
                      <tr><td colSpan={!invoiceOperatorId ? 7 : 6} className="px-4 py-10 text-center text-fg-4 font-medium text-sm">No bookings for this selection.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-4 text-fg-3 font-medium text-xs hover:text-fg transition-colors">Close</button>
                <div className="flex-1" />
                <button onClick={exportInvoiceCSV} disabled={invoice.lines.length === 0}
                  className="px-6 py-4 bg-panel-3 hover:bg-panel-4 disabled:opacity-40 disabled:cursor-not-allowed border border-fg/[0.12] text-fg rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download CSV
                </button>
                <button onClick={printInvoice} disabled={invoice.lines.length === 0}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> Print or save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 NEW: ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-[#060A14]/80 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-panel border border-fg/[0.08] w-full max-w-lg rounded-t-xl sm:rounded-xl overflow-hidden max-h-full overflow-y-auto">
            <div className="px-5 py-4 sm:px-6 border-b border-fg/[0.08] flex justify-between items-start gap-4 bg-panel-2">
              <div>
                <h2 className="text-xl font-semibold text-fg">Add expense</h2>
                <p className="text-sm text-fg-3 mt-1">Running costs and subscriptions.</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} aria-label="Close" className="p-2 -mr-2 rounded-lg text-fg-3 hover:text-fg hover:bg-fg/[0.06]"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateExpense} className="p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+20px)] space-y-5 text-fg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg-2 block">Description</label>
                <input required type="text" placeholder="e.g. Vercel hosting, Google Ads" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} 
                  className="w-full bg-panel-3 border border-fg/[0.12] hover:border-blue-500/50 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors placeholder:text-fg-4" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">Amount (£)</label>
                  <input required type="number" step="0.01" min="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-panel-3 border border-fg/[0.12] hover:border-rose-500/50 rounded-lg px-3.5 py-2.5 text-lg text-fg font-semibold outline-none focus:ring-2 focus:ring-rose-500/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">Date</label>
                  <input required type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} 
                    className="w-full bg-panel-3 border border-fg/[0.12] hover:border-blue-500/50 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors " />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-fg-2 block">Category</label>
                  <div className="relative">
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} 
                      className="w-full appearance-none bg-panel-3 border border-fg/[0.12] hover:border-blue-500/50 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-colors">
                      <option value="Software">Software & Hosting</option>
                      <option value="Marketing">Marketing & Ads</option>
                      <option value="Operations">Operations</option>
                      <option value="Contractors">Contractors</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-6 h-6 rounded bg-panel-3 border border-fg/[0.12] group-hover:border-blue-500 transition-colors">
                      <input type="checkbox" checked={newExpense.is_recurring} onChange={(e) => setNewExpense({...newExpense, is_recurring: e.target.checked})} className="opacity-0 absolute" />
                      {newExpense.is_recurring && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <span className="text-xs font-medium text-fg-2">Repeats monthly</span>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-fg/[0.08] flex gap-4 mt-8">
                 <button type="button" onClick={() => setShowExpenseModal(false)} className="px-6 py-4 text-fg-3 font-medium text-xs hover:text-fg transition-colors">Cancel</button>
                 <button type="submit" disabled={isSaving} className="flex-1 bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-medium text-sm text-white transition-colors flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Save expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminMobileNav />
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-semibold text-fg-3 text-xs mt-6">Loading financials…</p>
      </div>
    }>
      <FinancialsContent />
    </Suspense>
  );
}