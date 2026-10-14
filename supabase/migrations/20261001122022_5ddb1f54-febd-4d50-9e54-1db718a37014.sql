CREATE TABLE public.app_users (
  username text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_users TO service_role;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_users(username) VALUES ('arun'),('ali'),('naveen'),('devansh');