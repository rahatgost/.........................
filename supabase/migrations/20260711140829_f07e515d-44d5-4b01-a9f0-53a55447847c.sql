
-- Server-side edge log shipping — 30-day retention.
-- Written from server functions / server routes via service_role. Admin-only reads.

CREATE TABLE IF NOT EXISTS public.server_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  route text,
  request_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb,
  at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.server_logs TO authenticated;
GRANT ALL ON public.server_logs TO service_role;

ALTER TABLE public.server_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view server logs"
  ON public.server_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS server_logs_at_idx    ON public.server_logs (at DESC);
CREATE INDEX IF NOT EXISTS server_logs_route_idx ON public.server_logs (route);
CREATE INDEX IF NOT EXISTS server_logs_level_idx ON public.server_logs (level);

CREATE OR REPLACE FUNCTION public.purge_old_server_logs(days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.server_logs WHERE at < now() - make_interval(days => days);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Enable pg_cron + schedule daily purge (03:15 UTC) and 30-day client_errors purge.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-server-logs-30d') THEN
    PERFORM cron.schedule(
      'purge-server-logs-30d',
      '15 3 * * *',
      $cron$SELECT public.purge_old_server_logs(30);$cron$
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-client-errors-30d') THEN
    PERFORM cron.schedule(
      'purge-client-errors-30d',
      '30 3 * * *',
      $cron$SELECT public.purge_old_client_errors(30);$cron$
    );
  END IF;
END $$;
