"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { saveDashboardData } from "../dashboard-storage";
import {
  Bell,
  Download,
  Eye,
  Pencil,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

type MaintenanceStatus = "In service" | "Scheduled" | "Pending" | "Complete" | "Overdue" | "Cancelled";
type MaintenanceRecord = {
  id: string;
  vehicle: string;
  service: string;
  provider: string;
  dueDate: string;
  estimatedCost: number;
  status: MaintenanceStatus;
  notes: string;
};

const STORAGE_KEY = "fleetora-maintenance-records";
const statuses: MaintenanceStatus[] = ["In service", "Scheduled", "Pending", "Complete", "Overdue", "Cancelled"];
const services = ["Brake service", "Oil & filters", "Insurance renewal", "Tire replacement", "Engine repair", "Inspection", "Other"];
const initialRecords: MaintenanceRecord[] = [
  { id: "SO-6341", vehicle: "Toyota Hilux", service: "Brake service", provider: "AutoCare", dueDate: new Date().toISOString().slice(0, 10), estimatedCost: 440, status: "In service", notes: "" },
  { id: "SO-1189", vehicle: "Nissan Patrol", service: "Oil & filters", provider: "FleetFix", dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), estimatedCost: 180, status: "Scheduled", notes: "" },
  { id: "SO-2904", vehicle: "Hyundai Tucson", service: "Insurance renewal", provider: "Internal", dueDate: new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 10), estimatedCost: 620, status: "Pending", notes: "" },
];

function isMaintenanceRecord(value: unknown): value is MaintenanceRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.vehicle === "string"
    && typeof record.service === "string"
    && typeof record.provider === "string"
    && typeof record.dueDate === "string"
    && typeof record.estimatedCost === "number"
    && statuses.includes(record.status as MaintenanceStatus)
    && typeof record.notes === "string";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatDue(value: string) {
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return value;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const difference = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(due);
}

export default function MaintenancePage() {
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [serviceFilter, setServiceFilter] = useState("All services");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isMaintenanceRecord)) {
          throw new Error("Saved maintenance data is invalid; existing browser data was left unchanged.");
        }
        setRecords(parsed);
      }
    } catch (error) {
      setStorageAvailable(false);
      setStorageError(error instanceof Error ? error.message : "Could not read maintenance data.");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded || !storageAvailable) return;
    try {
      saveDashboardData(STORAGE_KEY, records);
    } catch {
      setStorageError("Could not save maintenance changes in this browser.");
    }
  }, [records, storageAvailable, storageLoaded]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) =>
      (!query || [
        record.id,
        record.vehicle,
        record.service,
        record.provider,
        record.dueDate,
        record.estimatedCost.toString(),
        record.status,
        record.notes,
      ].join(" ").toLowerCase().includes(query))
      && (statusFilter === "All statuses" || record.status === statusFilter)
      && (serviceFilter === "All services" || record.service === serviceFilter),
    );
  }, [records, search, serviceFilter, statusFilter]);

  const inService = records.filter((record) => record.status === "In service").length;
  const now = new Date();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const dueThisWeek = records.filter((record) => {
    const due = new Date(`${record.dueDate}T00:00:00`);
    return !Number.isNaN(due.getTime()) && due >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && due < weekEnd && record.status !== "Complete" && record.status !== "Cancelled";
  }).length;
  const monthlyCost = records
    .filter((record) => record.dueDate.startsWith(new Date().toISOString().slice(0, 7)) && record.status !== "Cancelled")
    .reduce((total, record) => total + record.estimatedCost, 0);

  function createMaintenance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cost = Number(formData.get("estimatedCost"));
    if (!Number.isFinite(cost) || cost < 0) {
      setStorageError("Enter a valid estimated service cost.");
      return;
    }
    const maintenanceData = {
      vehicle: String(formData.get("vehicle") ?? "").trim(),
      service: String(formData.get("service") ?? "Other"),
      provider: String(formData.get("provider") ?? "").trim(),
      dueDate: String(formData.get("dueDate") ?? ""),
      estimatedCost: cost,
      status: statuses.find((status) => status === formData.get("status")) ?? "Scheduled",
      notes: String(formData.get("notes") ?? "").trim(),
    } satisfies Omit<MaintenanceRecord, "id">;

    if (editingRecord) {
      setRecords((items) => items.map((item) => item.id === editingRecord.id
        ? { ...item, ...maintenanceData }
        : item));
      setEditingRecord(null);
      setStorageError("");
      setCreateOpen(false);
      event.currentTarget.reset();
      return;
    }

    const nextNumber = records.reduce((max, record) => {
      const value = Number(record.id.replace("SO-", ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 1000) + 1;
    const record: MaintenanceRecord = {
      id: `SO-${String(nextNumber).padStart(4, "0")}`,
      ...maintenanceData,
    };
    setRecords((items) => [record, ...items]);
    setStorageError("");
    setCreateOpen(false);
    event.currentTarget.reset();
  }

  function printMaintenance(record: MaintenanceRecord) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setStorageError("The print window was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] ?? character);
    const details = [
      ["Work order", record.id],
      ["Vehicle", record.vehicle],
      ["Service", record.service],
      ["Provider", record.provider],
      ["Due date", formatDue(record.dueDate)],
      ["Estimated cost", formatCurrency(record.estimatedCost)],
      ["Status", record.status],
      ["Notes", record.notes || "—"],
    ];
    const rows = details.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(record.id)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18283d}table{border-collapse:collapse;width:100%;max-width:760px}th,td{border:1px solid #dfe5ee;padding:10px;text-align:left}th{width:220px;background:#eef3f7}</style></head><body><h1>Maintenance Work Order</h1><table>${rows}</table></body></html>`);
    printWindow.document.close();
  }

  function exportToWord() {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] ?? character);
    const rows = filteredRecords.map((record) =>
      `<tr><td>${escapeHtml(record.vehicle)} · ${escapeHtml(record.id)}</td><td>${escapeHtml(record.service)}</td><td>${escapeHtml(record.provider)}</td><td>${escapeHtml(formatDue(record.dueDate))}</td><td>${escapeHtml(formatCurrency(record.estimatedCost))}</td><td>${escapeHtml(record.status)}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Maintenance</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Maintenance schedule</h1><table><thead><tr><th>Vehicle / order</th><th>Service</th><th>Provider</th><th>Due</th><th>Estimated cost</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetora-maintenance.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/maintenance" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left"><Link href="/dashboard">Fleetora</Link><span className="topbar-separator">›</span><span className="current-page">Maintenance</span></div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search maintenance"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>
            <TopbarActions />
          </div>
        </header>

        <div className="payments-body">
          <div className="payments-title-row">
            <div className="page-heading"><h1>Maintenance</h1><p>Schedule service and minimize fleet downtime</p></div>
            <button className="primary-action" type="button" onClick={() => { setEditingRecord(null); setCreateOpen(true); }}><Plus size={15} /><span>Schedule service</span></button>
          </div>
          {storageError ? <div className="storage-message" role="alert">{storageError}</div> : null}
          <div className="metrics-row payments-metrics">
            <div className="metric-card"><div className="metric-label">In service</div><div className="metric-value">{inService}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Due this week</div><div className="metric-value">{dueThisWeek}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Monthly cost</div><div className="metric-value">{formatCurrency(monthlyCost)}</div><div className="metric-meta">Updated just now</div></div>
          </div>

          <section className="payments-list" aria-label="Maintenance schedule">
            <div className="table-tools payments-tools">
              <label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search maintenance..." /></label>
              <div className="tool-actions">
                <button type="button" className="secondary-action" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} /><span>Filters</span></button>
                <button type="button" className="secondary-action" onClick={exportToWord}><Download size={14} /><span>Export Word</span></button>
              </div>
            </div>
            {filtersOpen ? (
              <div className="filter-panel payments-filter-panel">
                <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Service<select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option>All services</option>{services.map((service) => <option key={service}>{service}</option>)}</select></label>
                <button type="button" className="clear-filters" onClick={() => { setStatusFilter("All statuses"); setServiceFilter("All services"); }}>Clear filters</button>
              </div>
            ) : null}
            <div className="contract-table-wrap">
              <table className="contract-table payments-table maintenance-table">
                <thead><tr><th>Vehicle</th><th>Service</th><th>Provider</th><th>Due</th><th>Est. cost</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredRecords.length ? filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.vehicle} · {record.id}</strong></td><td>{record.service}</td><td>{record.provider}</td><td>{formatDue(record.dueDate)}</td><td>{formatCurrency(record.estimatedCost)}</td>
                      <td><span className={`status-badge ${record.status.toLowerCase().replaceAll(" ", "-")}`}>{record.status}</span></td>
                      <td>
                        <div className="users-action-buttons">
                          <button type="button" className="action-icon-btn" aria-label={`Print ${record.id}`} title="Print work order" onClick={() => printMaintenance(record)}><Printer size={14} /></button>
                          <button type="button" className="action-icon-btn" aria-label={`View ${record.id}`} title="View maintenance record" onClick={() => setViewingRecord(record)}><Eye size={14} /></button>
                          <button type="button" className="action-icon-btn" aria-label={`Edit ${record.id}`} title="Edit maintenance record" onClick={() => { setEditingRecord(record); setCreateOpen(true); }}><Pencil size={14} /></button>
                          <button type="button" className="action-icon-btn danger" aria-label={`Delete ${record.id}`} title={`Delete ${record.id}`} onClick={() => setRecords((items) => items.filter((item) => item.id !== record.id))}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={7} className="empty-state">No maintenance records match your search or filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {createOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
          <section className="create-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="create-maintenance-title">
            <div className="dialog-heading"><div><h2 id="create-maintenance-title">{editingRecord ? "Edit maintenance record" : "Schedule service"}</h2><p>{editingRecord ? "Update the vehicle work order." : "Add a vehicle maintenance work order."}</p></div><button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setCreateOpen(false)}><X size={18} /></button></div>
            <form className="payment-form" onSubmit={createMaintenance}>
              <label>Vehicle<input name="vehicle" required placeholder="e.g. Toyota Hilux" defaultValue={editingRecord?.vehicle ?? ""} /></label>
              <label>Service<select name="service" defaultValue={editingRecord?.service ?? ""} required><option value="" disabled>Select service</option>{services.map((service) => <option key={service}>{service}</option>)}</select></label>
              <label>Service provider<input name="provider" required placeholder="Garage, vendor or internal team" defaultValue={editingRecord?.provider ?? ""} /></label>
              <div className="form-select-row">
                <label>Due date<input name="dueDate" type="date" required defaultValue={editingRecord?.dueDate ?? new Date().toISOString().slice(0, 10)} /></label>
                <label>Estimated cost (USD)<input name="estimatedCost" type="number" min="0" step="0.01" required defaultValue={editingRecord?.estimatedCost ?? ""} /></label>
              </div>
              <label>Status<select name="status" defaultValue={editingRecord?.status ?? "Scheduled"}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Notes (optional)<input name="notes" placeholder="Service details" defaultValue={editingRecord?.notes ?? ""} /></label>
              {!storageAvailable ? <p className="booking-error">Browser storage is unavailable or invalid; this service record will not persist after leaving this page.</p> : null}
              <div className="dialog-actions"><button type="button" className="secondary-action" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="primary-action">{editingRecord ? <Pencil size={14} /> : <Plus size={14} />}{editingRecord ? "Save changes" : "Schedule service"}</button></div>
            </form>
          </section>
        </div>
      ) : null}

      {viewingRecord ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingRecord(null); }}>
          <section className="create-dialog payment-dialog team-member-details-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-details-title">
            <div className="dialog-heading"><div><h2 id="maintenance-details-title">Maintenance details</h2><p>{viewingRecord.id}</p></div><button type="button" className="dialog-close" aria-label="Close details" onClick={() => setViewingRecord(null)}><X size={18} /></button></div>
            <dl className="team-member-details-list">
              <div><dt>Vehicle</dt><dd>{viewingRecord.vehicle}</dd></div>
              <div><dt>Service</dt><dd>{viewingRecord.service}</dd></div>
              <div><dt>Provider</dt><dd>{viewingRecord.provider}</dd></div>
              <div><dt>Due date</dt><dd>{formatDue(viewingRecord.dueDate)}</dd></div>
              <div><dt>Estimated cost</dt><dd>{formatCurrency(viewingRecord.estimatedCost)}</dd></div>
              <div><dt>Status</dt><dd>{viewingRecord.status}</dd></div>
              <div><dt>Notes</dt><dd>{viewingRecord.notes || "—"}</dd></div>
            </dl>
            <div className="dialog-actions"><button type="button" className="secondary-action" onClick={() => setViewingRecord(null)}>Close</button><button type="button" className="primary-action" onClick={() => { setEditingRecord(viewingRecord); setViewingRecord(null); setCreateOpen(true); }}><Pencil size={14} />Edit</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
