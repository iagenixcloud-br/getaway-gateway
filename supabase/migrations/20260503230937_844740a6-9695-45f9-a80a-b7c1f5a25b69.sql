
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL DEFAULT 'leadgen',
  page_id text,
  leadgen_id text,
  form_id text,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  payload jsonb,
  lead_id uuid
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs (created_at DESC);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs (status);
