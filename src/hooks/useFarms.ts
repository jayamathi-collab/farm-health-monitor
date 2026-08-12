import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFarms() {
  return useQuery({
    queryKey: ["farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePrimaryFarm() {
  const q = useFarms();
  return { ...q, farm: q.data?.[0] ?? null };
}

export function useNdviHistory(farmId: string | undefined) {
  return useQuery({
    enabled: !!farmId,
    queryKey: ["ndvi", farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ndvi_observations")
        .select("*")
        .eq("farm_id", farmId!)
        .order("observed_on", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAlerts(farmId: string | undefined) {
  return useQuery({
    enabled: !!farmId,
    queryKey: ["alerts", farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("farm_id", farmId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useScans(farmId: string | undefined) {
  return useQuery({
    enabled: !!farmId,
    queryKey: ["scans", farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disease_scans")
        .select("*")
        .eq("farm_id", farmId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
