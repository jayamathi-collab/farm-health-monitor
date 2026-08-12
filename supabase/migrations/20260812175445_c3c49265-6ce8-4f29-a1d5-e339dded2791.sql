
CREATE TYPE public.app_role AS ENUM ('farmer','expert','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  mobile text,
  language text NOT NULL DEFAULT 'en',
  district text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'farmer',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, mobile, language, district)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',''),
    NEW.raw_user_meta_data ->> 'mobile',
    COALESCE(NEW.raw_user_meta_data ->> 'language','en'),
    NEW.raw_user_meta_data ->> 'district'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'farmer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  crop text NOT NULL,
  crop_variety text,
  sowing_date date,
  district text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  polygon jsonb NOT NULL,
  area_hectares double precision NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT ALL ON public.farms TO service_role;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own farms" ON public.farms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ndvi_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observed_on date NOT NULL,
  mean_ndvi double precision,
  min_ndvi double precision,
  max_ndvi double precision,
  healthy_pct double precision,
  stressed_pct double precision,
  cloud_cover_pct double precision,
  source text NOT NULL DEFAULT 'sentinel-2',
  grid jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, observed_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ndvi_observations TO authenticated;
GRANT ALL ON public.ndvi_observations TO service_role;
ALTER TABLE public.ndvi_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ndvi" ON public.ndvi_observations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weather_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  temperature_c double precision,
  humidity_pct double precision,
  rainfall_mm double precision,
  wind_kph double precision,
  condition text,
  rain_probability_pct double precision,
  source text NOT NULL DEFAULT 'open-meteo'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weather_observations TO authenticated;
GRANT ALL ON public.weather_observations TO service_role;
ALTER TABLE public.weather_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weather" ON public.weather_observations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.disease_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop text NOT NULL,
  image_url text,
  category text,
  problem text,
  confidence double precision,
  severity text,
  symptoms text[],
  alternative_causes text[],
  recommendations text[],
  context_note text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disease_scans TO authenticated;
GRANT ALL ON public.disease_scans TO service_role;
ALTER TABLE public.disease_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans" ON public.disease_scans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reasons text[],
  sms_status text NOT NULL DEFAULT 'not_sent',
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.disease_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop text NOT NULL,
  problem text NOT NULL,
  category text,
  district text,
  grid_lat double precision NOT NULL,
  grid_lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disease_reports TO authenticated;
GRANT ALL ON public.disease_reports TO service_role;
ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own report" ON public.disease_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "experts read reports" ON public.disease_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'expert') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE VIEW public.risk_zones
WITH (security_invoker = false) AS
SELECT grid_lat, grid_lng, crop, count(*)::int AS report_count, max(created_at) AS last_report
FROM public.disease_reports
WHERE created_at > now() - interval '30 days'
GROUP BY grid_lat, grid_lng, crop
HAVING count(*) >= 2;
GRANT SELECT ON public.risk_zones TO authenticated;
GRANT SELECT ON public.risk_zones TO service_role;

CREATE INDEX ON public.farms (user_id);
CREATE INDEX ON public.ndvi_observations (farm_id, observed_on DESC);
CREATE INDEX ON public.alerts (farm_id, created_at DESC);
