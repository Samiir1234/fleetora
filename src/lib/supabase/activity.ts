import { createClient } from "./client";

export async function getRecentActivities() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("activity_logs")
    .select(`
      id,
      actor_id,
      subject_user_id,
      action,
      category,
      description,
      entity_table,
      entity_id,
      changed_fields,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return data;
}

export async function getDailyActivity() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("report_daily_activity")
    .select("*")
    .order("activity_date", { ascending: false });

  if (error) throw error;

  return data;
}
