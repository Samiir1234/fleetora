import { createClient } from "../src/lib/supabase/client";
import { clearDashboardCache, flushDashboardWrites } from "./dashboard/dashboard-storage";

export interface UserProfile {
  name: string;
  email: string;
}

let refreshRedirectedAt: number | null = null;
let dashboardLoginCompletedAt: number | null = null;
let pendingUserProfile: Promise<UserProfile> | null = null;

export function getDashboardEntryAction(): "continue" | "redirect" | "waiting" {
  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== "reload") return "continue";

  const documentStart = window.performance.timeOrigin;
  if (dashboardLoginCompletedAt === documentStart) return "continue";
  if (refreshRedirectedAt === documentStart) return "waiting";

  refreshRedirectedAt = documentStart;
  return "redirect";
}

export function markDashboardLoginComplete() {
  dashboardLoginCompletedAt = window.performance.timeOrigin;
}

export async function signInUser(email: string, password: string) {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function registerUser(name: string, email: string, password: string) {
  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return Boolean(data.session);
}

export async function signOutUser() {
  await flushDashboardWrites();
  const { error } = await createClient().auth.signOut();
  if (error) throw error;
  clearDashboardCache();
}

export function getUserProfile(): Promise<UserProfile> {
  if (!pendingUserProfile) {
    pendingUserProfile = Promise.resolve()
      .then(() => createClient().auth.getUser())
      .then(({ data, error }) => {
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error("Sign in to load your profile.");
        const fullName = user.user_metadata.full_name;
        return {
          name: typeof fullName === "string" && fullName.trim()
            ? fullName.trim()
            : user.email ?? "Fleetora user",
          email: user.email ?? "",
        };
      }).finally(() => {
        pendingUserProfile = null;
      });
  }
  return pendingUserProfile;
}
