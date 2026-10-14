CREATE TABLE public.user_passwords (username text PRIMARY KEY, password_hash text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.user_passwords TO service_role;
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;