"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getDashboardEntryAction } from "../auth";
import { createClient } from "../../src/lib/supabase/client";
import Localization from "./Localization";
import { initializeDashboardDemoData } from "./demo-data";
import {
  DASHBOARD_STORAGE_ERROR_EVENT,
  DASHBOARD_DATA_SYNCED_EVENT,
  hydrateDashboardData,
  clearDashboardCache,
} from "./dashboard-storage";

function getStorageErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const detail = error as { code?: unknown; message?: unknown };
    if (detail.code === "PGRST205" || (
      typeof detail.message === "string"
      && detail.message.includes("Could not find the table 'public.dashboard_records'")
    )) {
      return "The dashboard_records table is missing from Supabase. Run supabase/migrations/20261031000000_create_dashboard_records.sql in your Supabase SQL Editor, then reload this page.";
    }
    if (typeof detail.message === "string" && detail.message.trim()) return detail.message;
  }
  return error instanceof Error ? error.message : "Could not load dashboard data from Supabase.";
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    let activeUserId: string | null = null;
    let mounted = true;
    const entryAction = getDashboardEntryAction();
    if (entryAction !== "continue") {
      if (entryAction === "redirect") router.replace("/login");
      return () => {
        mounted = false;
      };
    }

    async function handleSession(session: Session | null) {
      if (!mounted) return;
      if (!session) {
        if (activeUserId) clearDashboardCache();
        activeUserId = null;
        setAuthorized(false);
        router.replace("/login");
        return;
      }

      if (activeUserId === session.user.id) return;
      if (activeUserId) clearDashboardCache();
      activeUserId = session.user.id;
      setAuthorized(null);
      setStorageError("");
      try {
        await hydrateDashboardData(session.user.id);
        initializeDashboardDemoData();
      } catch (error) {
        setStorageError(getStorageErrorMessage(error));
      }
      if (mounted) setAuthorized(true);
    }

    let client;
    try {
      client = createClient();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Supabase is not configured.");
      setAuthorized(false);
      router.replace("/login");
      return () => {
        mounted = false;
      };
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void handleSession(session), 0);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return handleSession(data.session);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setStorageError(error instanceof Error ? error.message : "Could not check your Supabase session.");
      setAuthorized(false);
      router.replace("/login");
    });

    function showStorageError(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setStorageError(detail?.message ?? "Could not sync dashboard data with Supabase.");
    }
    function clearStorageError() {
      setStorageError("");
    }
    window.addEventListener(DASHBOARD_STORAGE_ERROR_EVENT, showStorageError);
    window.addEventListener(DASHBOARD_DATA_SYNCED_EVENT, clearStorageError);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(DASHBOARD_STORAGE_ERROR_EVENT, showStorageError);
      window.removeEventListener(DASHBOARD_DATA_SYNCED_EVENT, clearStorageError);
    };
  }, [router]);

  if (authorized === null || authorized === false) {
    return (
      <main className="auth-check" aria-live="polite">
        <div className="auth-check-inner">
          <span className="auth-spinner" />
          <span>Returning to sign in…</span>
        </div>
      </main>
    );
  }

  return (
    <>
      {storageError ? (
        <div role="alert" className="storage-message" style={{ margin: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>Supabase sync error: {storageError}</span>
          <button type="button" className="secondary-action" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      ) : null}
      <Localization />
      {children}
    </>
  );
}
