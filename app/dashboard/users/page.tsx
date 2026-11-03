"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Eye,
  FileText,
  Mail,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Sidebar from "../Sidebar";
import TopbarActions from "../TopbarActions";
import { saveDashboardData } from "../dashboard-storage";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  status: "Active" | "Invited" | "Suspended";
  twoFactor: boolean;
  lastActive: string;
}

interface RoleDefinition {
  id: string;
  name: string;
  responsibilities: string;
}

const ROLES_STORAGE_KEY = "fleetora-user-roles";
const BRANCHES_STORAGE_KEY = "fleetora-user-branches";

function readSavedList<T>(key: string, isItem: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch (error) {
    console.error(`Could not read saved settings "${key}".`, error);
    return [];
  }
}

function isRoleDefinition(value: unknown): value is RoleDefinition {
  if (!value || typeof value !== "object") return false;
  const role = value as Record<string, unknown>;
  return typeof role.id === "string"
    && typeof role.name === "string"
    && typeof role.responsibilities === "string";
}

function isBranch(value: unknown): value is string {
  return typeof value === "string";
}

const initialTeam: TeamMember[] = [
  {
    id: "usr-1",
    name: "Mohamed Ali",
    email: "admin@fleetora.demo",
    phone: "+252 61 555 1001",
    role: "Administrator",
    branch: "Mogadishu HQ",
    status: "Active",
    twoFactor: true,
    lastActive: "Online now",
  },
  {
    id: "usr-2",
    name: "Maryan Nur",
    email: "maryan.nur@fleetora.demo",
    phone: "+252 61 555 2002",
    role: "Operations Manager",
    branch: "Mogadishu HQ",
    status: "Active",
    twoFactor: true,
    lastActive: "15 mins ago",
  },
  {
    id: "usr-3",
    name: "Abdi Warsame",
    email: "abdi.w@fleetora.demo",
    phone: "+252 61 555 3003",
    role: "Booking Agent",
    branch: "Hodan Branch",
    status: "Active",
    twoFactor: false,
    lastActive: "1 hour ago",
  },
  {
    id: "usr-4",
    name: "Fatima Hassan",
    email: "fatima.h@fleetora.demo",
    phone: "+252 61 555 4004",
    role: "Booking Agent",
    branch: "East Branch",
    status: "Active",
    twoFactor: true,
    lastActive: "2 hours ago",
  },
  {
    id: "usr-5",
    name: "Hassan Mire",
    email: "hassan.m@fleetora.demo",
    phone: "+252 61 555 5005",
    role: "Fleet Inspector",
    branch: "Airport Terminal",
    status: "Active",
    twoFactor: false,
    lastActive: "Yesterday",
  },
  {
    id: "usr-6",
    name: "Khadija Aden",
    email: "khadija.a@fleetora.demo",
    phone: "+252 61 555 6006",
    role: "Fleet Inspector",
    branch: "Mogadishu HQ",
    status: "Invited",
    twoFactor: false,
    lastActive: "Pending invite",
  },
  {
    id: "usr-7",
    name: "Ahmed Gedi",
    email: "ahmed.g@fleetora.demo",
    phone: "+252 61 555 7007",
    role: "Operations Manager",
    branch: "Hodan Branch",
    status: "Active",
    twoFactor: true,
    lastActive: "3 days ago",
  },
  {
    id: "usr-8",
    name: "Sahra Farah",
    email: "sahra.f@fleetora.demo",
    phone: "+252 61 555 8008",
    role: "Administrator",
    branch: "Mogadishu HQ",
    status: "Suspended",
    twoFactor: true,
    lastActive: "Oct 12, 2026",
  },
];

export default function UsersAndRolesPage() {
  const [members, setMembers] = useState<TeamMember[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fleetora-team-members");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialTeam;
  });

  useEffect(() => {
    if (localStorage.getItem("fleetora-team-members") === null) {
      saveDashboardData("fleetora-team-members", initialTeam);
    }
  }, []);

  const [roles, setRoles] = useState<RoleDefinition[]>(() => readSavedList(ROLES_STORAGE_KEY, isRoleDefinition));
  const [branches, setBranches] = useState<string[]>(() => readSavedList(BRANCHES_STORAGE_KEY, isBranch));
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formStatus, setFormStatus] = useState<TeamMember["status"]>("Active");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleResponsibilities, setNewRoleResponsibilities] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [configurationError, setConfigurationError] = useState("");

  function saveMembers(next: TeamMember[]) {
    setMembers(next);
    if (typeof window !== "undefined") {
      saveDashboardData("fleetora-team-members", next);
    }
  }

  function saveRoles(next: RoleDefinition[]) {
    setRoles(next);
    saveDashboardData(ROLES_STORAGE_KEY, next);
  }

  function saveBranches(next: string[]) {
    setBranches(next);
    saveDashboardData(BRANCHES_STORAGE_KEY, next);
  }

  function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    const editingMember = members.find((member) => member.id === editingMemberId);
    const roleIsAvailable = roles.some((role) => role.name === formRole) || editingMember?.role === formRole;
    const branchIsAvailable = branches.includes(formBranch) || editingMember?.branch === formBranch;
    if (!roleIsAvailable || !branchIsAvailable) {
      setConfigurationError("Select a valid role and branch. Add them in Manage Roles & Branches first.");
      return;
    }

    if (editingMemberId) {
      saveMembers(members.map((member) => member.id === editingMemberId
        ? {
          ...member,
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole,
          branch: formBranch,
          status: formStatus,
        }
        : member));
    } else {
      const newMember: TeamMember = {
        id: `usr-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || "+252 61 000 0000",
        role: formRole,
        branch: formBranch,
        status: "Active",
        twoFactor: false,
        lastActive: "Just added",
      };
      saveMembers([newMember, ...members]);
    }

    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormBranch("");
    setFormStatus("Active");
    setEditingMemberId(null);
    setShowAddModal(false);
  }

  function handleAddRole(e: React.FormEvent) {
    e.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    if (roles.some((role) => role.id !== editingRoleId && role.name.toLowerCase() === name.toLowerCase())) {
      setConfigurationError("That role already exists.");
      return;
    }

    if (editingRoleId) {
      const currentRole = roles.find((role) => role.id === editingRoleId);
      if (!currentRole) {
        setConfigurationError("The role you are editing no longer exists.");
        return;
      }
      saveRoles(roles.map((role) => role.id === editingRoleId
        ? { ...role, name, responsibilities: newRoleResponsibilities.trim() }
        : role));
      if (currentRole.name !== name) {
        saveMembers(members.map((member) => member.role === currentRole.name ? { ...member, role: name } : member));
        if (formRole === currentRole.name) setFormRole(name);
      }
      setEditingRoleId(null);
      setNewRoleName("");
      setNewRoleResponsibilities("");
      setConfigurationError("");
      return;
    }

    const nextRole = {
      id: `role-${Date.now()}`,
      name,
      responsibilities: newRoleResponsibilities.trim(),
    };
    saveRoles([...roles, nextRole]);
    setFormRole((current) => current || nextRole.name);
    setNewRoleName("");
    setNewRoleResponsibilities("");
    setConfigurationError("");
  }

  function startEditingRole(role: RoleDefinition) {
    setEditingRoleId(role.id);
    setNewRoleName(role.name);
    setNewRoleResponsibilities(role.responsibilities);
    setConfigurationError("");
  }

  function cancelRoleEdit() {
    setEditingRoleId(null);
    setNewRoleName("");
    setNewRoleResponsibilities("");
    setConfigurationError("");
  }

  function handleDeleteRole(role: RoleDefinition) {
    if (!confirm(`Delete the "${role.name}" role? Team members assigned to it will become unassigned.`)) return;
    saveRoles(roles.filter((item) => item.id !== role.id));
    saveMembers(members.map((member) => member.role === role.name ? { ...member, role: "Unassigned" } : member));
    if (formRole === role.name) setFormRole("");
    if (editingRoleId === role.id) cancelRoleEdit();
  }

  function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    const name = newBranchName.trim();
    if (!name) return;
    if (branches.some((branch) => branch.toLowerCase() === name.toLowerCase())) {
      setConfigurationError("That branch already exists.");
      return;
    }

    saveBranches([...branches, name]);
    setFormBranch((current) => current || name);
    setNewBranchName("");
    setConfigurationError("");
  }

  function handleDeleteBranch(branch: string) {
    if (!confirm(`Delete the "${branch}" branch? Team members assigned to it will become unassigned.`)) return;
    saveBranches(branches.filter((item) => item !== branch));
    saveMembers(members.map((member) => member.branch === branch ? { ...member, branch: "Unassigned" } : member));
    if (formBranch === branch) setFormBranch("");
  }

  function openAddMember() {
    setConfigurationError("");
    setEditingMemberId(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole(roles[0]?.name ?? "");
    setFormBranch(branches[0] ?? "");
    setFormStatus("Active");
    setShowAddModal(true);
  }

  function openEditMember(member: TeamMember) {
    setConfigurationError("");
    setEditingMemberId(member.id);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPhone(member.phone);
    setFormRole(member.role);
    setFormBranch(member.branch);
    setFormStatus(member.status);
    setShowAddModal(true);
  }

  function handleDeleteMember(id: string) {
    if (confirm("Remove this team member record?")) {
      saveMembers(members.filter((m) => m.id !== id));
    }
  }

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.branch.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    return roleFilter === "all" || m.role === roleFilter;
  });

  const assignedRoles = Array.from(new Set(members.map((member) => member.role).filter(Boolean)));
  const selectedRole = roles.find((role) => role.name === formRole);
  const getRoleBadgeClass = (_role: string) => "role-badge agent";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] ?? character);
  }

  function createMemberDocument(member: TeamMember) {
    const roleResponsibilities = roles.find((role) => role.name === member.role)?.responsibilities;
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(member.name)} - Team member</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;color:#162334;line-height:1.55}h1{border-bottom:2px solid #2d6df6;padding-bottom:12px}dt{font-weight:bold;margin-top:12px}dd{margin:2px 0 0}.note{color:#64748b;font-size:12px}</style></head><body><h1>Team member record</h1><dl><dt>Name</dt><dd>${escapeHtml(member.name)}</dd><dt>Email</dt><dd>${escapeHtml(member.email)}</dd><dt>Phone</dt><dd>${escapeHtml(member.phone || "—")}</dd><dt>Assigned role</dt><dd>${escapeHtml(member.role)}</dd><dt>Responsibilities</dt><dd>${escapeHtml(roleResponsibilities || "—")}</dd><dt>Branch / location</dt><dd>${escapeHtml(member.branch)}</dd><dt>Status</dt><dd>${escapeHtml(member.status)}</dd><dt>Last active</dt><dd>${escapeHtml(member.lastActive)}</dd></dl><p class="note">Team member record exported from Fleetora.</p></body></html>`;
  }

  function exportMemberToWord(member: TeamMember) {
    const file = new Blob([createMemberDocument(member)], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${member.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "team-member"}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printMember(member: TeamMember) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Allow pop-ups to print this team member record.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(createMemberDocument(member));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="contract-page-shell">
      <Sidebar currentPath="/dashboard/users" />

      <main className="contract-main-panel users-page-panel">
        {/* Topbar */}
        <header className="contract-topbar">
          <div className="topbar-left">
            <Link href="/dashboard" className="topbar-home-link">
              Fleetora
            </Link>
            <span className="topbar-separator">›</span>
            <span>Administration</span>
            <span className="topbar-separator">›</span>
            <span className="current-page">Users &amp; Roles</span>
          </div>

          <div className="topbar-center">
            <div className="top-search-global">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search anything..."
                aria-label="Search anything"
              />
              <span className="keyboard-shortcut">⌘ K</span>
            </div>
          </div>

          <div className="topbar-right">
            <TopbarActions />
          </div>
        </header>

        {/* Page Content */}
        <div className="users-page-body">
          {/* Header Row */}
          <div className="payments-title-row">
            <div className="page-heading">
              <h1>Users &amp; Roles</h1>
              <p>Manage team records, role descriptions, and branch assignments</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setConfigurationError("");
                  setShowManageModal(true);
                }}
              >
                <BriefcaseBusiness size={15} />
                <span>Manage Roles &amp; Branches</span>
              </button>
              <button
                type="button"
                className="primary-blue-btn"
                onClick={openAddMember}
              >
                <Plus size={16} />
                <span>Add Team Member</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <section className="overview-kpis" style={{ marginTop: 6 }}>
            <article className="metric-card">
              <div className="metric-label">Team Members</div>
              <div className="metric-value">{members.length}</div>
              <div className="metric-meta">Saved team records</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Defined Roles</div>
              <div className="metric-value">{roles.length}</div>
              <div className="metric-meta">Custom team responsibilities</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Branches</div>
              <div className="metric-value">{branches.length}</div>
              <div className="metric-meta">Available work locations</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">2FA Protected</div>
              <div className="metric-value">
                {members.filter((m) => m.twoFactor).length}
              </div>
              <div className="metric-meta">Two-factor enabled</div>
            </article>
          </section>

          {/* Table Tools & Filters */}
          <div className="table-tools payments-tools" style={{ marginTop: 20 }}>
            <label className="table-search">
              <Search size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members by name, email, or branch..."
              />
            </label>

            <div className="filter-pill-tabs">
              <button
                type="button"
                className={`pill-tab ${roleFilter === "all" ? "active" : ""}`}
                onClick={() => setRoleFilter("all")}
              >
                All ({members.length})
              </button>
              {assignedRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`pill-tab ${roleFilter === role ? "active" : ""}`}
                  onClick={() => setRoleFilter(role)}
                >
                  {role} ({members.filter((member) => member.role === role).length})
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="contract-table-wrap" style={{ marginTop: 14 }}>
            <table className="contract-table report-record-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Assigned Role</th>
                  <th>Branch / Location</th>
                  <th>Security (2FA)</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="user-table-avatar">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <strong style={{ display: "block", color: "#0f172a", fontSize: "13px" }}>
                              {member.name}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={getRoleBadgeClass(member.role)}>
                          {member.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12.5px", color: "#334155" }}>
                          {member.branch}
                        </span>
                      </td>
                      <td>
                        {member.twoFactor ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#16a34a", fontSize: "11.5px", fontWeight: 600 }}>
                            <ShieldCheck size={14} />
                            Enabled
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#94a3b8", fontSize: "11.5px" }}>
                            <ShieldAlert size={14} />
                            Disabled
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            member.status === "Active"
                              ? "paid"
                              : member.status === "Invited"
                              ? "pending"
                              : "cancelled"
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {member.lastActive}
                        </span>
                      </td>
                      <td>
                        <div className="users-action-buttons">
                          <button
                            type="button"
                            className="action-icon-btn users-word-action"
                            title="Download Word record"
                            aria-label={`Download Word record for ${member.name}`}
                            onClick={() => exportMemberToWord(member)}
                          >
                            <FileText size={13} />
                            <span>Word</span>
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Print team member record"
                            aria-label={`Print record for ${member.name}`}
                            onClick={() => printMember(member)}
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="View team member"
                            aria-label={`View ${member.name}`}
                            onClick={() => setViewingMember(member)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Edit team member"
                            aria-label={`Edit ${member.name}`}
                            onClick={() => openEditMember(member)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn danger"
                            title="Remove account"
                            aria-label={`Remove ${member.name}`}
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No team members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="dialog-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="create-dialog payment-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 540 }}
          >
            <div className="dialog-heading">
              <div>
                <h2>{editingMemberId ? "Edit Team Member" : "Add Team Member"}</h2>
                <p>{editingMemberId ? "Update this team member's information and status." : "Add a team record and assign its role and branch."}</p>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="payment-form">
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="e.g. Abdirahman Jama"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  placeholder="e.g. a.jama@fleetora.demo"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="+252 61 ..."
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </label>

              <label>
                Assigned Role
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a role</option>
                  {formRole && !roles.some((role) => role.name === formRole) ? (
                    <option value={formRole}>{formRole}</option>
                  ) : null}
                  {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                </select>
                {selectedRole?.responsibilities ? (
                  <small className="role-responsibilities-preview">{selectedRole.responsibilities}</small>
                ) : null}
                {!roles.length ? (
                  <small className="role-responsibilities-preview">Add a role in Manage Roles &amp; Branches first.</small>
                ) : null}
              </label>

              <label>
                Branch
                <select
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a branch</option>
                  {formBranch && !branches.includes(formBranch) ? (
                    <option value={formBranch}>{formBranch}</option>
                  ) : null}
                  {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                </select>
                {!branches.length ? (
                  <small className="role-responsibilities-preview">Add a branch in Manage Roles &amp; Branches first.</small>
                ) : null}
              </label>

              {editingMemberId ? (
                <label>
                  Status
                  <select value={formStatus} onChange={(event) => setFormStatus(event.target.value as TeamMember["status"])}>
                    <option value="Active">Active</option>
                    <option value="Invited">Invited</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </label>
              ) : null}

              {configurationError ? <p className="booking-error" role="alert">{configurationError}</p> : null}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action" disabled={!roles.length || !branches.length}>
                  {editingMemberId ? "Save Changes" : "Add Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingMember ? (
        <div className="dialog-backdrop" onClick={() => setViewingMember(null)}>
          <section
            className="create-dialog payment-dialog team-member-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-member-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <div>
                <h2 id="team-member-details-title">Team Member Details</h2>
                <p>Saved team record and assigned responsibilities.</p>
              </div>
              <button type="button" className="dialog-close" onClick={() => setViewingMember(null)} aria-label="Close details">
                ×
              </button>
            </div>
            <dl className="team-member-details-list">
              <div><dt>Name</dt><dd>{viewingMember.name}</dd></div>
              <div><dt>Email</dt><dd>{viewingMember.email}</dd></div>
              <div><dt>Phone</dt><dd>{viewingMember.phone || "—"}</dd></div>
              <div><dt>Assigned role</dt><dd>{viewingMember.role}</dd></div>
              <div><dt>Responsibilities</dt><dd>{roles.find((role) => role.name === viewingMember.role)?.responsibilities || "No responsibilities added."}</dd></div>
              <div><dt>Branch / location</dt><dd>{viewingMember.branch}</dd></div>
              <div><dt>Status</dt><dd>{viewingMember.status}</dd></div>
              <div><dt>Two-factor authentication</dt><dd>{viewingMember.twoFactor ? "Enabled" : "Disabled"}</dd></div>
              <div><dt>Last active</dt><dd>{viewingMember.lastActive}</dd></div>
            </dl>
            <div className="dialog-actions">
              <button type="button" className="secondary-action" onClick={() => setViewingMember(null)}>Close</button>
              <button type="button" className="primary-blue-btn" onClick={() => {
                const member = viewingMember;
                setViewingMember(null);
                openEditMember(member);
              }}>
                <Pencil size={14} />Edit
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showManageModal && (
        <div className="dialog-backdrop" onClick={() => setShowManageModal(false)}>
          <div className="manage-devices-dialog role-branch-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="manage-modal-header">
              <div className="manage-modal-header-left">
                <div className="manage-header-icon">
                  <BriefcaseBusiness size={22} />
                </div>
                <div>
                  <h2>Manage Roles &amp; Branches</h2>
                  <p>Define staff roles, responsibilities, and work locations.</p>
                </div>
              </div>
              <button
                type="button"
                className="manage-modal-close-btn"
                onClick={() => setShowManageModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="manage-modal-scroll">
              {configurationError ? <p className="booking-error" role="alert">{configurationError}</p> : null}
              <div className="role-branch-grid">
                <section className="role-branch-panel">
                  <div className="role-branch-title">
                    <div><h3>Roles &amp; responsibilities</h3><p>These are descriptions for your team records, not system permissions.</p></div>
                    <span>{roles.length}</span>
                  </div>
                  <form className="role-branch-add-form" onSubmit={handleAddRole}>
                    <label>
                      Role name
                      <input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} maxLength={60} placeholder="e.g. Branch Manager" required />
                    </label>
                    <label>
                      Responsibilities
                      <textarea value={newRoleResponsibilities} onChange={(event) => setNewRoleResponsibilities(event.target.value)} maxLength={300} rows={3} placeholder="Describe what this role is responsible for..." />
                    </label>
                    <div className="role-branch-form-actions">
                      {editingRoleId ? <button className="secondary-action" type="button" onClick={cancelRoleEdit}>Cancel edit</button> : null}
                      <button className="primary-blue-btn" type="submit">
                        {editingRoleId ? <Pencil size={14} /> : <Plus size={14} />}
                        {editingRoleId ? "Save role" : "Add role"}
                      </button>
                    </div>
                  </form>
                  <div className="role-branch-list">
                    {roles.length ? roles.map((role) => (
                      <article className="role-branch-item" key={role.id}>
                        <div><strong>{role.name}</strong><p>{role.responsibilities || "No responsibilities added."}</p></div>
                        <div className="role-branch-item-actions">
                          <button type="button" className="action-icon-btn" onClick={() => startEditingRole(role)} aria-label={`Edit ${role.name} role`}><Pencil size={14} /></button>
                          <button type="button" className="action-icon-btn danger" onClick={() => handleDeleteRole(role)} aria-label={`Delete ${role.name} role`}><Trash2 size={14} /></button>
                        </div>
                      </article>
                    )) : <p className="role-branch-empty">No roles yet. Add the roles your team needs.</p>}
                  </div>
                </section>

                <section className="role-branch-panel">
                  <div className="role-branch-title">
                    <div><h3>Branches / locations</h3><p>Add the work locations available for team members.</p></div>
                    <span>{branches.length}</span>
                  </div>
                  <form className="role-branch-add-form" onSubmit={handleAddBranch}>
                    <label>
                      Branch name
                      <input value={newBranchName} onChange={(event) => setNewBranchName(event.target.value)} maxLength={100} placeholder="e.g. Hargeisa Branch" required />
                    </label>
                    <button className="primary-blue-btn" type="submit"><Plus size={14} />Add branch</button>
                  </form>
                  <div className="role-branch-list">
                    {branches.length ? branches.map((branch) => (
                      <article className="role-branch-item" key={branch}>
                        <div className="role-branch-name"><MapPinned size={15} /><strong>{branch}</strong></div>
                        <button type="button" className="action-icon-btn danger" onClick={() => handleDeleteBranch(branch)} aria-label={`Delete ${branch} branch`}><Trash2 size={14} /></button>
                      </article>
                    )) : <p className="role-branch-empty">No branches yet. Add your work locations.</p>}
                  </div>
                </section>
              </div>
            </div>

            <div className="manage-modal-actions">
              <span style={{ fontSize: "12px", color: "#64748b" }}>Changes are saved to your dashboard data.</span>
              <button
                type="button"
                className="primary-blue-btn"
                onClick={() => setShowManageModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
