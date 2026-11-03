"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CarFront,
  ChartNoAxesColumn,
  ChevronRight,
  CircleCheck,
  FileText,
  Grid2X2,
  LogOut,
  MapPin,
  ReceiptText,
  Users,
  UserCheck,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { getUserProfile, signOutUser, type UserProfile } from "../auth";
import { DASHBOARD_DATA_CHANGED_EVENT } from "./dashboard-storage";

interface SidebarProps {
  currentPath?: string;
}

export default function Sidebar({ currentPath }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ name: "Fleetora user", email: "" });

  useEffect(() => {
    void getUserProfile().then(setProfile).catch((error: unknown) => {
      console.error("Could not load the signed-in user profile.", error);
    });
    function updateBadge() {
      try {
        const saved = localStorage.getItem("fleetora-notification-records");
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        const count = Array.isArray(parsed)
          ? parsed.filter((item) => item !== null
            && typeof item === "object"
            && (item as Record<string, unknown>).status === "Unread").length
          : 0;
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    }
    updateBadge();
    window.addEventListener("storage", updateBadge);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, updateBadge);
    return () => {
      window.removeEventListener("storage", updateBadge);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, updateBadge);
    };
  }, []);

  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "MA";
  const activePath = currentPath || pathname;

  const workspaceLinks = [
    { label: "Overview", href: "/dashboard", icon: Grid2X2 },
    { label: "Fleet Management", href: "/dashboard/fleet", icon: CarFront },
    { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { label: "Live Tracking", href: "/dashboard/live-tracking", icon: MapPin },
    { label: "Customers", href: "/dashboard/customers", icon: Users },
    { label: "Contracts & Notary", href: "/dashboard/contracts", icon: FileText },
  ];

  const financeLinks = [
    { label: "Payments", href: "/dashboard/payments", icon: WalletCards },
    { label: "Expenses", href: "/dashboard/expenses", icon: ReceiptText },
    { label: "Inspections", href: "/dashboard/inspections", icon: CircleCheck },
    { label: "Maintenance", href: "/dashboard/maintenance", icon: Wrench },
    { label: "Reports", href: "/dashboard/reports", icon: ChartNoAxesColumn },
  ];

  const adminLinks = [
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : undefined },
    { label: "Users & Roles", href: "/dashboard/users", icon: UserCheck },
    { label: "System Users", href: "/admin/drivers", icon: CarFront },
  ];

  async function handleLogout() {
    try {
      await signOutUser();
      router.replace("/login");
    } catch (error) {
      console.error("Could not sign out.", error);
      window.alert(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out.");
    }
  }

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return activePath === "/dashboard";
    }
    return activePath?.startsWith(href);
  };

  return (
    <aside className="contract-sidebar">
      <Link href="/dashboard" className="brand-block payment-brand">
        <span className="brand-mark">F</span>
        <span className="brand-title">fleetora.</span>
      </Link>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        <div className="nav-section-title workspace-title">WORKSPACE</div>
        <div className="nav-list">
          {workspaceLinks.map(({ label, href, icon: Icon }) => {
            const active = isLinkActive(href);
            return (
              <Link
                key={label}
                href={href}
                className={`sidebar-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="link-icon">
                  <Icon size={16} />
                </span>
                <span className="link-label">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-section-title finance-title">FINANCE &amp; OPERATIONS</div>
        <div className="nav-list">
          {financeLinks.map(({ label, href, icon: Icon }) => {
            const active = isLinkActive(href);
            return (
              <Link
                key={label}
                href={href}
                className={`sidebar-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="link-icon">
                  <Icon size={16} />
                </span>
                <span className="link-label">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="nav-section-title admin-title">ADMINISTRATION</div>
        <div className="nav-list">
          {adminLinks.map(({ label, href, icon: Icon, badge }) => {
            const active = isLinkActive(href);
            return (
              <Link
                key={label}
                href={href}
                className={`sidebar-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="link-icon">
                  <Icon size={16} />
                </span>
                <span className="link-label">{label}</span>
                {badge ? <span className="nav-badge-pill">{badge}</span> : null}
              </Link>
            );
          })}
          <button
            type="button"
            className="sidebar-link sidebar-logout-btn"
            onClick={handleLogout}
          >
            <span className="link-icon">
              <LogOut size={16} />
            </span>
            <span className="link-label">Logout</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-strip-wrap">
          <button type="button" className="user-strip" aria-haspopup="dialog" aria-expanded={profileOpen} onClick={() => setProfileOpen(true)}>
            <div className="mini-avatar">{initials}</div>
            <div className="user-copy">
              <strong>{profile.name}</strong>
              <small>Administrator</small>
            </div>
            <ChevronRight className="user-strip-chevron" size={16} />
          </button>
        </div>
      </div>

      {profileOpen ? (
        <div className="profile-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProfileOpen(false);
        }}>
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
            <header className="profile-dialog-header">
              <div>
                <span className="profile-dialog-eyebrow">MY ACCOUNT</span>
                <h2 id="profile-dialog-title">Profile &amp; account</h2>
                <p>Manage your Fleetora session and personal settings.</p>
              </div>
              <button type="button" className="profile-dialog-close" aria-label="Close profile" onClick={() => setProfileOpen(false)}><X size={18} /></button>
            </header>

            <div className="profile-dialog-content">
              <div className="profile-account-card">
                <div className="profile-account-avatar">{initials}</div>
                <div className="profile-account-copy">
                  <strong>{profile.name}</strong>
                  <span>{profile.email}</span>
                  <small>Administrator</small>
                </div>
              </div>

              <Link className="profile-dialog-link" href="/dashboard/notifications" onClick={() => setProfileOpen(false)}>
                <Bell size={17} />
                <span><strong>Notification preferences</strong><small>Email, SMS and system alerts</small></span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <footer className="profile-dialog-footer">
              <button type="button" className="secondary-action" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button type="button" className="profile-signout-button" onClick={handleLogout}><LogOut size={14} />Sign out</button>
            </footer>
          </section>
        </div>
      ) : null}

    </aside>
  );
}
