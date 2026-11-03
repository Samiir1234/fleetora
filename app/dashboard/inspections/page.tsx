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

type InspectionType = "Pickup" | "Return";
type InspectionStatus = "Pending" | "Overdue" | "Complete";
type InspectionRecord = {
  id: string;
  booking: string;
  vehicle: string;
  type: InspectionType;
  scheduledAt: string;
  status: InspectionStatus;
  mileage: string;
  fuelLevel: string;
  notes: string;
};

const STORAGE_KEY = "fleetora-inspection-records";
const inspectionStatuses: InspectionStatus[] = ["Pending", "Overdue", "Complete"];
const inspectionTypes: InspectionType[] = ["Pickup", "Return"];
const initialInspections: InspectionRecord[] = [
  { id: "IN-2031", booking: "BK-2048", vehicle: "Land Cruiser", type: "Pickup", scheduledAt: new Date().toISOString().slice(0, 10) + "T09:00", status: "Pending", mileage: "", fuelLevel: "", notes: "" },
  { id: "IN-2030", booking: "BK-2045", vehicle: "Toyota Hilux", type: "Return", scheduledAt: new Date().toISOString().slice(0, 10) + "T12:30", status: "Overdue", mileage: "", fuelLevel: "", notes: "" },
  { id: "IN-2029", booking: "BK-2042", vehicle: "Hyundai Tucson", type: "Return", scheduledAt: new Date(Date.now() - 86400000).toISOString().slice(0, 10) + "T12:00", status: "Complete", mileage: "", fuelLevel: "", notes: "" },
];

function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.booking === "string"
    && typeof record.vehicle === "string"
    && inspectionTypes.includes(record.type as InspectionType)
    && typeof record.scheduledAt === "string"
    && inspectionStatuses.includes(record.status as InspectionStatus)
    && typeof record.mileage === "string"
    && typeof record.fuelLevel === "string"
    && typeof record.notes === "string";
}

function formatScheduled(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86400000);
  const dayLabel = dayDifference === 0
    ? "Today"
    : dayDifference === -1
      ? "Yesterday"
      : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(date);
  const time = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${dayLabel}, ${time}`;
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState(initialInspections);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<InspectionRecord | null>(null);
  const [viewingInspection, setViewingInspection] = useState<InspectionRecord | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isInspectionRecord)) {
          throw new Error("Saved inspection data is invalid; existing browser data was left unchanged.");
        }
        setInspections(parsed);
      }
    } catch (error) {
      setStorageAvailable(false);
      setStorageError(error instanceof Error ? error.message : "Could not read inspection data.");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded || !storageAvailable) return;
    try {
      saveDashboardData(STORAGE_KEY, inspections);
    } catch {
      setStorageError("Could not save inspection changes in this browser.");
    }
  }, [inspections, storageAvailable, storageLoaded]);

  const filteredInspections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inspections.filter((inspection) =>
      (!query || [
        inspection.id,
        inspection.booking,
        inspection.vehicle,
        inspection.type,
        inspection.scheduledAt,
        inspection.status,
        inspection.mileage,
        inspection.fuelLevel,
        inspection.notes,
      ].join(" ").toLowerCase().includes(query))
      && (typeFilter === "All types" || inspection.type === typeFilter)
      && (statusFilter === "All statuses" || inspection.status === statusFilter),
    );
  }, [inspections, search, statusFilter, typeFilter]);

  const dueToday = inspections.filter((item) =>
    item.scheduledAt.startsWith(new Date().toISOString().slice(0, 10))
    && item.status !== "Complete",
  ).length;
  const completed = inspections.filter((item) => item.status === "Complete").length;
  const damageReports = inspections.filter((item) => item.notes.trim().length > 0).length;

  function createInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const inspectionData = {
      booking: String(formData.get("booking") ?? "").trim(),
      vehicle: String(formData.get("vehicle") ?? "").trim(),
      type: inspectionTypes.find((type) => type === formData.get("type")) ?? "Pickup",
      scheduledAt: String(formData.get("scheduledAt") ?? ""),
      status: inspectionStatuses.find((status) => status === formData.get("status")) ?? "Pending",
      mileage: String(formData.get("mileage") ?? "").trim(),
      fuelLevel: String(formData.get("fuelLevel") ?? ""),
      notes: String(formData.get("notes") ?? "").trim(),
    } satisfies Omit<InspectionRecord, "id">;

    if (editingInspection) {
      setInspections((items) => items.map((item) => item.id === editingInspection.id
        ? { ...item, ...inspectionData }
        : item));
      setEditingInspection(null);
      setStorageError("");
      setCreateOpen(false);
      event.currentTarget.reset();
      return;
    }

    const nextNumber = inspections.reduce((max, inspection) => {
      const number = Number(inspection.id.replace("IN-", ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 2028) + 1;
    const inspection: InspectionRecord = {
      id: `IN-${String(nextNumber).padStart(4, "0")}`,
      ...inspectionData,
    };
    setInspections((items) => [inspection, ...items]);
    setStorageError("");
    setCreateOpen(false);
    event.currentTarget.reset();
  }

  function printInspection(inspection: InspectionRecord) {
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
      ["Inspection", inspection.id],
      ["Booking", inspection.booking],
      ["Vehicle", inspection.vehicle],
      ["Type", inspection.type],
      ["Scheduled", formatScheduled(inspection.scheduledAt)],
      ["Status", inspection.status],
      ["Mileage", inspection.mileage || "—"],
      ["Fuel level", inspection.fuelLevel || "—"],
      ["Condition / damage notes", inspection.notes || "—"],
    ];
    const rows = details.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(inspection.id)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18283d}table{border-collapse:collapse;width:100%;max-width:760px}th,td{border:1px solid #dfe5ee;padding:10px;text-align:left}th{width:220px;background:#eef3f7}</style></head><body><h1>Pickup &amp; Return Inspection</h1><table>${rows}</table></body></html>`);
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
    const rows = filteredInspections.map((inspection) =>
      `<tr><td>${escapeHtml(inspection.id)}</td><td>${escapeHtml(inspection.booking)}</td><td>${escapeHtml(inspection.vehicle)}</td><td>${escapeHtml(inspection.type)}</td><td>${escapeHtml(formatScheduled(inspection.scheduledAt))}</td><td>${escapeHtml(inspection.status)}</td><td>${escapeHtml(inspection.mileage || "—")}</td><td>${escapeHtml(inspection.fuelLevel || "—")}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Pickup &amp; Return Inspections</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Pickup &amp; Return Inspections</h1><table><thead><tr><th>Inspection</th><th>Booking</th><th>Vehicle</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Mileage</th><th>Fuel level</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetora-inspections.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/inspections" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left"><Link href="/dashboard">Fleetora</Link><span className="topbar-separator">›</span><span className="current-page">Inspections</span></div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search inspections"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>
            <TopbarActions />
          </div>
        </header>

        <div className="payments-body">
          <div className="payments-title-row">
            <div className="page-heading"><h1>Pickup &amp; return</h1><p>Document condition, mileage, fuel and damages</p></div>
            <button className="primary-action" type="button" onClick={() => { setEditingInspection(null); setCreateOpen(true); }}><Plus size={15} /><span>Create new</span></button>
          </div>
          {storageError ? <div className="storage-message" role="alert">{storageError}</div> : null}
          <div className="metrics-row payments-metrics">
            <div className="metric-card"><div className="metric-label">Due today</div><div className="metric-value">{dueToday}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Completed</div><div className="metric-value">{completed}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Damage reports</div><div className="metric-value">{damageReports}</div><div className="metric-meta">Updated just now</div></div>
          </div>
          <section className="payments-list" aria-label="Pickup and return inspections">
            <div className="table-tools payments-tools">
              <label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pickup & return..." /></label>
              <div className="tool-actions">
                <button type="button" className="secondary-action" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} /><span>Filters</span></button>
                <button type="button" className="secondary-action" onClick={exportToWord}><Download size={14} /><span>Export Word</span></button>
              </div>
            </div>
            {filtersOpen ? (
              <div className="filter-panel payments-filter-panel">
                <label>Inspection type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All types</option>{inspectionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{inspectionStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <button type="button" className="clear-filters" onClick={() => { setTypeFilter("All types"); setStatusFilter("All statuses"); }}>Clear filters</button>
              </div>
            ) : null}
            <div className="contract-table-wrap">
              <table className="contract-table payments-table inspections-table">
                <thead><tr><th>Inspection</th><th>Booking</th><th>Vehicle</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredInspections.length ? filteredInspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td><strong>{inspection.id}</strong></td><td>{inspection.booking}</td><td>{inspection.vehicle}</td><td>{inspection.type}</td><td>{formatScheduled(inspection.scheduledAt)}</td>
                      <td><span className={`status-badge ${inspection.status.toLowerCase()}`}>{inspection.status}</span></td>
                      <td>
                        <div className="users-action-buttons">
                          <button type="button" className="action-icon-btn" aria-label={`Print ${inspection.id}`} title="Print inspection" onClick={() => printInspection(inspection)}><Printer size={14} /></button>
                          <button type="button" className="action-icon-btn" aria-label={`View ${inspection.id}`} title="View inspection" onClick={() => setViewingInspection(inspection)}><Eye size={14} /></button>
                          <button type="button" className="action-icon-btn" aria-label={`Edit ${inspection.id}`} title="Edit inspection" onClick={() => { setEditingInspection(inspection); setCreateOpen(true); }}><Pencil size={14} /></button>
                          <button type="button" className="action-icon-btn danger" aria-label={`Delete ${inspection.id}`} title={`Delete ${inspection.id}`} onClick={() => setInspections((items) => items.filter((item) => item.id !== inspection.id))}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={7} className="empty-state">No inspections match your search or filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {createOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
          <section className="create-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="create-inspection-title">
            <div className="dialog-heading"><div><h2 id="create-inspection-title">{editingInspection ? "Edit inspection" : "Create new inspection"}</h2><p>{editingInspection ? "Update the inspection record." : "Schedule a vehicle pickup or return inspection."}</p></div><button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setCreateOpen(false)}><X size={18} /></button></div>
            <form className="payment-form" onSubmit={createInspection}>
              <label>Booking reference<input name="booking" required placeholder="e.g. BK-2049" defaultValue={editingInspection?.booking ?? ""} /></label>
              <label>Vehicle<input name="vehicle" required placeholder="Vehicle make and model" defaultValue={editingInspection?.vehicle ?? ""} /></label>
              <div className="form-select-row">
                <label>Inspection type<select name="type" defaultValue={editingInspection?.type ?? "Pickup"}>{inspectionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Status<select name="status" defaultValue={editingInspection?.status ?? "Pending"}>{inspectionStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              </div>
              <label>Scheduled date and time<input name="scheduledAt" type="datetime-local" required defaultValue={editingInspection?.scheduledAt ?? `${new Date().toISOString().slice(0, 10)}T09:00`} /></label>
              <div className="form-select-row">
                <label>Mileage<input name="mileage" type="number" min="0" placeholder="Odometer reading" defaultValue={editingInspection?.mileage ?? ""} /></label>
                <label>Fuel level<select name="fuelLevel" defaultValue={editingInspection?.fuelLevel ?? ""}><option value="">Not recorded</option><option>Empty</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Full</option></select></label>
              </div>
              <label>Condition / damage notes<input name="notes" placeholder="Record existing or reported damage" defaultValue={editingInspection?.notes ?? ""} /></label>
              {!storageAvailable ? <p className="booking-error">Browser storage is unavailable or invalid; this inspection will not persist after leaving this page.</p> : null}
              <div className="dialog-actions"><button type="button" className="secondary-action" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="primary-action">{editingInspection ? <Pencil size={14} /> : <Plus size={14} />}{editingInspection ? "Save changes" : "Create inspection"}</button></div>
            </form>
          </section>
        </div>
      ) : null}

      {viewingInspection ? (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingInspection(null); }}>
          <section className="create-dialog payment-dialog team-member-details-dialog" role="dialog" aria-modal="true" aria-labelledby="inspection-details-title">
            <div className="dialog-heading"><div><h2 id="inspection-details-title">Inspection details</h2><p>{viewingInspection.id}</p></div><button type="button" className="dialog-close" aria-label="Close details" onClick={() => setViewingInspection(null)}><X size={18} /></button></div>
            <dl className="team-member-details-list">
              <div><dt>Booking</dt><dd>{viewingInspection.booking}</dd></div>
              <div><dt>Vehicle</dt><dd>{viewingInspection.vehicle}</dd></div>
              <div><dt>Type</dt><dd>{viewingInspection.type}</dd></div>
              <div><dt>Scheduled</dt><dd>{formatScheduled(viewingInspection.scheduledAt)}</dd></div>
              <div><dt>Status</dt><dd>{viewingInspection.status}</dd></div>
              <div><dt>Mileage</dt><dd>{viewingInspection.mileage || "—"}</dd></div>
              <div><dt>Fuel level</dt><dd>{viewingInspection.fuelLevel || "—"}</dd></div>
              <div><dt>Condition / damage notes</dt><dd>{viewingInspection.notes || "—"}</dd></div>
            </dl>
            <div className="dialog-actions"><button type="button" className="secondary-action" onClick={() => setViewingInspection(null)}>Close</button><button type="button" className="primary-action" onClick={() => { setEditingInspection(viewingInspection); setViewingInspection(null); setCreateOpen(true); }}><Pencil size={14} />Edit</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
