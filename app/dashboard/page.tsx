"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  CircleCheck,
  FileText,
  Grid2X2,
  LogOut,
  MapPin,
  ReceiptText,
  CarFront,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import { initializeDashboardDemoData } from "./demo-data";
import { DASHBOARD_DATA_CHANGED_EVENT } from "./dashboard-storage";
import { signOutUser } from "../auth";
import Sidebar from "./Sidebar";
import TopbarActions from "./TopbarActions";

type DashboardRecord = Record<string, unknown>;
type OverviewData = Record<string, DashboardRecord[]>;
type Language = "en" | "so";

const translations = {
  en: {
    overview: "Overview",
    rentalOperations: "Your rental operations at a glance",
    viewReports: "View reports",
    paidRevenue: "Paid revenue",
    savedPaymentRecords: "Saved payment records",
    bookings: "Bookings",
    savedReservations: "Saved reservations",
    needsAttention: "Needs attention",
    reviewsInspections: "Reviews and inspections",
    openMaintenance: "Open maintenance",
    notCompletedCancelled: "Not completed or cancelled",
    systemSections: "System sections",
    openSection: "Open a section to manage its saved records",
    liveTracking: "Live GPS Tracking",
    liveTrackingDescription: "Monitor vehicle locations and tracking status.",
    dashboardPulse: "Dashboard activity",
    dashboardPulseDescription: "A live snapshot of your fleet operations.",
    workspace: "Fleetora workspace",
    live: "LIVE",
    revenueTrend: "Revenue activity",
    lastSevenDays: "Last 7 days",
    fleetStatus: "Fleet status",
    vehiclesTracked: "Vehicles tracked",
    bookingsToday: "Bookings",
    attentionNeeded: "Needs attention",
    activityUpdated: "Workspace activity updates as records change.",
    savedRecords: "saved records",
    recentActivity: "Recent activity",
    latestRecords: "Latest records across connected sections",
    section: "Section",
    record: "Record",
    details: "Details",
    date: "Date",
    status: "Status",
    noActivity: "No saved activity is available yet.",
    demoNote: "Your workspace records are securely synced to Supabase.",
    switchLanguage: "Switch language to Somali",
  },
  so: {
    overview: "Dulmar",
    rentalOperations: "Halkaan ka eeg hawlaha kiradaada",
    viewReports: "Eeg warbixinnada",
    paidRevenue: "Dakhliga la bixiyey",
    savedPaymentRecords: "Diiwaannada lacag-bixinta",
    bookings: "Boos-celinnada",
    savedReservations: "Boos-celinno la diiwaangeliyey",
    needsAttention: "U baahan fiiro gaar ah",
    reviewsInspections: "Dib-u-eegisyo iyo kormeerro",
    openMaintenance: "Dayactir socda",
    notCompletedCancelled: "Aan la dhammaystirin ama la joojin",
    systemSections: "Qaybaha nidaamka",
    openSection: "Fur qayb si aad u maamusho diiwaannadeeda",
    liveTracking: "Raadraaca GPS-ka tooska ah",
    liveTrackingDescription: "La soco goobaha gaadiidka iyo xaaladdooda.",
    dashboardPulse: "Hawlaha dashboard-ka",
    dashboardPulseDescription: "Muuqaal kooban oo ku saabsan hawlaha gaadiidka.",
    workspace: "Goobta shaqada Fleetora",
    live: "TOOS",
    revenueTrend: "Dhaqdhaqaaqa dakhliga",
    lastSevenDays: "7-dii maalmood ee u dambeeyey",
    fleetStatus: "Xaaladda gaadiidka",
    vehiclesTracked: "Gaadiid la diiwaangeliyey",
    bookingsToday: "Boos-celinno",
    attentionNeeded: "U baahan fiiro gaar ah",
    activityUpdated: "Hawlaha goobta shaqadu way is cusboonaysiiyaan marka diiwaannadu is beddelaan.",
    savedRecords: "diiwaan",
    recentActivity: "Hawlihii u dambeeyey",
    latestRecords: "Diiwaannadii ugu dambeeyey ee qaybaha",
    section: "Qaybta",
    record: "Diiwaan",
    details: "Faahfaahin",
    date: "Taariikh",
    status: "Xaalad",
    noActivity: "Weli ma jiraan hawlo la diiwaangeliyey.",
    demoNote: "Xogta workspace-kaaga si ammaan ah ayaa loogu kaydiyaa Supabase.",
    switchLanguage: "U beddel Ingiriisi",
  },
} as const;

const somaliSourceLabels: Record<string, string> = {
  "Fleet Management": "Maamulka gaadiidka",
  Bookings: "Boos-celinnada",
  Customers: "Macaamiisha",
  Payments: "Lacag-bixinta",
  Expenses: "Kharashaadka",
  Inspections: "Kormeerka",
  Maintenance: "Dayactirka",
  "Contracts & Notary": "Qandaraasyada iyo nootaayada",
  "Notary contacts": "Xiriirrada nootaayada",
  "Notary booking requests": "Codsiyada ballanta nootaayada",
  Notifications: "Ogeysiisyada",
};

const sources = [
  { label: "Fleet Management", key: "fleetora-fleet-records", icon: CarFront, href: "/dashboard/fleet" },
  { label: "Bookings", key: "fleetora-booking-records", icon: CalendarDays, href: "/dashboard/bookings" },
  { label: "Customers", key: "fleetora-customer-records", icon: Users, href: "/dashboard/customers" },
  { label: "Payments", key: "fleetora-payment-records", icon: WalletCards, href: "/dashboard/payments" },
  { label: "Expenses", key: "fleetora-expense-records", icon: ReceiptText, href: "/dashboard/expenses" },
  { label: "Inspections", key: "fleetora-inspection-records", icon: CircleCheck, href: "/dashboard/inspections" },
  { label: "Maintenance", key: "fleetora-maintenance-records", icon: Wrench, href: "/dashboard/maintenance" },
  { label: "Contracts & Notary", key: "fleetora-contracts", icon: FileText, href: "/dashboard/contracts" },
  { label: "Notary contacts", key: "fleetora-notary-profiles", icon: Users, href: "/dashboard/contracts" },
  { label: "Notary booking requests", key: "fleetora-notary-booking-requests", icon: FileText, href: "/dashboard/contracts" },
  { label: "Notifications", key: "fleetora-notification-records", icon: Bell, href: "/dashboard/notifications" },
];

const workspaceLinks = [
  { label: "Overview", icon: Grid2X2, href: "/dashboard", active: true },
  { label: "Fleet Management", icon: CarFront, href: "/dashboard/fleet" },
  { label: "Bookings", icon: CalendarDays, href: "/dashboard/bookings" },
  { label: "Live Tracking", icon: MapPin, href: "/dashboard/live-tracking" },
  { label: "Customers", icon: Users, href: "/dashboard/customers" },
  { label: "Contracts & Notary", icon: FileText, href: "/dashboard/contracts" },
];
const operationLinks = [
  { label: "Payments", icon: WalletCards, href: "/dashboard/payments" },
  { label: "Expenses", icon: ReceiptText, href: "/dashboard/expenses" },
  { label: "Inspections", icon: CircleCheck, href: "/dashboard/inspections" },
  { label: "Maintenance", icon: Wrench, href: "/dashboard/maintenance" },
  { label: "Reports", icon: ChartNoAxesColumn, href: "/dashboard/reports" },
  { label: "Notifications", icon: Bell, href: "/dashboard/notifications" },
];

function isRecord(value: unknown): value is DashboardRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readData(): OverviewData {
  return Object.fromEntries(sources.map(({ key }) => {
    const saved = localStorage.getItem(key);
    if (saved === null) return [key, []];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
      throw new Error(`Saved dashboard data for "${key}" is invalid.`);
    }
    return [key, parsed];
  }));
}

function amount(record: DashboardRecord) {
  return typeof record.amount === "number" && Number.isFinite(record.amount) ? record.amount : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData>({});
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const text = translations[language];

  const refresh = useCallback(() => {
    try {
      initializeDashboardDemoData();
      setData(readData());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard records.");
    }
  }, []);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("fleetora-language");
      if (savedLanguage === "en" || savedLanguage === "so") setLanguage(savedLanguage);
    } catch {
      setError("Could not read the saved language preference.");
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  async function handleLogout() {
    try {
      await signOutUser();
      router.replace("/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out.");
    }
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
  }

  const getRecords = (key: string) => data[key] ?? [];
  const paymentRecords = getRecords("fleetora-payment-records").filter((record) => record.type !== "Expense");
  const paidRevenue = paymentRecords
    .filter((record) => String(record.status).toLowerCase() === "paid")
    .reduce((sum, record) => sum + amount(record), 0);
  const pendingContracts = getRecords("fleetora-contracts")
    .filter((record) => ["pending", "review"].includes(String(record.status).toLowerCase())).length;
  const upcomingWork = getRecords("fleetora-maintenance-records")
    .filter((record) => !["complete", "cancelled"].includes(String(record.status).toLowerCase())).length;

  const recentActivity = useMemo(() => sources.flatMap(({ label, key, href }) =>
    getRecords(key)
      .filter((record) => !(label === "Payments" && record.type === "Expense"))
      .map((record) => ({
        source: label,
        href,
        id: String(record.id ?? record.contract ?? "Record"),
        detail: String(record.description ?? record.category ?? record.service ?? record.type ?? record.customer ?? label),
        status: String(record.status ?? "Saved"),
        date: String(record.date ?? record.dueDate ?? record.scheduledAt ?? ""),
      })),
  ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [data]);

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left"><span>Fleetora</span><span className="topbar-separator">›</span><span className="current-page">{text.overview}</span></div>
          <div className="topbar-right">
            <TopbarActions language={language} onLanguageChange={changeLanguage} />
            <button
              className="topbar-logout-btn"
              onClick={handleLogout}
              type="button"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <div className="payments-body overview-body">
          <div className="payments-title-row"><div className="page-heading"><h1>{text.overview}</h1><p>{text.rentalOperations}</p></div><Link className="secondary-action" href="/dashboard/reports" prefetch><ChartNoAxesColumn size={15} /><span>{text.viewReports}</span></Link></div>
          {error ? <div className="storage-message" role="alert">{error}</div> : null}
          <section className="overview-kpis" aria-label={language === "so" ? "Soo koobidda nidaamka" : "System summary"}>
            <article className="metric-card"><div className="metric-label">{text.paidRevenue}</div><div className="metric-value">{formatCurrency(paidRevenue)}</div><div className="metric-meta">{text.savedPaymentRecords}</div></article>
            <article className="metric-card"><div className="metric-label">{text.bookings}</div><div className="metric-value">{getRecords("fleetora-booking-records").length}</div><div className="metric-meta">{text.savedReservations}</div></article>
            <article className="metric-card"><div className="metric-label">{text.needsAttention}</div><div className="metric-value">{pendingContracts + getRecords("fleetora-inspection-records").filter((record) => ["pending", "overdue"].includes(String(record.status).toLowerCase())).length}</div><div className="metric-meta">{text.reviewsInspections}</div></article>
            <article className="metric-card"><div className="metric-label">{text.openMaintenance}</div><div className="metric-value">{upcomingWork}</div><div className="metric-meta">{text.notCompletedCancelled}</div></article>
            <article className="metric-card">
              <div className="metric-label">{language === "so" ? "Kaydinta xogta" : "Data storage"}</div>
              <div className="metric-value" style={{ fontSize: 17 }}>Supabase</div>
              <div className="metric-meta">{language === "so" ? "Kayd ammaan ah oo daruur ah" : "Secure cloud storage"}</div>
            </article>
          </section>

          <section className="overview-section overview-showcase">
            <div className="report-section-heading">
              <div><h2>{text.dashboardPulse}</h2><p>{text.dashboardPulseDescription}</p></div>
            </div>
            <div className="showcase-frame">
              <div className="showcase-topbar">
                <div className="showcase-brand"><span className="showcase-brand-mark">F</span>{text.workspace}</div>
                <span className="showcase-live"><i />{text.live}</span>
              </div>
              <div className="showcase-content">
                <div className="showcase-main">
                  <div className="showcase-metrics">
                    <article className="showcase-metric">
                      <span>{text.paidRevenue}</span>
                      <strong>{formatCurrency(paidRevenue)}</strong>
                      <small><WalletCards size={13} />{text.savedPaymentRecords}</small>
                    </article>
                    <article className="showcase-metric">
                      <span>{text.bookingsToday}</span>
                      <strong>{getRecords("fleetora-booking-records").length}</strong>
                      <small><CalendarDays size={13} />{text.savedReservations}</small>
                    </article>
                    <article className="showcase-metric">
                      <span>{text.vehiclesTracked}</span>
                      <strong>{getRecords("fleetora-fleet-records").length}</strong>
                      <small><CarFront size={13} />{text.fleetStatus}</small>
                    </article>
                  </div>
                  <div className="showcase-chart">
                    <div className="showcase-chart-heading">
                      <div><strong>{text.revenueTrend}</strong><span>{text.lastSevenDays}</span></div>
                      <ChartNoAxesColumn size={17} />
                    </div>
                    <svg className="showcase-chart-graphic" viewBox="0 0 640 150" role="img" aria-label={text.revenueTrend}>
                      <defs>
                        <linearGradient id="showcase-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2d6df6" stopOpacity=".22" />
                          <stop offset="100%" stopColor="#2d6df6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path className="showcase-chart-area" d="M0 119 C45 110 50 86 100 96 S160 119 210 83 S275 91 320 66 S380 77 425 50 S490 66 530 34 S595 47 640 16 V150 H0 Z" />
                      <path className="showcase-chart-line" d="M0 119 C45 110 50 86 100 96 S160 119 210 83 S275 91 320 66 S380 77 425 50 S490 66 530 34 S595 47 640 16" />
                      <circle className="showcase-chart-point" cx="530" cy="34" r="5" />
                    </svg>
                  </div>
                </div>
                <aside className="showcase-side">
                  <div className="showcase-side-heading"><strong>{text.fleetStatus}</strong><span className="showcase-status-dot" /></div>
                  <div className="showcase-status-card">
                    <span className="showcase-status-icon"><CarFront size={16} /></span>
                    <span><strong>{getRecords("fleetora-fleet-records").length}</strong><small>{text.vehiclesTracked}</small></span>
                    <ChartNoAxesColumn size={15} />
                  </div>
                  <div className="showcase-status-card">
                    <span className="showcase-status-icon attention"><CircleCheck size={16} /></span>
                    <span><strong>{pendingContracts + getRecords("fleetora-inspection-records").filter((record) => ["pending", "overdue"].includes(String(record.status).toLowerCase())).length}</strong><small>{text.attentionNeeded}</small></span>
                    <ChartNoAxesColumn size={15} />
                  </div>
                  <p className="showcase-footnote">{text.activityUpdated}</p>
                </aside>
              </div>
            </div>
          </section>

          <section className="overview-section">
            <div className="report-section-heading"><div><h2>{text.systemSections}</h2><p>{text.openSection}</p></div></div>
            <div className="overview-module-grid">
              <Link className="overview-module-card" href="/dashboard/live-tracking" prefetch>
                <span className="overview-module-icon"><MapPin size={18} /></span>
                <span className="overview-module-copy">
                  <strong>{text.liveTracking}</strong>
                  <small>{text.liveTrackingDescription}</small>
                </span>
                <span className="overview-module-arrow">›</span>
              </Link>
              {sources.map(({ label, key, icon: Icon, href }) => <Link className="overview-module-card" href={href} prefetch key={key}><span className="overview-module-icon"><Icon size={18} /></span><span className="overview-module-copy"><strong>{language === "so" ? somaliSourceLabels[label] : label}</strong><small>{getRecords(key).length} {text.savedRecords}</small></span><span className="overview-module-arrow">›</span></Link>)}
            </div>
          </section>

          <section className="overview-section overview-recent">
            <div className="report-section-heading"><div><h2>{text.recentActivity}</h2><p>{text.latestRecords}</p></div></div>
            <div className="contract-table-wrap">
              <table className="contract-table report-record-table">
                <thead><tr><th>{text.section}</th><th>{text.record}</th><th>{text.details}</th><th>{text.date}</th><th>{text.status}</th></tr></thead>
                <tbody>{recentActivity.length ? recentActivity.map((item, index) => <tr key={`${item.source}-${item.id}-${index}`}><td><Link href={item.href} prefetch>{language === "so" ? somaliSourceLabels[item.source] : item.source}</Link></td><td><strong>{item.id}</strong></td><td>{item.detail}</td><td>{item.date || "—"}</td><td><span className={`status-badge ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span></td></tr>) : <tr><td colSpan={5} className="empty-state">{text.noActivity}</td></tr>}</tbody>
              </table>
            </div>
          </section>
          <p className="report-source-note">{text.demoNote}</p>
        </div>
      </main>
    </div>
  );
}
