import { createClient } from "../../src/lib/supabase/client";

export const DASHBOARD_DATA_CHANGED_EVENT = "fleetora:dashboard-data-changed";
export const DASHBOARD_DATA_SYNCED_EVENT = "fleetora:dashboard-data-synced";
export const DASHBOARD_STORAGE_ERROR_EVENT = "fleetora:dashboard-storage-error";

type DashboardRecord = { key: string; data: unknown };
const pendingWrites = new Map<string, Promise<void>>();
const lastSyncedValues = new Map<string, string>();
let pendingUserId: Promise<string> | null = null;

function getCurrentUserId() {
  if (!pendingUserId) {
    pendingUserId = createClient().auth.getUser().then(({ data, error }) => {
      if (error) throw error;
      if (!data.user) throw new Error("Sign in before saving dashboard data.");
      return data.user.id;
    }).finally(() => {
      pendingUserId = null;
    });
  }
  return pendingUserId;
}

function getSupabaseErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const detail = error as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (detail.code === "PGRST205" || detail.code === "42P01") {
      return "The dashboard_records table is missing. Run supabase/migrations/20261031000000_create_dashboard_records.sql in the Supabase SQL Editor.";
    }
    if (detail.code === "42501") {
      return "Supabase denied access to dashboard_records. Confirm the migration's authenticated-user grants and row-level security policies are installed.";
    }
    if (typeof detail.message === "string" && detail.message.trim()) {
      const context = [detail.details, detail.hint]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ");
      return context ? `${detail.message} ${context}` : detail.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Supabase returned an unknown sync error. Check the browser console for details.";
}

function enqueueDashboardWrite(key: string, value: unknown) {
  const previousWrite = pendingWrites.get(key) ?? Promise.resolve();
  const write = previousWrite.catch(() => undefined).then(async () => {
    const supabase = createClient();
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("dashboard_records")
      .upsert(
        { user_id: userId, key, data: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" },
      );
    if (error) throw error;
    lastSyncedValues.set(key, JSON.stringify(value));
  });
  pendingWrites.set(key, write);
  return write.finally(() => {
    if (pendingWrites.get(key) === write) pendingWrites.delete(key);
  });
}

function reportStorageError(key: string, error: unknown) {
  const message = getSupabaseErrorMessage(error);
  console.error(`Could not sync "${key}" with Supabase.`, error);
  window.dispatchEvent(new CustomEvent(DASHBOARD_STORAGE_ERROR_EVENT, { detail: { message, key } }));
}

export function saveDashboardData(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(value);
  if (localStorage.getItem(key) === serialized && lastSyncedValues.get(key) === serialized) return;
  localStorage.setItem(key, serialized);
  window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_CHANGED_EVENT, { detail: { key } }));
  void enqueueDashboardWrite(key, value).then(() => {
    window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_SYNCED_EVENT, { detail: { key } }));
  }).catch((error: unknown) => reportStorageError(key, error));
}

export async function saveDashboardDataAndWait(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(value);
  if (localStorage.getItem(key) === serialized && lastSyncedValues.get(key) === serialized) return;
  localStorage.setItem(key, serialized);
  window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_CHANGED_EVENT, { detail: { key } }));
  try {
    await enqueueDashboardWrite(key, value);
    window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_SYNCED_EVENT, { detail: { key } }));
  } catch (error) {
    reportStorageError(key, error);
    throw error;
  }
}

export async function hydrateDashboardData(expectedUserId: string) {
  const supabase = createClient();
  const [userResult, recordsResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("dashboard_records")
      .select("key,data")
      .eq("user_id", expectedUserId),
  ]);
  const { data: { user }, error: userError } = userResult;
  if (userError) throw userError;
  if (!user || user.id !== expectedUserId) throw new Error("Sign in before loading dashboard data.");
  const { data, error } = recordsResult;
  if (error) throw error;

  const cloudRecords = new Map(
    ((data ?? []) as DashboardRecord[]).map((record) => [record.key, record.data]),
  );
  const legacyRecords = new Map<string, unknown>();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("fleetora-")) continue;
    if (key === "fleetora-demo-profile" || key === "fleetora-auth") continue;
    if (cloudRecords.has(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      legacyRecords.set(key, JSON.parse(raw));
    } catch (error) {
      console.error(`Could not migrate invalid local data for "${key}".`, error);
    }
  }

  for (const [key, value] of cloudRecords) {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    lastSyncedValues.set(key, serialized);
  }
  const recordsToMigrate = [...legacyRecords].filter(([key]) => !cloudRecords.has(key));
  if (recordsToMigrate.length) {
    const updatedAt = new Date().toISOString();
    const { error: migrationError } = await supabase
      .from("dashboard_records")
      .upsert(
        recordsToMigrate.map(([key, value]) => ({ user_id: user.id, key, data: value, updated_at: updatedAt })),
        { onConflict: "user_id,key" },
      );
    if (migrationError) throw migrationError;
  }
  for (const [key, value] of recordsToMigrate) {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    lastSyncedValues.set(key, serialized);
  }

  window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_CHANGED_EVENT));
}

export async function flushDashboardWrites() {
  await Promise.all(pendingWrites.values());
}

export async function resetDashboardData() {
  await flushDashboardWrites();
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sign in before resetting dashboard data.");

  const { error } = await supabase
    .from("dashboard_records")
    .delete()
    .eq("user_id", user.id);
  if (error) throw error;

  clearDashboardCache();
}

export function clearDashboardCache() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("fleetora-auth-remember");
  lastSyncedValues.clear();
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("fleetora-")) localStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent(DASHBOARD_DATA_CHANGED_EVENT));
}
