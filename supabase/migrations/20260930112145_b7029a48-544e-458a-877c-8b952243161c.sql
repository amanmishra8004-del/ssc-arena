CREATE TABLE public.password_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  old_password text,
  new_password text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.password_log TO service_role;
ALTER TABLE public.password_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_data_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  data jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_data_history TO service_role;
ALTER TABLE public.user_data_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.user_data_history (username, saved_at DESC);

CREATE OR REPLACE FUNCTION public.backup_user_data()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.data IS DISTINCT FROM NEW.data AND OLD.data <> '{}'::jsonb THEN
    INSERT INTO public.user_data_history(username, data) VALUES (OLD.username, OLD.data);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER user_data_backup BEFORE UPDATE ON public.user_data
FOR EACH ROW EXECUTE FUNCTION public.backup_user_data();

INSERT INTO public.user_data_history(username, data)
SELECT username, data FROM public.user_data WHERE data <> '{}'::jsonb;