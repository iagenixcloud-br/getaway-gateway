
-- Revoke anon execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;

-- Add RLS policy on integration_secrets (was missing)
CREATE POLICY "Authenticated users can view secrets"
  ON public.integration_secrets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upsert secrets"
  ON public.integration_secrets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update secrets"
  ON public.integration_secrets FOR UPDATE
  TO authenticated
  USING (true);
