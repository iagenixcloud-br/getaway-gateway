import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
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
  city: string | null;
  /** UUID do corretor responsável (profiles.id). Coluna no banco: `tenant_id`. */
  tenant_id: string | null;

  // Perfil do lead (opcionais)
  age: number | null;
  gender: string | null;
  occupation: string | null;
  monthly_income: number | null;
  down_payment: number | null;
  installment: number | null;
  purpose: string | null;
  area_sqm: string | null;
  region: string | null;
  /** Preenchido por trigger BEFORE UPDATE quando o status muda */
  previous_status: string | null;
}
