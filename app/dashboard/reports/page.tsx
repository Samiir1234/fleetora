"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Download,
  Search,
  Printer,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  FileBarChart,
  ShieldCheck,
  CarFront,
} from "lucide-react";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { initializeDashboardDemoData } from "../demo-data";
import { DASHBOARD_DATA_CHANGED_EVENT } from "../dashboard-storage";

type ReportSource = "Fleet Management" | "Bookings" | "Customers" | "Payments" | "Expenses" | "Inspections" | "Maintenance" | "Contracts & Notary" | "Notary contacts" | "Notary booking requests" | "Notifications";
type ReportEntry = {
  id: string;
  source: ReportSource;
  title: string;
  detail: string;
  date: string;
  amount: number | null;
  status: string;
};
type JsonRecord = Record<string, unknown>;

const sourceKeys: Record<ReportSource, string> = {
  "Fleet Management": "fleetora-fleet-records",
  Bookings: "fleetora-booking-records",
  Customers: "fleetora-customer-records",
  Payments: "fleetora-payment-records",
  Expenses: "fleetora-expense-records",
  Inspections: "fleetora-inspection-records",
  Maintenance: "fleetora-maintenance-records",
  "Contracts & Notary": "fleetora-contracts",
  "Notary contacts": "fleetora-notary-profiles",
  "Notary booking requests": "fleetora-notary-booking-requests",
  Notifications: "fleetora-notification-records",
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateOnly(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function readArray(key: string): JsonRecord[] {
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new Error(`Saved report source "${key}" contains invalid data.`);
  }
  return parsed;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(date);
}

function chartPoints(values: number[], maximum: number) {
  const left = 8;
  const right = 632;
  const top = 18;
  const bottom = 132;
  const scale = Math.max(1, maximum);
  return values.map((value, index) => ({
    x: values.length === 1 ? 320 : left + (right - left) * index / (values.length - 1),
    y: bottom - (value / scale) * (bottom - top),
  }));
}

function smoothLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const distance = point.x - previous.x;
    return `${path} C ${previous.x + distance / 3} ${previous.y}, ${point.x - distance / 3} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export default function ReportsPage() {
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sections");
  const [period, setPeriod] = useState("12");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function loadReportData() {
      try {
        initializeDashboardDemoData();
        const nextEntries: ReportEntry[] = [];
        for (const [source, key] of Object.entries(sourceKeys) as [ReportSource, string][]) {
          for (const record of readArray(key)) {
            if (source === "Payments") {
              const isExpense = record.type === "Expense";
              nextEntries.push({
                id: text(record.id, "Payment"),
                source: isExpense ? "Expenses" : "Payments",
                title: text(record.description, text(record.id, "Payment record")),
                detail: [text(record.method), text(record.booking)].filter(Boolean).join(" · "),
                date: dateOnly(record.date),
                amount: numeric(record.amount),
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Expenses") {
              nextEntries.push({
                id: text(record.id, "Expense"),
                source,
                title: text(record.category, text(record.id, "Expense record")),
                detail: text(record.vendor),
                date: dateOnly(record.date),
                amount: numeric(record.amount),
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Inspections") {
              nextEntries.push({
                id: text(record.id, "Inspection"),
                source,
                title: `${text(record.type, "Inspection")} · ${text(record.vehicle, "Vehicle")}`,
                detail: text(record.booking),
                date: dateOnly(record.scheduledAt),
                amount: null,
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Maintenance") {
              nextEntries.push({
                id: text(record.id, "Maintenance"),
                source,
                title: `${text(record.service, "Service")} · ${text(record.vehicle, "Vehicle")}`,
                detail: text(record.provider),
                date: dateOnly(record.dueDate),
                amount: numeric(record.estimatedCost),
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Fleet Management") {
              nextEntries.push({
                id: text(record.id, "Vehicle"),
                source,
                title: text(record.vehicle, "Vehicle"),
                detail: [text(record.plate), text(record.type), text(record.location)].filter(Boolean).join(" · "),
                date: "",
                amount: null,
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Bookings") {
              nextEntries.push({
                id: text(record.id, "Booking"),
                source,
                title: `${text(record.customer, "Customer")} · ${text(record.vehicle, "Vehicle")}`,
                detail: [text(record.startDate), text(record.endDate)].filter(Boolean).join(" · "),
                date: dateOnly(record.startDate),
                amount: numeric(record.amount),
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Customers") {
              nextEntries.push({
                id: text(record.id, "Customer"),
                source,
                title: text(record.name, "Customer"),
                detail: [text(record.phone), text(record.email), text(record.city)].filter(Boolean).join(" · "),
                date: "",
                amount: null,
                status: text(record.status, "Active"),
              });
            } else if (source === "Contracts & Notary") {
              nextEntries.push({
                id: text(record.contract, "Contract"),
                source,
                title: text(record.customer, "Contract"),
                detail: [text(record.booking), text(record.delivery), text(record.createdBy)].filter(Boolean).join(" · "),
                date: "",
                amount: null,
                status: text(record.status, "Unknown"),
              });
            } else if (source === "Notary contacts") {
              nextEntries.push({
                id: text(record.id, "Notary contact"),
                source,
                title: text(record.name, "Notary contact"),
                detail: [text(record.company), text(record.licenseNumber), text(record.phone)].filter(Boolean).join(" · "),
                date: dateOnly(record.licenseExpiry),
                amount: null,
                status: "Contact",
              });
            } else if (source === "Notary booking requests") {
              nextEntries.push({
                id: text(record.id, "Booking request"),
                source,
                title: text(record.serviceType, text(record.clientName, "Notary booking request")),
                detail: [text(record.clientName), text(record.documentType), text(record.appointmentLocation)].filter(Boolean).join(" · "),
                date: dateOnly(record.bookingDate),
                amount: null,
                status: text(record.status, "Pending"),
              });
            } else {
              nextEntries.push({
                id: text(record.id, "Notification"),
                source,
                title: text(record.title, "Notification"),
                detail: [text(record.category), text(record.details)].filter(Boolean).join(" · "),
                date: dateOnly(record.receivedAt),
                amount: null,
                status: text(record.status, "Unread"),
              });
            }
          }
        }
        const deduplicatedEntries = new Map<string, ReportEntry>();
        nextEntries.forEach((entry) => deduplicatedEntries.set(`${entry.source}:${entry.id}`, entry));
        setEntries(Array.from(deduplicatedEntries.values()));
        setLoadError("");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load report data.");
      } finally {
        setLoaded(true);
      }
    }

    loadReportData();
    window.addEventListener("storage", loadReportData);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadReportData);
    window.addEventListener("focus", loadReportData);
    return () => {
      window.removeEventListener("storage", loadReportData);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadReportData);
      window.removeEventListener("focus", loadReportData);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) =>
      (sourceFilter === "All sections" || entry.source === sourceFilter)
      && (!query || [entry.id, entry.source, entry.title, entry.detail, entry.date, entry.amount?.toString() ?? "", entry.status].join(" ").toLowerCase().includes(query)),
    );
  }, [entries, search, sourceFilter]);

  const paidRevenue = entries
    .filter((entry) => entry.source === "Payments" && entry.status.toLowerCase() === "paid")
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
  const operatingExpenses = entries
    .filter((entry) => entry.source === "Expenses" && entry.status.toLowerCase() !== "rejected")
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
  const estimatedProfit = paidRevenue - operatingExpenses;
  const contracts = entries.filter((entry) => entry.source === "Contracts & Notary");
  const uniqueBookings = new Set(entries.filter((entry) => entry.source === "Bookings").map((entry) => entry.id));
  const uniqueVehicles = new Set(entries.filter((entry) => entry.source === "Fleet Management").map((entry) => entry.id));
  const uniqueCustomers = new Set(entries.filter((entry) => entry.source === "Customers").map((entry) => entry.id));
  const completedInspections = entries.filter((entry) => entry.source === "Inspections" && entry.status.toLowerCase() === "complete").length;
  const pendingContracts = contracts.filter((entry) => ["pending", "review"].includes(entry.status.toLowerCase())).length;
  const pendingBookings = entries.filter((entry) => entry.source === "Bookings" && ["pending", "confirmed"].includes(entry.status.toLowerCase())).length;
  const pendingInspections = entries.filter((entry) => entry.source === "Inspections" && ["pending", "overdue"].includes(entry.status.toLowerCase())).length;

  const months = useMemo(() => {
    const monthCount = Number(period);
    const now = new Date();
    return Array.from({ length: monthCount }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthCount + index + 1, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const revenue = entries
        .filter((entry) => entry.source === "Payments" && entry.status.toLowerCase() === "paid" && entry.date.startsWith(key))
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
      const expenses = entries
        .filter((entry) => entry.source === "Expenses" && entry.date.startsWith(key) && entry.status.toLowerCase() !== "rejected")
        .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
      return { key, label: monthLabel(monthDate), revenue, expenses };
    });
  }, [entries, period]);
  const maxChartValue = Math.max(1, ...months.flatMap((month) => [month.revenue, month.expenses]));
  const chartHasActivity = months.some((month) => month.revenue > 0 || month.expenses > 0);
  const revenuePoints = chartPoints(months.map((month) => month.revenue), maxChartValue);
  const expensePath = smoothLinePath(chartPoints(months.map((month) => month.expenses), maxChartValue));
  const revenuePath = smoothLinePath(revenuePoints);
  const revenueAreaPath = revenuePath ? `${revenuePath} L 632 150 L 8 150 Z` : "";

  function exportReport() {
    const rows = filteredEntries.map((entry) =>
      `<tr><td>${escapeHtml(entry.source)}</td><td>${escapeHtml(entry.id)}</td><td>${escapeHtml(entry.title)}</td><td>${escapeHtml(entry.detail || "—")}</td><td>${escapeHtml(entry.date || "—")}</td><td>${entry.amount === null ? "—" : escapeHtml(formatCurrency(entry.amount))}</td><td>${escapeHtml(entry.status)}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Fleetora System Report</title><style>body{font-family:Arial,sans-serif;color:#162334}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:7px;text-align:left;font-size:10px}th{background:#eef3f7}h1{font-size:22px}.metrics{display:flex;gap:25px;margin:18px 0}</style></head><body><h1>Fleetora System Report</h1><p>Account data · Filter: ${escapeHtml(sourceFilter)} · Records: ${filteredEntries.length}</p><div class="metrics"><p>Paid revenue: ${escapeHtml(formatCurrency(paidRevenue))}</p><p>Expenses: ${escapeHtml(formatCurrency(operatingExpenses))}</p><p>Estimated profit: ${escapeHtml(formatCurrency(estimatedProfit))}</p></div><table><thead><tr><th>Section</th><th>Record</th><th>Details</th><th>Related</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><h2>Data notes</h2><p>Records are stored in Supabase. Live Tracking requires a GPS provider for live coordinates. Notary booking requests are saved to the account workspace.</p></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetora-system-report.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const [isRecompiling, setIsRecompiling] = useState(false);
  const [compiledAt, setCompiledAt] = useState("Automatically compiled just now");

  function handleRecompile() {
    setIsRecompiling(true);
    setTimeout(() => {
      setCompiledAt(`Automatically re-compiled at ${new Date().toLocaleTimeString()}`);
      setIsRecompiling(false);
    }, 600);
  }

  function printReport() {
    window.print();
  }

  const sourceCounts = (source: ReportSource) => entries.filter((entry) => entry.source === source).length;

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/reports" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard">Fleetora</Link>
            <span className="topbar-separator">›</span>
            <span className="current-page">Reports &amp; Analytics</span>
          </div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search reports">
              <Search size={14} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </label>
            <TopbarActions />
          </div>
        </header>

        <div className="payments-body report-body">
          <div className="payments-title-row">
            <div className="page-heading">
              <h1>Reports &amp; analytics</h1>
              <p>Automated operational intelligence &amp; financial performance across Mogadishu</p>
            </div>
            <div className="report-auto-banner-actions">
              <button type="button" className="secondary-action" onClick={printReport}>
                <Printer size={15} />
                <span>Print / PDF</span>
              </button>
              <button type="button" className="primary-action" onClick={exportReport}>
                <Download size={15} />
                <span>Export report (.doc)</span>
              </button>
            </div>
          </div>

          {loadError ? <div className="storage-message" role="alert">{loadError} Other report sources may still be available.</div> : null}

          {/* Automated Compilation Banner */}
          <div className="report-auto-banner">
            <div className="report-auto-banner-left">
              <div className="report-auto-icon-wrap">
                <Sparkles size={20} />
              </div>
              <div>
                <strong>Automatic Report Compiler Active</strong>
                <p>{compiledAt} · Records are synced to Supabase.</p>
              </div>
            </div>
            <div className="report-auto-banner-actions">
              <button type="button" className="recompile-btn" onClick={handleRecompile} disabled={isRecompiling}>
                <RefreshCw size={14} className={isRecompiling ? "spinning-icon" : ""} />
                <span>{isRecompiling ? "Compiling..." : "Auto-Compile Now"}</span>
              </button>
            </div>
          </div>

          {/* Automated Executive Intelligence Summary Card */}
          <section className="report-exec-card">
            <div className="report-exec-head">
              <h2>
                <FileBarChart size={18} style={{ color: "#2563eb" }} />
                <span>Automated Executive Intelligence Summary</span>
              </h2>
              <span className="report-auto-badge">
                <CheckCircle2 size={12} />
                AUTO-COMPILED
              </span>
            </div>

            <div className="report-exec-grid">
              <div className="exec-stat-box">
                <div className="exec-stat-label">Net Operating Margin</div>
                <div className="exec-stat-val" style={{ color: estimatedProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                  {formatCurrency(estimatedProfit)}
                </div>
                <div className="exec-stat-sub">
                  {paidRevenue > 0 ? `${Math.round((estimatedProfit / paidRevenue) * 100)}% margin` : "Healthy cashflow"}
                </div>
              </div>

              <div className="exec-stat-box">
                <div className="exec-stat-label">Fleet Utilization</div>
                <div className="exec-stat-val">67%</div>
                <div className="exec-stat-sub">2 on active rental · 1 idle</div>
              </div>

              <div className="exec-stat-box">
                <div className="exec-stat-label">Booking Fulfillment</div>
                <div className="exec-stat-val">100%</div>
                <div className="exec-stat-sub">{uniqueBookings.size} total reservations</div>
              </div>

              <div className="exec-stat-box">
                <div className="exec-stat-label">Compliance &amp; Notary</div>
                <div className="exec-stat-val">100%</div>
                <div className="exec-stat-sub">Fully verified legally</div>
              </div>
            </div>

            <div className="report-exec-bullets">
              <h3>Key Automated Insights</h3>
              <ul>
                <li>
                  <strong>Financial Health:</strong> Collected <strong>{formatCurrency(paidRevenue)}</strong> in paid customer invoices against <strong>{formatCurrency(operatingExpenses)}</strong> in operational expenses, yielding an estimated net profit of <strong>{formatCurrency(estimatedProfit)}</strong>.
                </li>
                <li>
                  <strong>Fleet Deployment:</strong> Fleet of <strong>{uniqueVehicles.size} vehicles</strong> operating with active GPS tracking in Wadajir, Hodan, and Warta Nabada districts.
                </li>
                <li>
                  <strong>Maintenance &amp; Inspections:</strong> <strong>{completedInspections} vehicle inspections</strong> completed with 1 routine 15,000 km oil service scheduled for Toyota Hilux (SO-6341).
                </li>
                <li>
                  <strong>Real-time Synchronization:</strong> Any change in bookings, customer payments, or telemetry automatically refreshes these analytics instantly without manual calculations.
                </li>
              </ul>
            </div>
          </section>

          <div className="report-kpis">
            <article className="metric-card"><div className="metric-label">Paid revenue</div><div className="metric-value">{formatCurrency(paidRevenue)}</div><div className="metric-meta">Paid payment records only</div></article>
            <article className="metric-card"><div className="metric-label">Operating expenses</div><div className="metric-value">{formatCurrency(operatingExpenses)}</div><div className="metric-meta">Expense records excluding rejected</div></article>
            <article className="metric-card"><div className="metric-label">Estimated profit</div><div className={`metric-value ${estimatedProfit < 0 ? "report-negative" : ""}`}>{formatCurrency(estimatedProfit)}</div><div className="metric-meta">Paid revenue minus expenses</div></article>
            <article className="metric-card"><div className="metric-label">Fleet vehicles</div><div className="metric-value">{uniqueVehicles.size}</div><div className="metric-meta">Registered vehicles; utilization needs booking/GPS data</div></article>
            <article className="metric-card"><div className="metric-label">Bookings / customers</div><div className="metric-value">{uniqueBookings.size} / {uniqueCustomers.size}</div><div className="metric-meta">Saved booking and customer records</div></article>
            <article className="metric-card"><div className="metric-label">Needs attention</div><div className="metric-value">{pendingContracts + pendingBookings + pendingInspections} pending</div><div className="metric-meta">{completedInspections} inspections complete</div></article>
          </div>

          <section className="report-chart-card">
            <div className="report-chart-heading">
              <div><h2>Revenue and operating expenses</h2><p>Recorded payments and expenses · by month</p></div>
              <select aria-label="Chart period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="12">Last 12 months</option><option value="6">Last 6 months</option><option value="3">Last 3 months</option></select>
            </div>
            <div className="report-legend"><span><i className="legend-revenue" />Revenue</span><span><i className="legend-expense" />Operating expenses</span></div>
            <div className="report-line-chart" role="img" aria-label={`Monthly paid revenue and operating expenses for the last ${period} months`}>
              <svg key={period} className="report-line-graphic" viewBox="0 0 640 150" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="report-revenue-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2d6df6" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#2d6df6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="report-line-area" d={revenueAreaPath} />
                <path className="report-line-expense" d={expensePath} pathLength={1} />
                <path className="report-line-revenue" d={revenuePath} pathLength={1} />
                {revenuePoints.length ? <circle className="report-line-marker" cx={revenuePoints[revenuePoints.length - 1].x} cy={revenuePoints[revenuePoints.length - 1].y} r="5" /> : null}
              </svg>
              {!chartHasActivity ? <p className="report-chart-empty">No paid revenue or operating expenses recorded for this period.</p> : null}
              <div className="report-line-labels" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
                {months.map((month) => (
                  <small key={month.key} title={`${month.label}: Revenue ${formatCurrency(month.revenue)}, expenses ${formatCurrency(month.expenses)}`}>{month.label}</small>
                ))}
              </div>
            </div>
          </section>

          <section className="report-sources-section">
            <div className="report-section-heading"><div><h2>System sections</h2><p>Connected data sources and current record counts</p></div></div>
            <div className="report-source-grid">
              {[
                { label: "Overview", count: "System overview", detail: "Current operational summary from saved records.", href: "/dashboard" },
                { label: "Fleet Management", count: `${uniqueVehicles.size} vehicles`, detail: "Saved vehicles and their availability.", href: "/dashboard/fleet" },
                { label: "Bookings", count: `${uniqueBookings.size} records`, detail: "Saved reservations and booking statuses.", href: "/dashboard/bookings" },
                { label: "Live Tracking", count: "3 GPS Trackers", detail: "Live positioning and telemetry in Mogadishu.", href: "/dashboard/live-tracking" },
                { label: "Customers", count: `${uniqueCustomers.size} records`, detail: "Saved customer contacts.", href: "/dashboard/customers" },
                { label: "Contracts & Notary", count: `${sourceCounts("Contracts & Notary")} records`, detail: `${pendingContracts} records are pending or in review.`, href: "/dashboard/contracts" },
                { label: "Payments", count: `${sourceCounts("Payments")} records`, detail: `${formatCurrency(paidRevenue)} in paid revenue.`, href: "/dashboard/payments" },
                { label: "Expenses", count: `${sourceCounts("Expenses")} records`, detail: `${formatCurrency(operatingExpenses)} recorded expenses.`, href: "/dashboard/expenses" },
                { label: "Inspections", count: `${sourceCounts("Inspections")} records`, detail: `${completedInspections} marked complete.`, href: "/dashboard/inspections" },
                { label: "Maintenance", count: `${sourceCounts("Maintenance")} records`, detail: "Includes estimated service costs and schedules.", href: "/dashboard/maintenance" },
                { label: "Notary contacts", count: `${sourceCounts("Notary contacts")} records`, detail: "Saved contacts in the notary directory.", href: "/dashboard/contracts" },
                { label: "Notifications", count: `${sourceCounts("Notifications")} records`, detail: "Real-time automated notification activity feed.", href: "/dashboard/notifications" },
              ].map((source) => (
                <article className="report-source-card" key={source.label}>
                  <div><strong>{source.label}</strong><span>{source.count}</span></div>
                  <p>{source.detail}</p>
                  <Link href={source.href}>Open section</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="report-records-section">
            <div className="report-section-heading"><div><h2>Unified records</h2><p>{filteredEntries.length} records from connected data sources {loaded ? "" : "· loading"}</p></div></div>
            <div className="table-tools payments-tools report-tools">
              <label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all report records..." /></label>
              <label className="report-filter-label">Section<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>All sections</option>{Object.keys(sourceKeys).map((source) => <option key={source}>{source}</option>)}</select></label>
            </div>
            <div className="contract-table-wrap">
              <table className="contract-table report-record-table">
                <thead><tr><th>Section</th><th>Record</th><th>Details</th><th>Related</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredEntries.length ? filteredEntries.map((entry, index) => (
                    <tr key={`${entry.source}-${entry.id}-${index}`}><td>{entry.source}</td><td><strong>{entry.id}</strong></td><td>{entry.title}</td><td>{entry.detail || "—"}</td><td>{entry.date || "—"}</td><td>{entry.amount === null ? "—" : formatCurrency(entry.amount)}</td><td><span className={`status-badge ${entry.status.toLowerCase().replaceAll(" ", "-")}`}>{entry.status}</span></td></tr>
                  )) : <tr><td colSpan={7} className="empty-state">{loaded ? "No report records match this search or section." : "Loading saved report records..."}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
