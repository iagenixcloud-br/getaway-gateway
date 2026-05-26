-- Fix integration_secrets SELECT: admins only
DROP POLICY IF EXISTS "Authenticated users can view secrets" ON public.integration_secrets;
CREATE POLICY "Admins can view secrets"
  ON public.integration_secrets FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles SELECT: own profile or admin
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix webhook_logs: remove anon access, restrict to admins
DROP POLICY IF EXISTS "Anyone can view webhook logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Authenticated users can view webhook logs" ON public.webhook_logs;
CREATE POLICY "Admins can view webhook logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict Realtime channel subscriptions: only admins can subscribe to webhook_logs topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can subscribe to webhook_logs realtime" ON realtime.messages;
CREATE POLICY "Admins can subscribe to webhook_logs realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'webhook_logs'
    AND has_role(auth.uid(), 'admin'::app_role)
  );