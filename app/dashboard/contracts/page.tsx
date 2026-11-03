 "use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Bell,
  Download,
  FileText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Plus,
  Pencil,
  Eye,
  Trash2,
  X,
  Printer,
  UsersRound,
} from "lucide-react";
import NotaryBookingForm from "../NotaryBookingForm";
import { saveDashboardData, saveDashboardDataAndWait } from "../dashboard-storage";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";

type NotaryProfile = {
  id: string;
  name: string;
  licenseNumber: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  licenseExpiry: string;
};

type ContractRow = {
  contract: string;
  booking: string;
  customer: string;
  version: string;
  delivery: string;
  status: "Review" | "Approved" | "Pending";
  notaryId: string;
  createdBy: string;
};

type ContractForm = {
  contract: string;
  booking: string;
  customer: string;
  createdBy: string;
  version: string;
  delivery: string;
  status: ContractRow["status"];
  notaryId: string;
};

type SavedBooking = {
  id: string;
  details: Record<string, string>;
};

const CURRENT_USER = "Mohamed Ali";
const NOTARIES_STORAGE_KEY = "fleetora-notary-profiles";
const CONTRACTS_STORAGE_KEY = "fleetora-contracts";

const navGroups = [
  { label: "Overview", icon: "grid", href: "/dashboard" },
  { label: "Fleet Management", icon: "car", href: "/dashboard/fleet" },
  { label: "Bookings", icon: "calendar", href: "/dashboard/bookings" },
  { label: "Live Tracking", icon: "map", href: "/dashboard/live-tracking" },
  { label: "Customers", icon: "users", href: "/dashboard/customers" },
  { label: "Contracts & Notary", icon: "file", href: "/dashboard/contracts", active: true },
];

const financeLinks = [
  { label: "Payments", icon: "wallet" },
  { label: "Expenses", icon: "receipt" },
  { label: "Inspections", icon: "check" },
  { label: "Maintenance", icon: "wrench" },
  { label: "Reports", icon: "chart" },
];

const adminLinks = [
  { label: "Notifications", icon: "bell", badge: "14" },
  { label: "Users & Roles", icon: "users" },
  { label: "Settings", icon: "settings" },
];

const initialContractRows: ContractRow[] = [
  { contract: "CT-10285", booking: "-", customer: "Unassigned", version: "v1", delivery: "Not sent", status: "Review", notaryId: "", createdBy: CURRENT_USER },
  { contract: "CT-10284", booking: "BK-2048", customer: "Amina Warsame", version: "v2", delivery: "WhatsApp", status: "Approved", notaryId: "", createdBy: CURRENT_USER },
  { contract: "CT-10283", booking: "BK-2047", customer: "Omar Abdi", version: "v1", delivery: "Email", status: "Pending", notaryId: "", createdBy: CURRENT_USER },
  { contract: "CT-10282", booking: "BK-2046", customer: "Liam Carter", version: "v3", delivery: "Not sent", status: "Review", notaryId: "", createdBy: CURRENT_USER },
];

const contractStatuses: ContractRow["status"][] = ["Review", "Approved", "Pending"];
const deliveryMethods = ["Not sent", "Email", "WhatsApp"];

const emptyContractForm: ContractForm = {
  contract: "",
  booking: "",
  customer: "",
  createdBy: CURRENT_USER,
  version: "v1",
  delivery: "Not sent",
  status: "Review",
  notaryId: "",
};

function Dashboard() {
  const [search, setSearch] = useState("");
  const [contractRows, setContractRows] = useState(initialContractRows);
  const [notaryProfiles, setNotaryProfiles] = useState<NotaryProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [deliveryFilter, setDeliveryFilter] = useState("All delivery methods");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [contractEditorOpen, setContractEditorOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<{ contractReference: string; booking: SavedBooking } | null>(null);
  const [savedBookings, setSavedBookings] = useState<SavedBooking[]>([]);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContractForm);
  const [contractFormError, setContractFormError] = useState("");
  const [contractSaving, setContractSaving] = useState(false);
  const [notaryDirectoryOpen, setNotaryDirectoryOpen] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    try {
      const savedNotaries = localStorage.getItem(NOTARIES_STORAGE_KEY);
      if (savedNotaries) {
        const parsed: unknown = JSON.parse(savedNotaries);
        if (!Array.isArray(parsed) || !parsed.every(isNotaryProfile)) {
          throw new Error("Saved notary information is invalid.");
        }
        setNotaryProfiles(parsed);
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not read saved notary information.");
    }

    try {
      const savedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
      if (savedContracts) {
        const parsed: unknown = JSON.parse(savedContracts);
        if (!Array.isArray(parsed) || !parsed.every(isContractRow)) {
          throw new Error("Saved contract information is invalid.");
        }
        setContractRows(parsed);
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not read saved contracts.");
    } finally {
      setStorageLoaded(true);
    }

    try {
      const savedRequests = localStorage.getItem("fleetora-notary-booking-requests");
      if (savedRequests) {
        const parsed: unknown = JSON.parse(savedRequests);
        if (!Array.isArray(parsed)) throw new Error("Saved notary booking data is invalid.");
        setSavedBookings(parsed.flatMap((item) => {
          if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string") return [];
          const details = Object.fromEntries(
            Object.entries(item).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
          );
          return [{ id: item.id, details }];
        }));
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not read saved notary booking requests.");
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      saveDashboardData(NOTARIES_STORAGE_KEY, notaryProfiles);
    } catch {
      setStorageError("Could not save changes in this browser. Check the browser's storage settings.");
    }
  }, [notaryProfiles, storageLoaded]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contractRows.filter((row) =>
      (!query || [
        row.contract,
        row.booking,
        row.customer,
        row.version,
        row.delivery,
        row.status,
        row.createdBy,
        notaryProfiles.find((profile) => profile.id === row.notaryId)?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query))
      && (statusFilter === "All statuses" || row.status === statusFilter)
      && (deliveryFilter === "All delivery methods" || row.delivery === deliveryFilter),
    );
  }, [contractRows, deliveryFilter, notaryProfiles, search, statusFilter]);

  const statCards = [
    { label: "Active contracts", value: contractRows.length },
    { label: "Pending review", value: contractRows.filter((row) => row.status === "Review" || row.status === "Pending").length },
    { label: "Delivered", value: contractRows.filter((row) => row.delivery !== "Not sent").length },
  ];

  function openCreateContract() {
    setEditingBooking(null);
    setCreateOpen(true);
  }

  function openEditContract(row: ContractRow) {
    const savedBooking = savedBookings.find((booking) => booking.id === row.booking);
    if (savedBooking) {
      setEditingBooking({ contractReference: row.contract, booking: savedBooking });
      setCreateOpen(true);
      return;
    }

    setEditingBooking(null);
    setEditingContract(row.contract);
    setContractForm({
      contract: row.contract,
      booking: row.booking === "-" ? "" : row.booking,
      customer: row.customer === "Unassigned" ? "" : row.customer,
      createdBy: row.createdBy,
      version: row.version,
      delivery: row.delivery,
      status: row.status,
      notaryId: row.notaryId,
    });
    setContractFormError("");
    setContractEditorOpen(true);
  }

  async function saveContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contractReference = contractForm.contract.trim();
    if (!contractReference || !contractForm.customer.trim() || !contractForm.version.trim()) {
      setContractFormError("Enter a contract reference, customer name, and version.");
      return;
    }
    const duplicate = contractRows.some((row) =>
      row.contract.toLowerCase() === contractReference.toLowerCase()
      && row.contract !== editingContract,
    );
    if (duplicate) {
      setContractFormError("A contract with this reference already exists.");
      return;
    }

    const nextRow: ContractRow = {
      ...contractForm,
      contract: contractReference,
      booking: contractForm.booking.trim() || "-",
      customer: contractForm.customer.trim() || "Unassigned",
      createdBy: contractForm.createdBy.trim() || CURRENT_USER,
      version: contractForm.version.trim(),
    };
    const nextRows = editingContract
      ? contractRows.map((row) => row.contract === editingContract ? nextRow : row)
      : [nextRow, ...contractRows];

    setContractSaving(true);
    try {
      await saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows);
      setContractRows(nextRows);
      setContractEditorOpen(false);
      setEditingContract(null);
      setContractForm(emptyContractForm);
      setContractFormError("");
      setStorageError("");
    } catch (saveError) {
      setContractFormError(saveError instanceof Error ? saveError.message : "Could not save this contract.");
    } finally {
      setContractSaving(false);
    }
  }

  async function addContractFromBooking(booking: { reference: string; details: Record<string, string> }) {
    if (editingBooking) {
      const { contractReference } = editingBooking;
      const currentRow = contractRows.find((row) => row.contract === contractReference);
      if (!currentRow) throw new Error("The linked contract could not be found. Refresh the page and try again.");

      const profileId = currentRow.notaryId || `notary-${booking.reference}`;
      const profile: NotaryProfile = {
        id: profileId,
        name: booking.details.notaryName ?? "",
        licenseNumber: booking.details.notaryLicense ?? "",
        company: booking.details.notaryCompany ?? "",
        phone: booking.details.notaryWhatsApp ?? "",
        email: booking.details.notaryEmail ?? "",
        address: booking.details.notaryAddress ?? "",
        region: booking.details.clientCity ?? "",
        licenseExpiry: "",
      };
      const nextRows = contractRows.map((row) => row.contract === contractReference
        ? {
          ...row,
          booking: booking.reference,
          customer: booking.details.clientName ?? row.customer,
          createdBy: booking.details.createdBy?.trim() || row.createdBy,
          notaryId: profileId,
        }
        : row);
      const nextProfiles = notaryProfiles.some((item) => item.id === profileId)
        ? notaryProfiles.map((item) => item.id === profileId ? profile : item)
        : [...notaryProfiles, profile];

      await Promise.all([
        saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows),
        saveDashboardDataAndWait(NOTARIES_STORAGE_KEY, nextProfiles),
      ]);
      setContractRows(nextRows);
      setNotaryProfiles(nextProfiles);
      setSavedBookings((bookings) => bookings.map((item) => item.id === booking.reference
        ? { ...item, details: booking.details }
        : item));
      setEditingBooking(null);
      setStorageError("");
      return;
    }

    const contractReference = `CT-${Date.now()}`;
    const profileId = `notary-${booking.reference}`;
    const profile: NotaryProfile = {
      id: profileId,
      name: booking.details.notaryName ?? "",
      licenseNumber: booking.details.notaryLicense ?? "",
      company: booking.details.notaryCompany ?? "",
      phone: booking.details.notaryWhatsApp ?? "",
      email: booking.details.notaryEmail ?? "",
      address: booking.details.notaryAddress ?? "",
      region: "",
      licenseExpiry: "",
    };
    const contract: ContractRow = {
      contract: contractReference,
      booking: booking.reference,
      customer: booking.details.clientName ?? "Unassigned",
      version: "v1",
      delivery: "Not sent",
      status: "Pending",
      notaryId: profileId,
      createdBy: booking.details.createdBy?.trim() || CURRENT_USER,
    };
    const nextRows = [contract, ...contractRows];
    const nextProfiles = [...notaryProfiles, profile];

    await Promise.all([
      saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows),
      saveDashboardDataAndWait(NOTARIES_STORAGE_KEY, nextProfiles),
    ]);
    setContractRows(nextRows);
    setNotaryProfiles(nextProfiles);
    setSavedBookings((bookings) => [{ id: booking.reference, details: booking.details }, ...bookings]);
    setStorageError("");
  }

  async function deleteNotaryProfile(profileId: string) {
    const nextProfiles = notaryProfiles.filter((profile) => profile.id !== profileId);
    const nextRows = contractRows.map((row) =>
      row.notaryId === profileId ? { ...row, notaryId: "" } : row,
    );
    try {
      await saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows);
      await saveDashboardDataAndWait(NOTARIES_STORAGE_KEY, nextProfiles);
      setContractRows(nextRows);
      setNotaryProfiles(nextProfiles);
      setStorageError("");
    } catch (deleteError) {
      setStorageError(deleteError instanceof Error ? deleteError.message : "Could not delete this notary contact.");
    }
  }

  async function deleteContract(contractReference: string) {
    if (!window.confirm(`Delete contract ${contractReference}? This cannot be undone.`)) return;
    const nextRows = contractRows.filter((row) => row.contract !== contractReference);
    try {
      await saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows);
      setContractRows(nextRows);
      setStorageError("");
    } catch (deleteError) {
      setStorageError(deleteError instanceof Error ? deleteError.message : "Could not delete this contract.");
    }
  }

  async function updateContractNotary(contractReference: string, notaryId: string) {
    const nextRows = contractRows.map((row) =>
      row.contract === contractReference ? { ...row, notaryId } : row,
    );
    try {
      await saveDashboardDataAndWait(CONTRACTS_STORAGE_KEY, nextRows);
      setContractRows(nextRows);
      setStorageError("");
    } catch (saveError) {
      setStorageError(saveError instanceof Error ? saveError.message : "Could not update the contract.");
    }
  }

  function makeContractDocument(row: ContractRow) {
    const notary = notaryProfiles.find((profile) => profile.id === row.notaryId);
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character);
    const notaryDetails = notary
      ? `<h2>Notary contact</h2><p><strong>Name:</strong> ${escapeHtml(notary.name)}<br><strong>Registration/license:</strong> ${escapeHtml(notary.licenseNumber)}<br><strong>Company:</strong> ${escapeHtml(notary.company || "—")}<br><strong>Phone:</strong> ${escapeHtml(notary.phone || "—")}<br><strong>Email:</strong> ${escapeHtml(notary.email || "—")}<br><strong>Address:</strong> ${escapeHtml([notary.address, notary.region].filter(Boolean).join(", ") || "—")}</p>`
      : "<p>No notary has been assigned to this draft.</p>";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(row.contract)} draft</title><style>body{font-family:Arial,sans-serif;max-width:780px;margin:40px auto;color:#162334;line-height:1.55}h1{border-bottom:2px solid #2d6df6;padding-bottom:12px}h2{font-size:16px;margin-top:28px}.notice{padding:12px;background:#fff5da;border:1px solid #ead18a}.signature{display:flex;gap:80px;margin-top:70px}.signature div{width:45%;border-top:1px solid #555;padding-top:8px}@media print{body{margin:20mm}}</style></head><body><h1>Rental agreement draft</h1><p class="notice"><strong>Draft only:</strong> This document has not been submitted to or approved by a notary. It is not a notarized agreement and contains no notary signature or stamp.</p><h2>Contract details</h2><p><strong>Contract:</strong> ${escapeHtml(row.contract)}<br><strong>Booking:</strong> ${escapeHtml(row.booking)}<br><strong>Customer:</strong> ${escapeHtml(row.customer)}<br><strong>Version:</strong> ${escapeHtml(row.version)}<br><strong>Status:</strong> ${escapeHtml(row.status)}<br><strong>Created by:</strong> ${escapeHtml(row.createdBy)}</p>${notaryDetails}<div class="signature"><div>Customer signature / date</div><div>Notary signature / date (if applicable)</div></div></body></html>`;
  }

  function downloadContractWord(row: ContractRow) {
    const document = new Blob([makeContractDocument(row)], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(document);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${row.contract}-draft.doc`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printContract(row: ContractRow) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setStorageError("The print window was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    printWindow.document.open();
    printWindow.document.write(makeContractDocument(row));
    printWindow.document.close();
  }

  function exportToWord() {
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character);
    const tableRows = filteredRows.map((row) => {
      const notary = notaryProfiles.find((profile) => profile.id === row.notaryId);
      return `<tr><td>${escapeHtml(row.contract)}</td><td>${escapeHtml(row.booking)}</td><td>${escapeHtml(row.customer)}</td><td>${escapeHtml(row.version)}</td><td>${escapeHtml(row.delivery)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.createdBy)}</td><td>${escapeHtml(notary?.name ?? "Unassigned")}</td></tr>`;
    }
    ).join("");
    const documentContent = `<!doctype html><html><head><meta charset="utf-8"><title>Contracts &amp; Notary</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Contracts &amp; Notary</h1><p>Exported contract list. No documents have been sent to a notary.</p><table><thead><tr><th>Contract</th><th>Booking</th><th>Customer</th><th>Version</th><th>Delivery</th><th>Status</th><th>Created by</th><th>Notary</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const file = new Blob([documentContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contracts-and-notary.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/contracts" />

      <main className="contract-main-panel">
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard">Fleetora</Link>
            <span className="topbar-separator">›</span>
            <span className="current-page">Contracts &amp; Notary</span>
          </div>

          <div className="topbar-right">
            <label className="top-search" aria-label="Search anything">
              <Search size={14} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." />
              <kbd>⌘K</kbd>
            </label>

            <TopbarActions />
          </div>
        </header>

        <div className="page-body">
          <div className="page-header-row">
            <div className="page-heading">
              <h1>Contracts &amp; notary</h1>
              <p>Generate, review and deliver rental agreements</p>
            </div>

            <button className="primary-action" type="button" onClick={openCreateContract}>
              <Plus size={15} />
              <span>Create new notary contact</span>
            </button>
            <button className="secondary-action" type="button" onClick={() => setNotaryDirectoryOpen((open) => !open)}>
              <UsersRound size={15} />
              <span>Notary directory ({notaryProfiles.length})</span>
            </button>
          </div>

          {storageError ? <div className="storage-message" role="alert">{storageError}</div> : null}
          {notaryDirectoryOpen ? (
            <section className="directory-panel" aria-labelledby="notary-directory-title">
              <div className="directory-heading">
                <div>
                  <h2 id="notary-directory-title">Notary directory</h2>
                  <p>Saved in your Supabase workspace for later lookup. This does not send data to a notary system.</p>
                </div>
                <button className="dialog-close" type="button" aria-label="Close notary directory" onClick={() => setNotaryDirectoryOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="directory-content">
                <div className="notary-list">
                  <h3>Previously saved notary contacts</h3>
                  {notaryProfiles.length ? notaryProfiles.map((profile) => (
                    <details className="notary-card" key={profile.id}>
                      <summary>
                        <span><strong>{profile.name}</strong><small>{profile.licenseNumber}</small></span>
                        <span className="notary-card-actions">
                          <span>{profile.company || "Independent"}</span>
                          <button
                            type="button"
                            className="delete-action"
                            aria-label={`Delete ${profile.name}`}
                            onClick={(event) => {
                              event.preventDefault();
                              void deleteNotaryProfile(profile.id);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </summary>
                      <div className="notary-details">
                        <span><strong>Phone:</strong> {profile.phone || "—"}</span>
                        <span><strong>Email:</strong> {profile.email || "—"}</span>
                        <span><strong>Address:</strong> {profile.address || "—"}</span>
                        <span><strong>City / region:</strong> {profile.region || "—"}</span>
                        <span><strong>License expiry:</strong> {profile.licenseExpiry || "—"}</span>
                      </div>
                    </details>
                  )) : <p className="empty-directory">No saved contacts. Add the notary in the complete booking form.</p>}
                </div>
              </div>
            </section>
          ) : null}

          <div className="metrics-row">
            {statCards.map((card) => (
              <div key={card.label} className="metric-card">
                <div className="metric-label">{card.label}</div>
                <div className="metric-value">{card.value}</div>
                <div className="metric-meta">Updated just now</div>
              </div>
            ))}
          </div>

          <div className="info-banner">
            <span className="banner-icon"><ShieldCheck size={14} /></span>
            <span>Notary safeguards: Approvals are review status only. Fleetora never creates or imitates genuine notary signatures or stamps.</span>
          </div>

          <div className="table-tools">
            <div className="table-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contracts & notary..."
              />
            </div>

            <div className="tool-actions">
              <button
                type="button"
                className="secondary-action"
                aria-expanded={filtersOpen}
                aria-controls="contract-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
              </button>
              <button type="button" className="secondary-action" onClick={exportToWord}>
                <Download size={14} />
                <span>Export Word</span>
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="filter-panel" id="contract-filters">
              <label>
                Status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option>All statuses</option>
                  {contractStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Delivery
                <select value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value)}>
                  <option>All delivery methods</option>
                  {deliveryMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <button
                type="button"
                className="clear-filters"
                onClick={() => {
                  setStatusFilter("All statuses");
                  setDeliveryFilter("All delivery methods");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="contract-table-wrap">
            <table className="contract-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Version</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Notary</th>
                  <th>Created by</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((row) => {
                    const bookingDetails = savedBookings.find((booking) => booking.id === row.booking)?.details;
                    return (
                    <Fragment key={row.contract}>
                    <tr>
                      <td>{row.contract}</td>
                      <td>{row.booking}</td>
                      <td>{row.customer}</td>
                      <td>{row.version}</td>
                      <td>{row.delivery}</td>
                      <td>
                        <span className={`status-badge ${row.status.toLowerCase()}`}>{row.status}</span>
                      </td>
                      <td>
                        <select
                          className="table-notary-select"
                          aria-label={`Assign notary to ${row.contract}`}
                          value={row.notaryId}
                          onChange={(event) => void updateContractNotary(row.contract, event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {notaryProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>{profile.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>{row.createdBy}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="file-action" onClick={() => downloadContractWord(row)}>Word</button>
                          <button type="button" className="file-action" aria-label={`Print or save ${row.contract} as PDF`} title="Print or save as PDF" onClick={() => printContract(row)}>
                            <Printer size={14} />
                          </button>
                          {bookingDetails ? (
                            <button
                              type="button"
                              className="file-action"
                              aria-label={`${expandedBooking === row.contract ? "Hide" : "View"} details for ${row.contract}`}
                              title={expandedBooking === row.contract ? "Hide booking details" : "View booking details"}
                              aria-expanded={expandedBooking === row.contract}
                              onClick={() => setExpandedBooking((current) => current === row.contract ? null : row.contract)}
                            >
                              <Eye size={14} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="file-action"
                            aria-label={`Edit ${row.contract}`}
                            title="Edit contract"
                            onClick={() => openEditContract(row)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="delete-action"
                            aria-label={`Delete ${row.contract}`}
                            title={`Delete ${row.contract}`}
                            onClick={() => void deleteContract(row.contract)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedBooking === row.contract && bookingDetails ? (
                      <tr key={`${row.contract}-booking-details`} className="contract-details-row">
                        <td colSpan={9}>
                          <div className="contract-booking-details">
                            {Object.entries(bookingDetails)
                              .filter(([key]) => !["id", "status", "createdAt", "updatedAt"].includes(key))
                              .map(([key, value]) => (
                                <div key={key}>
                                  <strong>{key.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase())}</strong>
                                  <span>{value || "—"}</span>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-state">No contracts match your search or filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {contractEditorOpen ? (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setContractEditorOpen(false);
              setEditingContract(null);
            }
          }}
        >
          <section className="create-dialog contract-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="contract-editor-title">
            <div className="dialog-heading">
              <div>
                <h2 id="contract-editor-title">{editingContract ? "Edit contract" : "Create contract"}</h2>
                <p>Save the contract here; you can edit or remove it later.</p>
              </div>
              <button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => { setContractEditorOpen(false); setEditingContract(null); }}>
                <X size={18} />
              </button>
            </div>
            <form className="payment-form" onSubmit={(event) => void saveContract(event)}>
              <label>
                Contract reference
                <input required value={contractForm.contract} onChange={(event) => setContractForm({ ...contractForm, contract: event.target.value })} />
              </label>
              <label>
                Booking reference (optional)
                <input value={contractForm.booking} onChange={(event) => setContractForm({ ...contractForm, booking: event.target.value })} placeholder="e.g. BK-2048" />
              </label>
              <label>
                Customer name
                <input required value={contractForm.customer} onChange={(event) => setContractForm({ ...contractForm, customer: event.target.value })} />
              </label>
              <label>
                Created by
                <input required value={contractForm.createdBy} onChange={(event) => setContractForm({ ...contractForm, createdBy: event.target.value })} />
              </label>
              <label>
                Version
                <input required value={contractForm.version} onChange={(event) => setContractForm({ ...contractForm, version: event.target.value })} />
              </label>
              <label>
                Delivery
                <select value={contractForm.delivery} onChange={(event) => setContractForm({ ...contractForm, delivery: event.target.value })}>
                  {deliveryMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={contractForm.status} onChange={(event) => setContractForm({ ...contractForm, status: event.target.value as ContractRow["status"] })}>
                  {contractStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Notary
                <select value={contractForm.notaryId} onChange={(event) => setContractForm({ ...contractForm, notaryId: event.target.value })}>
                  <option value="">Unassigned</option>
                  {notaryProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </label>
              {contractFormError ? <p className="contract-form-error" role="alert">{contractFormError}</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => { setContractEditorOpen(false); setEditingContract(null); }}>Cancel</button>
                <button type="submit" className="primary-action" disabled={contractSaving}>{contractSaving ? "Saving…" : editingContract ? "Save changes" : "Save contract"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {createOpen ? (
        <NotaryBookingForm
          key={editingBooking?.booking.id ?? "new-booking"}
          reference={editingBooking?.booking.id}
          initialData={editingBooking?.booking.details ?? { createdBy: CURRENT_USER }}
          onClose={() => { setCreateOpen(false); setEditingBooking(null); }}
          onSaved={addContractFromBooking}
        />
      ) : null}
    </div>
  );
}

function renderIcon(iconName: string) {
  const commonProps = { size: 14, strokeWidth: 2 };

  switch (iconName) {
    case "grid":
      return <Sparkles {...commonProps} />;
    case "bell":
      return <Bell {...commonProps} />;
    case "settings":
      return <SlidersHorizontal {...commonProps} />;
    default:
      return <FileText {...commonProps} />;
  }
}

function isNotaryProfile(value: unknown): value is NotaryProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return ["id", "name", "licenseNumber", "company", "phone", "email", "address", "region", "licenseExpiry"]
    .every((key) => typeof profile[key] === "string");
}

function isContractRow(value: unknown): value is ContractRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["contract", "booking", "customer", "version", "delivery", "notaryId", "createdBy"]
    .every((key) => typeof row[key] === "string")
    && contractStatuses.includes(row.status as ContractRow["status"]);
}

export default Dashboard;