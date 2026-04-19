import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ucnwovxgzdslprwidnnk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbndvdnhnemRzbHByd2lkbm5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDY2MTYsImV4cCI6MjA5MDQ4MjYxNn0.Q08zPlJ8YjetdtXInLJemkC5A-igjy4QPURRYJOTN1E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ─── Row shape coming from Supabase `public.leads` ────────────
export interface LeadRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string | null;
  status: string | null;
  interest: string | null;
  budget: number | null;
  tenant_id: string | null;
}
