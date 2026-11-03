import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !supabaseKey) {
    throw new Error("Supabase is not configured. Set the Supabase URL and anon or publishable key in .env.local.");
  }

  return createBrowserClient(url, supabaseKey);
}
