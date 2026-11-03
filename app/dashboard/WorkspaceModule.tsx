"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CarFront,
  ChartNoAxesColumn,
  CircleCheck,
  CircleX,
  FileText,
  Grid2X2,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { DASHBOARD_DATA_CHANGED_EVENT, saveDashboardData } from "./dashboard-storage";
import Sidebar from "./Sidebar";
import TopbarActions from "./TopbarActions";

type ModuleRecord = Record<string, string>;
type FieldConfig = { name: string; label: string; type?: string; required?: boolean };
type ModuleConfig = {
  key: string;
  title: string;
  description: string;
  singular: string;
  fields: FieldConfig[];
  statuses: string[];
  initial: ModuleRecord[];
};

const today = () => new Date().toISOString().slice(0, 10);
const configs: Record<string, ModuleConfig> = {
  fleet: {
    key: "fleetora-fleet-records",
    title: "Fleet Management",
    description: "Manage vehicles and their availability.",
    singular: "vehicle",
    fields: [
      { name: "vehicle", label: "Vehicle name", required: true },
      { name: "plate", label: "Registration number", required: true },
      { name: "type", label: "Vehicle type", required: true },
      { name: "location", label: "Branch / location" },
    ],
    statuses: ["Available", "Rented", "Maintenance", "Inactive"],
    initial: [
      { id: "VH-1001", vehicle: "Toyota Land Cruiser", plate: "AB-1020", type: "SUV", location: "Main branch", status: "Available" },
      { id: "VH-1002", vehicle: "Toyota Hilux", plate: "AB-2045", type: "Pickup", location: "Main branch", status: "Maintenance" },
      { id: "VH-1003", vehicle: "Hyundai Tucson", plate: "AB-3058", type: "SUV", location: "East branch", status: "Available" },
    ],
  },
  bookings: {
    key: "fleetora-booking-records",
    title: "Bookings",
    description: "Create and track rental reservations.",
    singular: "booking",
    fields: [
      { name: "customer", label: "Customer name", required: true },
      { name: "vehicle", label: "Vehicle", required: true },
      { name: "startDate", label: "Pickup date", type: "date", required: true },
      { name: "endDate", label: "Return date", type: "date", required: true },
    ],
    statuses: ["Pending", "Confirmed", "Active", "Completed", "Cancelled"],
    initial: [
      { id: "BK-2048", customer: "Amina Warsame", vehicle: "Toyota Land Cruiser", startDate: today(), endDate: today(), status: "Active" },
      { id: "BK-2047", customer: "Omar Abdi", vehicle: "Toyota Hilux", startDate: today(), endDate: today(), status: "Confirmed" },
    ],
  },
  customers: {
    key: "fleetora-customer-records",
    title: "Customers",
    description: "Keep customer contact details together.",
    singular: "customer",
    fields: [
      { name: "name", label: "Full name", required: true },
      { name: "phone", label: "Phone number", required: true },
      { name: "email", label: "Email address", type: "email" },
      { name: "city", label: "City" },
    ],
    statuses: ["Active", "Inactive"],
    initial: [
      { id: "CU-1001", name: "Amina Warsame", phone: "+252 61 000 1001", email: "", city: "Mogadishu", status: "Active" },
      { id: "CU-1002", name: "Omar Abdi", phone: "+252 61 000 1002", email: "", city: "Mogadishu", status: "Active" },
    ],
  },
};

const sidebarSections = [
  { title: "Workspace", items: [
    { label: "Overview", href: "/dashboard", icon: Grid2X2 },
    { label: "Fleet Management", href: "/dashboard/fleet", icon: CarFront },
    { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { label: "Live Tracking", href: "/dashboard/live-tracking", icon: MapPin },
    { label: "Customers", href: "/dashboard/customers", icon: Users },
    { label: "Contracts & Notary", href: "/dashboard/contracts", icon: FileText },
  ] },
  { title: "Finance & Operations", items: [
    { label: "Payments", href: "/dashboard/payments", icon: WalletCards },
    { label: "Expenses", href: "/dashboard/expenses", icon: ReceiptText },
    { label: "Inspections", href: "/dashboard/inspections", icon: CircleCheck },
    { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { label: "Reports", href: "/dashboard/reports", icon: ChartNoAxesColumn },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ] },
];

function isModuleRecord(value: unknown): value is ModuleRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value as Record<string, unknown>).every(([key, item]) => key === "id" || typeof item === "string")
    && typeof (value as Record<string, unknown>).id === "string"
    && typeof (value as Record<string, unknown>).status === "string";
}

function getModuleRecords(config: ModuleConfig) {
  const saved = localStorage.getItem(config.key);
  if (saved === null) {
    saveDashboardData(config.key, config.initial);
    return config.initial;
  }
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isModuleRecord)) {
    throw new Error(`Saved ${config.title.toLowerCase()} data is invalid.`);
  }
  return parsed;
}

function getInitialModuleRecords(config: ModuleConfig) {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(config.key);
    if (saved === null) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(isModuleRecord) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId(config: ModuleConfig, records: ModuleRecord[]) {
  const prefix = config.singular === "vehicle" ? "VH" : config.singular === "booking" ? "BK" : "CU";
  const max = records.reduce((result, record) => {
    const number = Number(record.id.replace(`${prefix}-`, ""));
    return Number.isFinite(number) ? Math.max(result, number) : result;
  }, prefix === "BK" ? 2048 : 1000);
  return `${prefix}-${max + 1}`;
}

export default function WorkspaceModule({ module }: { module: string }) {
  const config = configs[module];
  if (!config) return null;
  return <ModuleContent config={config} />;
}

function ModuleContent({ config }: { config: ModuleConfig }) {
  const pathname = usePathname();
  const [records, setRecords] = useState<ModuleRecord[]>(() => getInitialModuleRecords(config));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    function loadRecords() {
      try {
        setRecords(getModuleRecords(config));
        setError("");
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : `Could not load ${config.title.toLowerCase()}.`);
        }
      }
    }
    loadRecords();
    window.addEventListener("storage", loadRecords);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadRecords);
    return () => {
      isCurrent = false;
      window.removeEventListener("storage", loadRecords);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadRecords);
    };
  }, [config]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) =>
      (statusFilter === "All statuses" || record.status === statusFilter)
      && (!query || Object.values(record).join(" ").toLowerCase().includes(query)),
    );
  }, [records, search, statusFilter]);

  function persist(next: ModuleRecord[]) {
    try {
      saveDashboardData(config.key, next);
      setRecords(next);
      setError("");
      return true;
    } catch {
      setError(`Could not save ${config.title.toLowerCase()} in this browser.`);
      return false;
    }
  }

  function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const record = Object.fromEntries(config.fields.map((field) => [field.name, String(formData.get(field.name) ?? "").trim()]));
    const item: ModuleRecord = { id: makeId(config, records), ...record, status: config.statuses[0] };
    if (persist([item, ...records])) {
      setCreateOpen(false);
      form.reset();
    }
  }

  function updateStatus(id: string, status: string) {
    persist(records.map((record) => record.id === id ? { ...record, status } : record));
  }

  function deleteRecord(id: string) {
    if (window.confirm(`Delete ${id}? This cannot be undone.`)) {
      persist(records.filter((record) => record.id !== id));
    }
  }

  return (
    <div className="contract-page-shell">
      <Sidebar />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar"><div className="topbar-left"><Link href="/dashboard">Fleetora</Link><span className="topbar-separator">›</span><span className="current-page">{config.title}</span></div><div className="topbar-right"><label className="top-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} /></label><TopbarActions /></div></header>
        <div className="payments-body workspace-module-body">
          <div className="payments-title-row"><div className="page-heading"><h1>{config.title}</h1><p>{config.description}</p></div><button type="button" className="primary-action" onClick={() => setCreateOpen(true)}><Plus size={15} /><span>Add {config.singular}</span></button></div>
          {error ? <div className="storage-message" role="alert">{error}</div> : null}
          <div className="metrics-row payments-metrics">
            <article className="metric-card">
              <div className="metric-label">Total {config.title.toLowerCase()}</div>
              <div className="metric-value">{records.length}</div>
              <div className="metric-meta">Synced to your account</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Active</div>
              <div className="metric-value">{records.filter((record) => !["Inactive", "Cancelled", "Completed"].includes(record.status)).length}</div>
              <div className="metric-meta">Current records</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Storage</div>
              <div className="metric-value" style={{ fontSize: 16 }}>Supabase</div>
              <div className="metric-meta">Secure cloud sync</div>
            </article>
          </div>
          <section className="payments-list"><div className="table-tools payments-tools"><label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.singular}s...`} /></label><div className="tool-actions"><label className="report-filter-label">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{config.statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div></div>
            <div className="contract-table-wrap"><table className="contract-table report-record-table"><thead><tr><th>Reference</th>{config.fields.map((field) => <th key={field.name}>{field.label}</th>)}<th>Status</th>{config.key === "fleetora-customer-records" ? <th>Status indicator</th> : null}<th>Action</th></tr></thead><tbody>{visibleRecords.length ? visibleRecords.map((record) => <tr key={record.id}><td><strong>{record.id}</strong></td>{config.fields.map((field) => <td key={field.name}>{record[field.name] || "—"}</td>)}<td><select className="record-status-select" aria-label={`${record.id} status`} value={record.status} onChange={(event) => updateStatus(record.id, event.target.value)}>{config.statuses.map((status) => <option key={status}>{status}</option>)}</select></td>{config.key === "fleetora-customer-records" ? <td><span className={`customer-status-indicator ${record.status === "Active" ? "active" : "inactive"}`} role="img" aria-label={record.status === "Active" ? "Active customer" : "Inactive customer"} title={record.status === "Active" ? "Active" : "Inactive"}>{record.status === "Active" ? <CircleCheck size={18} /> : <CircleX size={18} />}</span></td> : null}<td><button className="notification-action" type="button" aria-label={`Delete ${record.id}`} title={`Delete ${record.id}`} onClick={() => deleteRecord(record.id)}><Trash2 size={14} /></button></td></tr>) : <tr><td className="empty-state" colSpan={config.fields.length + (config.key === "fleetora-customer-records" ? 4 : 3)}>No records found. Add one or adjust your search and filters.</td></tr>}</tbody></table></div>
          </section>
          {config.key === "fleetora-fleet-records" ? <p className="report-source-note">Live vehicle positions are not available until a GPS provider is connected.</p> : null}
        </div>
      </main>
      {createOpen ? <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><section className="create-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="create-module-title"><div className="dialog-heading"><div><h2 id="create-module-title">Add {config.singular}</h2><p>Enter details to add this record to the system.</p></div><button className="dialog-close" type="button" aria-label="Close dialog" onClick={() => setCreateOpen(false)}><X size={18} /></button></div><form className="payment-form" onSubmit={createRecord}>{config.fields.map((field) => <label key={field.name}>{field.label}<input name={field.name} type={field.type ?? "text"} required={field.required} /></label>)}<div className="dialog-actions"><button type="button" className="secondary-action" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="primary-action">Save {config.singular}</button></div></form></section></div> : null}
    </div>
  );
}
