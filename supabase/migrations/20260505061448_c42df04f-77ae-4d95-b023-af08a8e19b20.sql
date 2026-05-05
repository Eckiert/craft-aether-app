
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sites" ON public.sites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sites" ON public.sites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sites" ON public.sites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sites" ON public.sites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER sites_set_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_sites_user ON public.sites(user_id);
CREATE INDEX idx_sites_customer ON public.sites(customer_id);

CREATE TABLE public.site_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Berlin')::date,
  weather text,
  temperature text,
  personnel text,
  work_performed text,
  incidents text,
  materials text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own diary entries" ON public.site_diary_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own diary entries" ON public.site_diary_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diary entries" ON public.site_diary_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diary entries" ON public.site_diary_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER diary_set_updated_at BEFORE UPDATE ON public.site_diary_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_diary_user ON public.site_diary_entries(user_id);
CREATE INDEX idx_diary_site_date ON public.site_diary_entries(site_id, entry_date DESC);
