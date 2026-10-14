CREATE TABLE public.user_data (
  username text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
INSERT INTO public.user_data (username) VALUES ('arun'),('ali'),('naveen'),('devansh');