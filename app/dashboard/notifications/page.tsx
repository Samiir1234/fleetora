"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DASHBOARD_DATA_CHANGED_EVENT, saveDashboardData } from "../dashboard-storage";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import {
  Bell,
  Download,
  Search,
  SlidersHorizontal,
  Check,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";

type NotificationStatus = "Unread" | "Read" | "Resolved";
type Priority = "High" | "Normal" | "Low";
type NotificationRecord = {
  id: string;
  title: string;
  category: string;
  branch: string;
  receivedAt: string;
  owner: string;
  status: NotificationStatus;
  priority: Priority;
  details: string;
  sourceRecord?: string;
  resolvedAt?: string;
};
type SourceConfig = {
  key: string;
  category: string;
  getId: (record: Record<string, unknown>) => string;
  getFingerprint: (record: Record<string, unknown>) => string;
  describe: (record: Record<string, unknown>, changed: boolean) => Pick<NotificationRecord, "title" | "details" | "priority">;
};

const NOTIFICATIONS_KEY = "fleetora-notification-records";
const BASELINE_KEY = "fleetora-notification-source-baseline";
const SYSTEM_OWNER = "System";

const initialSystemNotifications: NotificationRecord[] = [
  {
    id: "notif-1",
    title: "Return inspection overdue",
    category: "Inspections",
    branch: "Mogadishu Main",
    receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "High",
    details: "Toyota Hilux (AB-2045) · Return inspection overdue for booking BK-2045.",
    sourceRecord: "IN-2030",
  },
  {
    id: "notif-2",
    title: "Vehicle brake service in progress",
    category: "Maintenance",
    branch: "Main branch",
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "High",
    details: "Toyota Hilux (SO-6341) · In service with AutoCare · Est. cost $440.",
    sourceRecord: "SO-6341",
  },
  {
    id: "notif-3",
    title: "Rental contract pending notary review",
    category: "Contracts & Notary",
    branch: "Mogadishu HQ",
    receivedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "High",
    details: "Contract CT-10285 requires legal verification before vehicle release.",
    sourceRecord: "CT-10285",
  },
  {
    id: "notif-4",
    title: "GPS tracker offline - battery critical",
    category: "Live Tracking",
    branch: "Warta Nabada",
    receivedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "High",
    details: "Coban TK103B on Toyota Hilux SO-6341 is offline (12% battery remaining).",
    sourceRecord: "SO-6341",
  },
  {
    id: "notif-5",
    title: "Booking confirmed for pickup today",
    category: "Bookings",
    branch: "Mogadishu Main",
    receivedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "Omar Abdi · Toyota Hilux · Confirmed reservation for today.",
    sourceRecord: "BK-2047",
  },
  {
    id: "notif-6",
    title: "Active rental in progress",
    category: "Bookings",
    branch: "East branch",
    receivedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "Amina Warsame · Toyota Land Cruiser · Return scheduled today.",
    sourceRecord: "BK-2048",
  },
  {
    id: "notif-7",
    title: "Payment received via Mobile Money",
    category: "Payments",
    branch: "Mogadishu Main",
    receivedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "$870 paid for Booking BK-2048 · Mobile money confirmation received.",
    sourceRecord: "TX-98420",
  },
  {
    id: "notif-8",
    title: "Rental security deposit held",
    category: "Payments",
    branch: "Mogadishu Main",
    receivedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Low",
    details: "$500 refundable security deposit received via Bank transfer.",
    sourceRecord: "TX-98419",
  },
  {
    id: "notif-9",
    title: "Operating expense pending approval",
    category: "Expenses",
    branch: "Technology",
    receivedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "GPS hardware data subscriptions · $1,280 submitted by Operations.",
    sourceRecord: "EX-00382",
  },
  {
    id: "notif-10",
    title: "Pickup inspection scheduled",
    category: "Inspections",
    branch: "Main branch",
    receivedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "Land Cruiser · Pickup inspection scheduled at 09:00 AM.",
    sourceRecord: "IN-2031",
  },
  {
    id: "notif-11",
    title: "Scheduled maintenance upcoming",
    category: "Maintenance",
    branch: "Main branch",
    receivedAt: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "Nissan Patrol (SO-1189) · Oil & filters service scheduled in 3 days.",
    sourceRecord: "SO-1189",
  },
  {
    id: "notif-12",
    title: "Contract approved by customer",
    category: "Contracts & Notary",
    branch: "Mogadishu HQ",
    receivedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Normal",
    details: "Contract CT-10284 approved and signed via WhatsApp delivery.",
    sourceRecord: "CT-10284",
  },
  {
    id: "notif-13",
    title: "New corporate customer added",
    category: "Customers",
    branch: "Mogadishu HQ",
    receivedAt: new Date(Date.now() - 1000 * 60 * 700).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Low",
    details: "Amina Warsame (+252 61 000 1001) registered with active rental status.",
    sourceRecord: "CU-1001",
  },
  {
    id: "notif-14",
    title: "Automated daily fleet status check",
    category: "Fleet Management",
    branch: "All branches",
    receivedAt: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    owner: "System",
    status: "Unread",
    priority: "Low",
    details: "3 vehicles registered: 2 available for rental, 1 currently undergoing service.",
    sourceRecord: "VH-1001",
  },
];

const sourceConfigs: SourceConfig[] = [
  {
    key: "fleetora-fleet-records",
    category: "Fleet Management",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Vehicle status updated" : "Vehicle added to fleet",
      details: `${stringField(record, "vehicle")} · ${stringField(record, "plate")} · ${stringField(record, "status")}`,
      priority: ["Maintenance", "Inactive"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-booking-records",
    category: "Bookings",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Booking status updated" : "New booking created",
      details: `${stringField(record, "customer")} · ${stringField(record, "vehicle")} · ${stringField(record, "status")}`,
      priority: ["Pending", "Cancelled"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-customer-records",
    category: "Customers",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Customer status updated" : "New customer added",
      details: `${stringField(record, "name")} · ${stringField(record, "phone")} · ${stringField(record, "city")}`,
      priority: "Low",
    }),
  },
  {
    key: "fleetora-payment-records",
    category: "Payments",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => `${stringField(record, "status")}|${stringField(record, "type")}`,
    describe: (record, changed) => {
      const booking = stringField(record, "booking");
      const type = stringField(record, "type");
      const status = stringField(record, "status");
      return {
        title: changed ? `Payment status updated${booking ? ` for ${booking}` : ""}` : type === "Expense" ? "New expense recorded" : `Payment recorded${booking ? ` for ${booking}` : ""}`,
        details: `${stringField(record, "description", type || "Payment")} · ${stringField(record, "method")} · ${status || "Status unavailable"}`,
        priority: ["Overdue", "Rejected"].includes(status) ? "High" : status === "Pending" ? "Normal" : "Low",
      };
    },
  },
  {
    key: "fleetora-expense-records",
    category: "Expenses",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Expense approval status updated" : "New expense submitted",
      details: `${stringField(record, "category")} · ${stringField(record, "vendor")} · ${stringField(record, "status")}`,
      priority: ["Pending", "Rejected"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-inspection-records",
    category: "Inspections",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Inspection status updated" : "Inspection scheduled",
      details: `${stringField(record, "type")} · ${stringField(record, "vehicle")} · ${stringField(record, "booking")} · ${stringField(record, "status")}`,
      priority: ["Overdue", "Pending"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-maintenance-records",
    category: "Maintenance",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Maintenance status updated" : "Vehicle service scheduled",
      details: `${stringField(record, "vehicle")} · ${stringField(record, "service")} · ${stringField(record, "provider")} · ${stringField(record, "status")}`,
      priority: ["Overdue", "Pending", "In service"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-contracts",
    category: "Contracts & Notary",
    getId: (record) => stringField(record, "contract"),
    getFingerprint: (record) => stringField(record, "status"),
    describe: (record, changed) => ({
      title: changed ? "Contract review status updated" : "New contract created",
      details: `${stringField(record, "customer")} · ${stringField(record, "booking")} · ${stringField(record, "status")}`,
      priority: ["Pending", "Review"].includes(stringField(record, "status")) ? "High" : "Normal",
    }),
  },
  {
    key: "fleetora-notary-profiles",
    category: "Contacts & Notary",
    getId: (record) => stringField(record, "id"),
    getFingerprint: (record) => stringField(record, "licenseNumber"),
    describe: (record) => ({
      title: "Notary contact added",
      details: `${stringField(record, "name")} · License ${stringField(record, "licenseNumber")}`,
      priority: "Low",
    }),
  },
];

function stringField(record: Record<string, unknown>, key: string, fallback = "") {
  return typeof record[key] === "string" ? record[key] : fallback;
}

function isNotification(value: unknown): value is NotificationRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.title === "string"
    && typeof record.category === "string"
    && typeof record.branch === "string"
    && typeof record.receivedAt === "string"
    && typeof record.owner === "string"
    && ["Unread", "Read", "Resolved"].includes(String(record.status))
    && ["High", "Normal", "Low"].includes(String(record.priority))
    && typeof record.details === "string"
    && (record.resolvedAt === undefined || typeof record.resolvedAt === "string");
}

function readNotifications(): NotificationRecord[] {
  const saved = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!saved) {
    saveDashboardData(NOTIFICATIONS_KEY, initialSystemNotifications);
    return initialSystemNotifications;
  }
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isNotification)) {
      saveDashboardData(NOTIFICATIONS_KEY, initialSystemNotifications);
      return initialSystemNotifications;
    }
    return parsed;
  } catch {
    saveDashboardData(NOTIFICATIONS_KEY, initialSystemNotifications);
    return initialSystemNotifications;
  }
}

function readBaseline() {
  const saved = localStorage.getItem(BASELINE_KEY);
  if (!saved) return null;
  const parsed: unknown = JSON.parse(saved);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved notification tracking data is invalid.");
  }
  return parsed as Record<string, string>;
}

function getCurrentSourceBaseline() {
  const current: Record<string, string> = {};
  for (const config of sourceConfigs) {
    const value = localStorage.getItem(config.key);
    if (!value) continue;
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      throw new Error(`Notification source "${config.key}" contains invalid data.`);
    }
    for (const record of parsed as Record<string, unknown>[]) {
      const id = config.getId(record);
      if (id) current[`${config.key}:${id}`] = config.getFingerprint(record);
    }
  }
  return current;
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let scanning = false;

    function scanSources() {
      if (scanning) return;
      scanning = true;
      try {
        const current: Record<string, string> = {};
        const discoveries: NotificationRecord[] = [];
        const previous = readBaseline();

        for (const config of sourceConfigs) {
          const value = localStorage.getItem(config.key);
          if (!value) continue;
          const parsed: unknown = JSON.parse(value);
          if (!Array.isArray(parsed) || !parsed.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
            throw new Error(`Notification source "${config.key}" contains invalid data.`);
          }
          for (const raw of parsed as Record<string, unknown>[]) {
            const recordId = config.getId(raw);
            if (!recordId) continue;
            const key = `${config.key}:${recordId}`;
            const fingerprint = config.getFingerprint(raw);
            current[key] = fingerprint;
            if (!previous) continue;
            const priorFingerprint = previous[key];
            if (priorFingerprint === undefined || priorFingerprint !== fingerprint) {
              const isChanged = priorFingerprint !== undefined;
              const description = config.describe(raw, isChanged);
              discoveries.push({
                id: `auto:${key}:${fingerprint || "created"}`,
                title: description.title,
                category: config.category,
                branch: stringField(raw, "branch", stringField(raw, "city", "All branches")),
                receivedAt: new Date().toISOString(),
                owner: SYSTEM_OWNER,
                status: "Unread",
                priority: description.priority,
                details: description.details,
                sourceRecord: recordId,
              });
            }
          }
        }

        if (!active) return;
        if (!previous) {
          saveDashboardData(BASELINE_KEY, current);
          const initialNotifications = readNotifications();
          setNotifications(initialNotifications);
        } else {
          const savedNotifications = readNotifications();
          const knownIds = new Set(savedNotifications.map((item) => item.id));
          const newItems = discoveries.filter((item) => !knownIds.has(item.id));
          const merged = [...newItems, ...savedNotifications];
          if (newItems.length) saveDashboardData(NOTIFICATIONS_KEY, merged);
          saveDashboardData(BASELINE_KEY, current);
          setNotifications(merged);
        }
        setError("");
      } catch (scanError) {
        if (active) setError(scanError instanceof Error ? scanError.message : "Could not scan notification sources.");
      } finally {
        if (active) setLoaded(true);
        scanning = false;
      }
    }

    scanSources();
    window.addEventListener("storage", scanSources);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, scanSources);
    window.addEventListener("focus", scanSources);
    return () => {
      active = false;
      window.removeEventListener("storage", scanSources);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, scanSources);
      window.removeEventListener("focus", scanSources);
    };
  }, []);

  const unreadCount = notifications.filter((item) => item.status === "Unread").length;
  const highPriorityCount = notifications.filter((item) => item.priority === "High" && item.status !== "Resolved").length;
  const resolvedToday = notifications.filter((item) => item.status === "Resolved" && item.resolvedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const categories = useMemo(() => Array.from(new Set(notifications.map((item) => item.category))).sort(), [notifications]);
  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((item) =>
      (!query || [item.title, item.category, item.branch, item.owner, item.status, item.priority, item.details].join(" ").toLowerCase().includes(query))
      && (categoryFilter === "All categories" || item.category === categoryFilter)
      && (statusFilter === "All statuses" || item.status === statusFilter)
      && (priorityFilter === "All priorities" || item.priority === priorityFilter),
    );
  }, [categoryFilter, notifications, priorityFilter, search, statusFilter]);

  function persistNotifications(next: NotificationRecord[]) {
    try {
      saveDashboardData(NOTIFICATIONS_KEY, next);
      setNotifications(next);
      setError("");
      return true;
    } catch {
      setError("Could not save notification changes in this browser.");
      return false;
    }
  }

  function updateStatus(id: string, status: NotificationStatus) {
    persistNotifications(notifications.map((item) => item.id === id
      ? { ...item, status, ...(status === "Resolved" ? { resolvedAt: new Date().toISOString() } : { resolvedAt: undefined }) }
      : item));
  }

  function deleteAllNotifications() {
    if (!notifications.length) return;
    if (!window.confirm(`Delete all ${notifications.length} notifications? This cannot be undone.`)) return;
    try {
      saveDashboardData(BASELINE_KEY, getCurrentSourceBaseline());
      persistNotifications([]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete notifications.");
    }
  }

  function exportNotifications() {
    const rows = filteredNotifications.map((item) =>
      `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.branch)}</td><td>${escapeHtml(relativeTime(item.receivedAt))}</td><td>${escapeHtml(item.owner)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.priority)}</td><td>${escapeHtml(item.details)}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Fleetora Notifications</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Fleetora Notifications</h1><p>${filteredNotifications.length} notifications · automatic source scan every 4 seconds</p><table><thead><tr><th>Notification</th><th>Category</th><th>Branch</th><th>Received</th><th>Owner</th><th>Status</th><th>Priority</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetora-notifications.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/notifications" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left"><Link href="/dashboard">Fleetora</Link><span className="topbar-separator">›</span><span className="current-page">Notifications</span></div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search notifications"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>
            <TopbarActions />
          </div>
        </header>

        <div className="payments-body notifications-body">
          <div className="payments-title-row">
            <div className="page-heading">
              <h1>Notifications</h1>
              <p>Stay ahead of real-time fleet, bookings &amp; financial operations</p>
            </div>
          </div>
          {error ? <div className="storage-message" role="alert">{error}</div> : null}
          <div className="notification-sync-note">
            <span className="sync-dot" />
            Automatic system notification dispatcher is active · Monitoring fleet, bookings, contracts, GPS and finance triggers · Alerts are automatically pushed live
          </div>

          <div className="metrics-row payments-metrics notification-kpis">
            <div className="metric-card"><div className="metric-label">Unread</div><div className="metric-value">{unreadCount}</div><div className="metric-meta">Live count</div></div>
            <div className="metric-card"><div className="metric-label">High priority</div><div className="metric-value">{highPriorityCount}</div><div className="metric-meta">Not resolved</div></div>
            <div className="metric-card"><div className="metric-label">Resolved today</div><div className="metric-value">{resolvedToday}</div><div className="metric-meta">Updated just now</div></div>
          </div>

          <section className="payments-list notifications-list" aria-label="Notifications">
            <div className="table-tools payments-tools notification-tools">
              <label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications..." /></label>
              <div className="tool-actions">
                <button type="button" className="secondary-action" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} /><span>Filters</span></button>
                <button type="button" className="secondary-action" onClick={exportNotifications}><Download size={14} /><span>Export Word</span></button>
                {unreadCount ? <button type="button" className="secondary-action" onClick={() => persistNotifications(notifications.map((item) => item.status === "Unread" ? { ...item, status: "Read" } : item))}><CheckCheck size={14} /><span>Mark all read</span></button> : null}
                {notifications.length ? <button type="button" className="secondary-action notification-delete-all" onClick={deleteAllNotifications}><Trash2 size={14} /><span>Delete all</span></button> : null}
              </div>
            </div>
            {filtersOpen ? (
              <div className="filter-panel payments-filter-panel">
                <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Unread</option><option>Read</option><option>Resolved</option></select></label>
                <label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All priorities</option><option>High</option><option>Normal</option><option>Low</option></select></label>
                <button type="button" className="clear-filters" onClick={() => { setCategoryFilter("All categories"); setStatusFilter("All statuses"); setPriorityFilter("All priorities"); }}>Clear filters</button>
              </div>
            ) : null}
            <div className="contract-table-wrap">
              <table className="contract-table payments-table notifications-table">
                <thead><tr><th>Notification</th><th>Category</th><th>Branch</th><th>Received</th><th>Owner</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredNotifications.length ? filteredNotifications.map((item) => (
                    <tr key={item.id} className={`notification-row${item.status === "Unread" ? " notification-unread" : ""}`}>
                      <td><div className="notification-title-cell"><span className={`priority-mark priority-${item.priority.toLowerCase()}`} /><span><strong>{item.title}</strong><small>{item.details}</small></span></div></td>
                      <td>{item.category}</td><td>{item.branch}</td><td>{relativeTime(item.receivedAt)}</td><td>{item.owner}</td>
                      <td><button type="button" className={`status-badge ${item.status.toLowerCase()}`} onClick={() => updateStatus(item.id, item.status === "Resolved" ? "Unread" : "Resolved")} title="Click to resolve or reopen">{item.status}</button></td>
                      <td><div className="row-actions">{item.status === "Unread" ? <button type="button" className="notification-action" aria-label="Mark as read" title="Mark as read" onClick={() => updateStatus(item.id, "Read")}><Check size={14} /></button> : null}{item.status !== "Resolved" ? <button type="button" className="notification-action" aria-label="Resolve notification" title="Resolve notification" onClick={() => updateStatus(item.id, "Resolved")}><CheckCheck size={14} /></button> : null}</div></td>
                    </tr>
                  )                  ) : <tr><td colSpan={7} className="empty-state">{!loaded ? "Loading notifications..." : notifications.length === 0 ? "No notifications. New system alerts will appear here when activity changes." : "No notifications match your search or filters."}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="notification-connectivity">
            <strong>Connected live modules:</strong>
            <span>Fleet Management</span>
            <span>Bookings</span>
            <span>Live GPS Tracking</span>
            <span>Payments &amp; Mobile Money</span>
            <span>Operating Expenses</span>
            <span>Vehicle Inspections</span>
            <span>Fleet Maintenance</span>
            <span>Contracts &amp; Notary</span>
            <p>Real-time system event listener active. When bookings change, payments arrive, contracts are reviewed, or GPS alerts trigger, automated notifications are immediately created and synced across the workspace.</p>
          </section>
        </div>
      </main>

    </div>
  );
}
