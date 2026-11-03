"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings, LogOut } from "lucide-react";
import { getUserProfile, signOutUser, type UserProfile } from "../auth";
import {
  DASHBOARD_DATA_CHANGED_EVENT,
  DASHBOARD_STORAGE_ERROR_EVENT,
  saveDashboardData,
} from "./dashboard-storage";

export type InterfaceLanguage = "so" | "en";

interface TopbarActionsProps {
  language?: InterfaceLanguage;
  onLanguageChange?: (language: InterfaceLanguage) => void;
}

function getUnreadCount(): number | "!" {
  try {
    const saved = localStorage.getItem("fleetora-notification-records");
    if (!saved) return 0;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return "!";
    return parsed.filter((item) => item && typeof item === "object" && item.status === "Unread").length;
  } catch {
    return "!";
  }
}

export default function TopbarActions({ language, onLanguageChange }: TopbarActionsProps) {
  const router = useRouter();
  const [storedLanguage, setStoredLanguage] = useState<InterfaceLanguage>("en");
  const [unreadCount, setUnreadCount] = useState<number | "!">(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ name: "Fleetora user", email: "" });
  const activeLanguage = language ?? storedLanguage;

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("fleetora-language");
      if (savedLanguage === "so" || savedLanguage === "en") setStoredLanguage(savedLanguage);
    } catch (error) {
      console.error("Could not read the saved language preference.", error);
    }
    void getUserProfile().then(setProfile).catch((error: unknown) => {
      console.error("Could not load the signed-in user profile.", error);
    });

    function updateNotifications() {
      setUnreadCount(getUnreadCount());
    }
    updateNotifications();
    window.addEventListener("storage", updateNotifications);
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, updateNotifications);
    return () => {
      window.removeEventListener("storage", updateNotifications);
      window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, updateNotifications);
    };
  }, []);

  function changeLanguage(nextLanguage: InterfaceLanguage) {
    setStoredLanguage(nextLanguage);
    onLanguageChange?.(nextLanguage);
    try {
      saveDashboardData("fleetora-language", nextLanguage);
      window.dispatchEvent(new CustomEvent("fleetora-language-changed", { detail: nextLanguage }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent(DASHBOARD_STORAGE_ERROR_EVENT, {
        detail: { message: "Could not save your language preference." },
      }));
      console.error("Could not save the language preference.", error);
    }
  }

  async function handleLogout() {
    try {
      await signOutUser();
      router.replace("/login");
    } catch (error) {
      console.error("Could not sign out.", error);
      window.alert(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out.");
    }
  }

  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "MA";

  return (
    <div className="topbar-actions">
      <div className="language-toggle" role="group" aria-label="Interface language">
        <button type="button" onClick={() => changeLanguage("so")} aria-pressed={activeLanguage === "so"}>SO</button>
        <button type="button" onClick={() => changeLanguage("en")} aria-pressed={activeLanguage === "en"}>EN</button>
      </div>
      <Link
        href="/dashboard/settings"
        className="icon-button"
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={15} />
      </Link>
      <Link href="/dashboard/notifications" className="icon-button topbar-notifications-link" aria-label={unreadCount === "!" ? "Notifications (data error)" : `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} title="Notifications">
        <Bell size={15} />
        {unreadCount !== 0 ? <span className="topbar-unread-badge">{unreadCount === "!" ? "!" : unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </Link>
      <div className="topbar-profile">
        <button type="button" className="avatar-button" aria-label="User profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>{initials}</button>
        {profileOpen ? (
          <div className="topbar-profile-menu">
            <div className="topbar-profile-summary"><strong>{profile.name}</strong><span>{profile.email}</span></div>
            <button type="button" onClick={handleLogout}><LogOut size={14} />Sign out</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
