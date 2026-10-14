CREATE TABLE public.ca_daily (
  day date PRIMARY KEY,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ca_daily TO service_role;
ALTER TABLE public.ca_daily ENABLE ROW LEVEL SECURITY;