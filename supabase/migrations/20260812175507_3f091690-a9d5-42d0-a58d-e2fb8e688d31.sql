
DROP VIEW IF EXISTS public.risk_zones;

CREATE OR REPLACE FUNCTION public.get_risk_zones()
RETURNS TABLE (grid_lat double precision, grid_lng double precision, crop text, report_count int, last_report timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT grid_lat, grid_lng, crop, count(*)::int, max(created_at)
  FROM public.disease_reports
  WHERE created_at > now() - interval '30 days'
  GROUP BY grid_lat, grid_lng, crop
  HAVING count(*) >= 2
$$;

REVOKE ALL ON FUNCTION public.get_risk_zones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_risk_zones() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
