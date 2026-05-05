
-- Fix remaining security definer warnings
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM authenticated;

-- Fix integration_secrets: only admins should insert/update
DROP POLICY "Authenticated users can upsert secrets" ON public.integration_secrets;
DROP POLICY "Authenticated users can update secrets" ON public.integration_secrets;

CREATE POLICY "Admins can insert secrets"
  ON public.integration_secrets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update secrets"
  ON public.integration_secrets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
