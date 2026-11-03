"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { saveDashboardData } from "../dashboard-storage";
import {
  Bell,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

type ExpenseStatus = "Approved" | "Paid" | "Pending" | "Rejected";
type ExpenseRecord = {
  id: string;
  category: string;
  vendor: string;
  date: string;
  amount: number;
  status: ExpenseStatus;
  method: string;
  notes: string;
};

const STORAGE_KEY = "fleetora-expense-records";
const expenseStatuses: ExpenseStatus[] = ["Approved", "Paid", "Pending", "Rejected"];
const categories = ["Vehicle servicing", "Branch utilities", "GPS subscriptions", "Fuel", "Insurance", "Office supplies", "Other"];
const methods = ["Mobile money", "Bank transfer", "Cash", "Card", "Other"];
const initialExpenses: ExpenseRecord[] = [
  { id: "EX-00384", category: "Vehicle servicing", vendor: "AutoCare", date: new Date().toISOString().slice(0, 10), amount: 840, status: "Approved", method: "Cash", notes: "" },
  { id: "EX-00383", category: "Branch utilities", vendor: "Operations", date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), amount: 460, status: "Paid", method: "Bank transfer", notes: "" },
  { id: "EX-00382", category: "GPS subscriptions", vendor: "Technology", date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), amount: 1280, status: "Pending", method: "Mobile money", notes: "" },
];

function isExpenseRecord(value: unknown): value is ExpenseRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.category === "string"
    && typeof record.vendor === "string"
    && typeof record.date === "string"
    && typeof record.amount === "number"
    && expenseStatuses.includes(record.status as ExpenseStatus)
    && typeof record.method === "string"
    && typeof record.notes === "string";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(date);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [vendorFilter, setVendorFilter] = useState("All vendors");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isExpenseRecord)) {
          throw new Error("Saved expense data is invalid; existing browser data was left unchanged.");
        }
        setExpenses(parsed);
      }
    } catch (error) {
      setStorageAvailable(false);
      setStorageError(error instanceof Error ? error.message : "Could not read expense data.");
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded || !storageAvailable) return;
    try {
      saveDashboardData(STORAGE_KEY, expenses);
    } catch {
      setStorageError("Could not save expense changes in this browser.");
    }
  }, [expenses, storageAvailable, storageLoaded]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) =>
      (!query || [
        expense.id,
        expense.category,
        expense.vendor,
        expense.date,
        expense.amount.toString(),
        expense.status,
        expense.method,
        expense.notes,
      ].join(" ").toLowerCase().includes(query))
      && (categoryFilter === "All categories" || expense.category === categoryFilter)
      && (statusFilter === "All statuses" || expense.status === statusFilter)
      && (vendorFilter === "All vendors" || expense.vendor === vendorFilter),
    );
  }, [categoryFilter, expenses, search, statusFilter, vendorFilter]);

  const thisMonth = expenses
    .filter((expense) => expense.status !== "Rejected" && expense.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((total, expense) => total + expense.amount, 0);
  const pendingApproval = expenses
    .filter((expense) => expense.status === "Pending")
    .reduce((total, expense) => total + expense.amount, 0);
  const monthlyBudget = 42540;
  const budgetRemaining = Math.max(0, monthlyBudget - thisMonth);

  function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setStorageError("Enter an amount greater than zero.");
      return;
    }
    const nextNumber = expenses.reduce((max, expense) => {
      const number = Number(expense.id.replace("EX-", ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 381) + 1;
    const expense: ExpenseRecord = {
      id: `EX-${String(nextNumber).padStart(5, "0")}`,
      category: String(formData.get("category") ?? "Other"),
      vendor: String(formData.get("vendor") ?? "").trim(),
      date: String(formData.get("date") ?? ""),
      amount,
      status: expenseStatuses.find((status) => status === formData.get("status")) ?? "Pending",
      method: String(formData.get("method") ?? "Other"),
      notes: String(formData.get("notes") ?? "").trim(),
    };
    setExpenses((records) => [expense, ...records]);
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
    const rows = filteredExpenses.map((expense) =>
      `<tr><td>${escapeHtml(expense.id)}</td><td>${escapeHtml(expense.category)}</td><td>${escapeHtml(expense.vendor)}</td><td>${escapeHtml(formatDate(expense.date))}</td><td>${escapeHtml(formatCurrency(expense.amount))}</td><td>${escapeHtml(expense.status)}</td><td>${escapeHtml(expense.method)}</td></tr>`,
    ).join("");
    const content = `<!doctype html><html><head><meta charset="utf-8"><title>Expenses</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe5ee;padding:8px;text-align:left}th{background:#eef3f7}</style></head><body><h1>Expenses</h1><table><thead><tr><th>Expense</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const file = new Blob([content], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fleetora-expenses.doc";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/expenses" />

      <main className="contract-main-panel payments-page">
        <header className="contract-topbar">
          <div className="topbar-left"><Link href="/dashboard">Fleetora</Link><span className="topbar-separator">›</span><span className="current-page">Expenses</span></div>
          <div className="topbar-right">
            <label className="top-search" aria-label="Search expenses"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>
            <TopbarActions />
          </div>
        </header>

        <div className="payments-body">
          <div className="payments-title-row">
            <div className="page-heading"><h1>Expenses</h1><p>Track operating costs, vendors and approvals</p></div>
            <button className="primary-action" type="button" onClick={() => setCreateOpen(true)}><Plus size={15} /><span>Create new</span></button>
          </div>

          {storageError ? <div className="storage-message" role="alert">{storageError}</div> : null}
          <div className="metrics-row payments-metrics">
            <div className="metric-card"><div className="metric-label">This month</div><div className="metric-value">{formatCurrency(thisMonth)}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Pending approval</div><div className="metric-value">{formatCurrency(pendingApproval)}</div><div className="metric-meta">Updated just now</div></div>
            <div className="metric-card"><div className="metric-label">Budget remaining</div><div className="metric-value">{formatCurrency(budgetRemaining)}</div><div className="metric-meta">Updated just now</div></div>
          </div>

          <section className="payments-list" aria-label="Expense records">
            <div className="table-tools payments-tools">
              <label className="table-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses..." /></label>
              <div className="tool-actions">
                <button type="button" className="secondary-action" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={14} /><span>Filters</span></button>
                <button type="button" className="secondary-action" onClick={exportToWord}><Download size={14} /><span>Export Word</span></button>
              </div>
            </div>
            {filtersOpen ? (
              <div className="filter-panel payments-filter-panel">
                <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{expenseStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Vendor<select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}><option>All vendors</option>{Array.from(new Set(expenses.map((expense) => expense.vendor).filter(Boolean))).sort().map((vendor) => <option key={vendor}>{vendor}</option>)}</select></label>
                <button type="button" className="clear-filters" onClick={() => {
                  setCategoryFilter("All categories");
                  setStatusFilter("All statuses");
                  setVendorFilter("All vendors");
                }}>Clear filters</button>
              </div>
            ) : null}
            <div className="contract-table-wrap">
              <table className="contract-table payments-table expenses-table">
                <thead><tr><th>Expense</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredExpenses.length ? filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td><strong>{expense.id}</strong></td><td>{expense.category}</td><td>{expense.vendor}</td><td>{formatDate(expense.date)}</td><td className="expense-amount">{formatCurrency(expense.amount)}</td>
                      <td><span className={`status-badge ${expense.status.toLowerCase()}`}>{expense.status}</span></td>
                      <td><button type="button" className="delete-action" aria-label={`Delete ${expense.id}`} title={`Delete ${expense.id}`} onClick={() => setExpenses((items) => items.filter((item) => item.id !== expense.id))}><Trash2 size={15} /></button></td>
                    </tr>
                  )) : <tr><td colSpan={7} className="empty-state">No expenses match your search or filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {createOpen ? (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCreateOpen(false);
        }}>
          <section className="create-dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="create-expense-title">
            <div className="dialog-heading">
              <div><h2 id="create-expense-title">Create new expense</h2><p>Record an operating cost for review.</p></div>
              <button type="button" className="dialog-close" aria-label="Close dialog" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            </div>
            <form className="payment-form" onSubmit={createExpense}>
              <label>Category<select name="category" defaultValue="" required><option value="" disabled>Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Vendor<input name="vendor" required placeholder="Vendor or department" /></label>
              <div className="form-select-row">
                <label>Amount (USD)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
                <label>Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
              </div>
              <div className="form-select-row">
                <label>Payment method<select name="method" defaultValue="Cash">{methods.map((method) => <option key={method}>{method}</option>)}</select></label>
                <label>Status<select name="status" defaultValue="Pending">{expenseStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              </div>
              <label>Notes (optional)<input name="notes" placeholder="Additional details" /></label>
              {!storageAvailable ? <p className="booking-error">Browser storage is unavailable or invalid; this expense will not persist after leaving this page.</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="primary-action"><Plus size={14} />Create expense</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
