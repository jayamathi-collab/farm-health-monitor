import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RefreshNdviResponse =
  | { ok: true; observedOn: string; stored: boolean }
  | { ok: false; reason: string; message: string };

export const refreshNdvi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { farmId: string }) => d)
  .handler(async ({ data, context }): Promise<RefreshNdviResponse> => {
    const { supabase, userId } = context;
    const { data: farm } = await supabase
      .from("farms")
      .select("id, polygon")
      .eq("id", data.farmId)
      .maybeSingle();
    if (!farm) return { ok: false, reason: "not_found", message: "Farm not found or not accessible." };

    const { fetchNdvi } = await import("./sentinel.server");
    const result = await fetchNdvi(farm.polygon as never);
    if (!result.ok) return { ok: false, reason: result.reason, message: result.message };

    const { error } = await supabase.from("ndvi_observations").upsert(
      {
        farm_id: farm.id,
        user_id: userId,
        observed_on: result.observedOn,
        mean_ndvi: result.meanNdvi,
        min_ndvi: result.minNdvi,
        max_ndvi: result.maxNdvi,
        healthy_pct: result.healthyPct,
        stressed_pct: result.stressedPct,
        cloud_cover_pct: result.cloudCoverPct,
        source: result.source,
        grid: { imageDataUrl: result.imageDataUrl, bbox: result.bbox },
      },
      { onConflict: "farm_id,observed_on" },
    );
    if (error) return { ok: false, reason: "storage_error", message: error.message };
    return { ok: true, observedOn: result.observedOn, stored: true };
  });
