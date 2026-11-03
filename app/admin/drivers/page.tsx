"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRoundPlus,
  X,
} from "lucide-react";
import Sidebar from "../../dashboard/Sidebar";
import TopbarActions from "../../dashboard/TopbarActions";

interface SystemUser {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface SystemUsersResponse {
  users: SystemUser[];
  page: number;
  perPage: number;
  nextPage: number | null;
}

async function getApiError(response: Response) {
  const result: unknown = await response.json().catch(() => null);
  if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
    return result.error;
  }
  return `Request failed (${response.status}).`;
}

export default function AdminDriversPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const loadUsers = useCallback(async (requestedPage: number) => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/admin/drivers?page=${requestedPage}&perPage=50`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await getApiError(response));

      const result = await response.json() as SystemUsersResponse;
      setUsers(result.users);
      setPage(result.page);
      setNextPage(result.nextPage);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load system users.");
      setUsers([]);
      setNextPage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(1);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      (user.full_name ?? "").toLowerCase().includes(query)
      || (user.email ?? "").toLowerCase().includes(query)
      || (user.phone ?? "").toLowerCase().includes(query)
      || user.role.toLowerCase().includes(query),
    );
  }, [users, search]);

  function openCreateForm() {
    setFormError("");
    setSuccessMessage("");
    setShowCreateForm(true);
  }

  function openEditForm(user: SystemUser) {
    setEditError("");
    setSuccessMessage("");
    setEditFullName(user.full_name ?? "");
    setEditPhone(user.phone ?? "");
    setEditingUser(user);
  }

  async function handleEditUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setEditError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editFullName,
          phone: editPhone,
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response));

      setEditingUser(null);
      setSuccessMessage("System user updated successfully.");
      await loadUsers(page);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not update system user.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          password,
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response));

      setShowCreateForm(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSuccessMessage("Driver account created successfully.");
              await loadUsers(page);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create driver.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/admin/drivers" />
      <main className="contract-main-panel users-page-panel">
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard" className="topbar-home-link">Fleetora</Link>
            <span className="topbar-separator">›</span>
            <span>Administration</span>
            <span className="topbar-separator">›</span>
            <span className="current-page">System Users</span>
          </div>
          <div className="topbar-right"><TopbarActions /></div>
        </header>

        <div className="users-page-body">
          <div className="payments-title-row">
            <div className="page-heading">
              <h1>System Users</h1>
              <p>Manage accounts that have access to the system</p>
            </div>
            <button type="button" className="primary-blue-btn" onClick={openCreateForm}>
              <Plus size={16} />
              <span>Add system user</span>
            </button>
          </div>

          {loadError ? (
            <div className="storage-message" role="alert" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{loadError}</span>
              <button type="button" className="secondary-action" onClick={() => void loadUsers(page)}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : null}
          {successMessage ? <p className="storage-success-message" role="status">{successMessage}</p> : null}

          <section className="overview-kpis" style={{ marginTop: 6 }}>
            <article className="metric-card">
              <div className="metric-label">System users on this page</div>
              <div className="metric-value">{loading ? "—" : users.length}</div>
              <div className="metric-meta">Supabase Auth accounts</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Account role</div>
              <div className="metric-value" style={{ fontSize: 17 }}>System User</div>
              <div className="metric-meta">Access assigned when created</div>
            </article>
          </section>

          <div className="table-tools payments-tools" style={{ marginTop: 20 }}>
            <label className="table-search">
              <Search size={14} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search system users by name, email, or phone..."
                aria-label="Search system users"
              />
            </label>
            <button
              type="button"
              className="secondary-action"
              onClick={() => void loadUsers(page)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "drivers-refresh-spinning" : ""} />
              Refresh
            </button>
          </div>

          <div className="contract-table-wrap" style={{ marginTop: 14 }}>
            <table className="contract-table report-record-table">
              <thead>
                <tr>
                  <th>System user</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Last sign in</th>
                  <th>Account created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="empty-state">Loading system users…</td></tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => {
                    const name = user.full_name?.trim() || "Unnamed user";
                    return (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="user-table-avatar">
                              {name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{name}</strong>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                                <Mail size={12} />{user.email ?? "No email"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}>
                            <Phone size={13} />{user.phone ?? "—"}
                          </span>
                        </td>
                        <td><span className="role-badge inspector">{user.role}</span></td>
                        <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never signed in"}</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <button type="button" className="action-icon-btn" aria-label={`Edit ${name}`} title={`Edit ${name}`} onClick={() => openEditForm(user)}>
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      {search ? "No system users match your search." : "No system users found on this page. Add a user to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="drivers-pagination">
            <span>Page {page}</span>
            <div>
              <button
                type="button"
                className="secondary-action"
                onClick={() => void loadUsers(page - 1)}
                disabled={loading || page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => void loadUsers(nextPage ?? page + 1)}
                disabled={loading || nextPage === null}
                aria-label="Next page"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {showCreateForm ? (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creating) setShowCreateForm(false);
        }}>
          <section className="create-dialog payment-dialog drivers-create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-driver-title">
            <div className="dialog-heading">
              <div>
                <h2 id="create-driver-title">Create system user account</h2>
                <p>This account will be assigned the Driver role and can sign in using the password you set.</p>
              </div>
              <button type="button" className="dialog-close" onClick={() => setShowCreateForm(false)} disabled={creating} aria-label="Close dialog">
                <X size={17} />
              </button>
            </div>
            <form className="payment-form" onSubmit={handleCreateDriver}>
              <label>
                Full name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} autoComplete="name" required />
              </label>
              <label>
                Email address
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required />
              </label>
              <label>
                Phone number <span>(optional)</span>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" />
              </label>
              <label>
                Temporary password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
              </label>
              {formError ? <p className="booking-error" role="alert">{formError}</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setShowCreateForm(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="primary-blue-btn" disabled={creating}>
                  <UserRoundPlus size={15} />{creating ? "Creating…" : "Create system user"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {editingUser ? (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingEdit) setEditingUser(null);
        }}>
          <section className="create-dialog payment-dialog drivers-create-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-system-user-title">
            <div className="dialog-heading">
              <div>
                <h2 id="edit-system-user-title">Edit system user</h2>
                <p>Update this account&apos;s profile details.</p>
              </div>
              <button type="button" className="dialog-close" onClick={() => setEditingUser(null)} disabled={savingEdit} aria-label="Close dialog">
                <X size={17} />
              </button>
            </div>
            <form className="payment-form" onSubmit={handleEditUser}>
              <label>
                Full name
                <input value={editFullName} onChange={(event) => setEditFullName(event.target.value)} maxLength={100} autoComplete="name" required />
              </label>
              <label>
                Email address
                <input type="email" value={editingUser.email ?? ""} readOnly />
              </label>
              <label>
                Phone number <span>(optional)</span>
                <input type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} maxLength={40} autoComplete="tel" />
              </label>
              {editError ? <p className="booking-error" role="alert">{editError}</p> : null}
              <div className="dialog-actions">
                <button type="button" className="secondary-action" onClick={() => setEditingUser(null)} disabled={savingEdit}>Cancel</button>
                <button type="submit" className="primary-blue-btn" disabled={savingEdit}>
                  <Pencil size={14} />{savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
