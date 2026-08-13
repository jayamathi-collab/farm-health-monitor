ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS soil_type text,
  ADD COLUMN IF NOT EXISTS soil_type_source text,
  ADD COLUMN IF NOT EXISTS soil_ph numeric,
  ADD COLUMN IF NOT EXISTS soil_nutrients jsonb;

CREATE TABLE IF NOT EXISTS public.soil_observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('api','manual','sensor')),
  moisture_pct numeric,
  moisture_label text check (moisture_label in ('dry','normal','wet')),
  depth_cm text,
  provider text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_observations TO authenticated;
GRANT ALL ON public.soil_observations TO service_role;
ALTER TABLE public.soil_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own soil observations" ON public.soil_observations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS soil_observations_farm_idx ON public.soil_observations(farm_id, recorded_at DESC);