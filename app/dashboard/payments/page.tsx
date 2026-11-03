"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { saveDashboardData } from "../dashboard-storage";
import {
  ArrowLeft,
  Bell,
  Download,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

type TransactionType = "Payment" | "Expense";
type TransactionStatus = "Paid" | "Pending" | "Approved" | "Overdue" | "Rejected";
type PaymentRecord = {
  id: string;
  description: string;
  method: string;
  date: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  booking: string;
  renter?: string;
  vehicle?: string;
};

const STORAGE_KEY = "fleetora-payment-records";
const statuses: TransactionStatus[] = ["Paid", "Pending", "Approved", "Overdue", "Rejected"];
const methods = ["Mobile money", "Bank transfer", "Cash", "Card", "Other"];
const initialRecords: PaymentRecord[] = [
  { id: "TX-98420", description: "Booking BK-2048", method: "Mobile money", date: new Date().toISOString().slice(0, 10), amount: 870, type: "Payment", status: "Paid", booking: "BK-2048" },
  { id: "TX-98419", description: "Rental deposit", method: "Bank transfer", date: new Date().toISOString().slice(0, 10), amount: 500, type: "Payment", status: "Paid", booking: "" },
  { id: "EX-00384", description: "Vehicle servicing", method: "Cash", date: new Date().toISOString().slice(0, 10), amount: 840, type: "Expense", status: "Approved", booking: "" },
];

function isPaymentRecord(value: unknown): value is PaymentRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.description === "string"
    && typeof record.method === "string"
    && typeof record.date === "string"
    && typeof record.amount === "number"
    && (record.type === "Payment" || record.type === "Expense")
    && statuses.includes(record.status as TransactionStatus)
    && typeof record.booking === "string"
    && (record.renter === undefined || typeof record.renter === "string")
    && (record.vehicle === undefined || typeof record.vehicle === "string");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(parsed);
}

export default function PaymentsPage() {
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [methodFilter, setMethodFilter] = useState("All methods");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("Payment");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isPaymentRecord)) {
          throw new Error("Saved payment data is invalid; existing browser data was left unchanged.");
        }
        setRecords(parsed);
      }
    } catch (error) {
      setStorageAvailable(false);
      setStorageError(error instanceof Error ? error.message : "Could not read payment data.");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded || !storageAvailable) return;
    try {
      saveDashboardData(STORAGE_KEY, records);
    } catch {
      setStorageError("Could not save payment changes in this browser.");
    }
  }, [records, storageAvailable, storageLoaded]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) =>
      (!query || [
        record.id,
        record.description,
        record.method,
        record.date,
        record.amount.toString(),
        record.type,
        record.status,
        record.booking,
        record.renter ?? "",
        record.vehicle ?? "",
      ].join(" ").toLowerCase().includes(query))
      && (typeFilter === "All types" || record.type === typeFilter)
      && (statusFilter === "All statuses" || record.status === statusFilter)
      && (methodFilter === "All methods" || record.method === methodFilter),
    );
  }, [methodFilter, records, search, statusFilter, typeFilter]);

  const collected = records
    .filter((record) => record.type === "Payment" && record.status === "Paid" && record.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((total, record) => total + record.amount, 0);
  const outstanding = records
    .filter((record) => record.type === "Payment" && ["Pending", "Overdue"].includes(record.status))
    .reduce((total, record) => total + record.amount, 0);
  const expenses = records
    .filter((record) => record.type === "Expense" && record.status !== "Rejected" && record.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((total, record) => total + record.amount, 0);

  function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = formData.get("type") === "Expense" ? "Expense" : "Payment";
    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setStorageError("Enter an amount greater than zero.");
      return;
    }
    const prefix = type === "Payment" ? "TX" : "EX";
    const nextNumber = records.filter((record) => record.type === type).reduce((max, record) => {
      const value = Number(record.id.replace(`${prefix}-`, ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, type === "Payment" ? 98419 : 383) + 1;
    const record: PaymentRecord = {
      id: `${prefix}-${String(nextNumber).padStart(5, "0")}`,
      description: String(formData.get("description") ?? "").trim(),
      method: String(formData.get("method") ?? "Other"),
      date: String(formData.get("date") ?? ""),
      amount,
      type,
      status: (statuses.find((status) => status === formData.get("status")) ?? "Pending"),
      booking: String(formData.get("booking") ?? "").trim(),
      renter: String(formData.get("renter") ?? "").trim(),
      vehicle: String(formData.get("vehicle") ?? "").trim(),
    };
    setRecords((items) => [record, ...items]);
    setStorageError("");
    setCreateOpen(false);
    event.currentTarget.reset();
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
      `<tr><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.renter ?? "—")}</td><td>${escapeHtml(record.vehicle ?? "—")}</td><td>${escapeHtml(record.description)}</td><td>${escapeHtml(record.method)}</td><td>${escapeHtml(formatDate(record.date))}</td><td>${record.type === "Expense" ? "-" : ""}${escapeHtml(formatCurrency(record.amount))}</td><td>${escapeHtml(record.status)}</td><td>${escapeHtml(record.booking || "—")}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Payments &amp; Expenses</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Payments &amp; Expenses</h1><table><thead><tr><th>Transaction</th><th>Renter / payer</th><th>Vehicle</th><th>Description</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th><th>Booking</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payments-and-expenses.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/payments" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard">Fleetora</Link>
            <span className="topbar-separator">›</span>
            <span className="current-page">Payments &amp; Expenses</span>
          </div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search payments and expenses">
              <Search size={14} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </label>
            <TopbarActions />
          </div>
        </header>

      <div className="payments-body">
        <div className="payments-title-row">
          <div className="page-heading">
            <h1>Payments &amp; expenses</h1>
            <p>Track every transaction, balance and operating cost</p>
          </div>
          <button className="primary-action" type="button" onClick={() => {
            setTransactionType("Payment");
            setCreateOpen(true);
          }}>
            <Plus size={15} /><span>Create new</span>
          </button>
        </div>

        {storageError ? <div className="storage-message" role="alert">{storageError}</div> : null}
        <div className="metrics-row payments-metrics">
          <div className="metric-card"><div className="metric-label">Collected this month</div><div className="metric-value">{formatCurrency(collected)}</div><div className="metric-meta">Updated just now</div></div>
          <div className="metric-card"><div className="metric-label">Outstanding</div><div className="metric-value">{formatCurrency(outstanding)}</div><div className="metric-meta">Updated just now</div></div>
          <div className="metric-card"><div className="metric-label">Expenses</div><div className="metric-value">{formatCurrency(expenses)}</div><div className="metric-meta">Updated just now</div></div>
        </div>

        <section className="payments-list" aria-label="Payment and expense records">
          <div className="table-tools payments-tools">
            <label className="table-search">
              <Search size={14} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments & expenses..." />
            </label>
            <div className="tool-actions">
              <button type="button" className="secondary-action" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
                <SlidersHorizontal size={14} /><span>Filters</span>
              </button>
              <button type="button" className="secondary-action" onClick={exportToWord}>
                <Download size={14} /><span>Export Word</span>
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="filter-panel payments-filter-panel">
              <label>Transaction type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All types</option><option>Payment</option><option>Expense</option></select></label>
              <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Method<select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option>All methods</option>{methods.map((method) => <option key={method}>{method}</option>)}</select></label>
              <button type="button" className="clear-filters" onClick={() => {
                setTypeFilter("All types");
                setStatusFilter("All statuses");
                setMethodFilter("All methods");
              }}>Clear filters</button>
            </div>
          ) : null}

          <div className="contract-table-wrap">
            <table className="contract-table payments-table">
              <thead><tr><th>Transaction</th><th>Renter / payer</th><th>Vehicle</th><th>Description</th><th>Method</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredRecords.length ? filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.id}</strong></td>
                    <td>{record.renter || "—"}</td>
                    <td>{record.vehicle || "—"}</td>
                    <td>{record.description}</td>
                    <td>{record.method}</td>
                    <td>{formatDate(record.date)}</td>
                    <td className={record.type === "Expense" ? "expense-amount" : ""}>{record.type === "Expense" ? "−" : ""}{formatCurrency(record.amount)}</td>
                    <td><span className={`status-badge ${record.status.toLowerCase()}`}>{record.status}</span></td>
                    <td><button type="button" className="delete-action" aria-label={`Delete ${record.id}`} title={`Delete ${record.id}`} onClick={() => setRecords((items) => items.filter((item) => item.id !== record.id))}><Trash2 size={15} /></button></td>
                  </tr>
                )) : <tr><td colSpan={9} className="empty-state">No payments or expenses match your search or filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {createOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCreateOpen(false);
        }}>
          <section className="create-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="create-payment-title">
            <div className="dialog-heading">
              <div><h2 id="create-payment-title">Create new transaction</h2><p>Add a payment or operating expense.</p></div>
              <button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            </div>
            <form className="payment-form" onSubmit={createPayment}>
              <label>Transaction type<select name="type" value={transactionType} onChange={(event) => setTransactionType(event.target.value as TransactionType)}><option>Payment</option><option>Expense</option></select></label>
              {transactionType === "Payment" ? (
                <div className="form-select-row">
                  <label>Renter / payer name<input name="renter" required placeholder="e.g. Amina Warsame" /></label>
                  <label>Rented vehicle<input name="vehicle" required placeholder="e.g. Toyota Land Cruiser" /></label>
                </div>
              ) : null}
              <label>Description<input name="description" required placeholder="e.g. Booking payment" /></label>
              <div className="form-select-row">
                <label>Amount (USD)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                <label>Payment method<select name="method" defaultValue="Mobile money">{methods.map((method) => <option key={method}>{method}</option>)}</select></label>
              </div>
              <div className="form-select-row">
                <label>Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                <label>Status<select name="status" defaultValue="Pending">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              </div>
              <label>Booking reference (optional)<input name="booking" placeholder="e.g. BK-2049" /></label>
              {!storageAvailable ? <p className="booking-error">Browser storage is unavailable or invalid; this transaction will not persist after leaving this page.</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setCreateOpen(false)}><ArrowLeft size={14} />Cancel</button>
                <button type="submit" className="primary-action"><FileText size={14} />Create transaction</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      </main>
    </div>
  );
}
