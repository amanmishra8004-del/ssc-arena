CREATE TABLE public.activity_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL, kind text NOT NULL, at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.user_presence (username text PRIMARY KEY, last_seen timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.activity_log TO service_role;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE INDEX activity_log_at_idx ON public.activity_log (at DESC);