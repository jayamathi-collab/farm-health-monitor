import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SoilMoistureInfo, SoilTypeInfo } from "./soil.server";

export type FarmSoil = {
  ok: boolean;
  error?: string;
  soilType: {
    value: string | null;
    sourceLabel: string; // "Mapped from location" | "Farmer entered"
    origin: "mapped" | "manual" | "none";
    ph: number | null;
    nitrogenGkg: number | null;
    organicCarbonGkg: number | null;
    clayPct: number | null;
    sandPct: number | null;
    siltPct: number | null;
    reason?: string;
  };
  soilMoisture: {
    pct: number | null;
    label: "dry" | "normal" | "wet" | null;
    sourceLabel: string; // "Satellite/API estimate" | "Farmer entered" | "Sensor measured"
    origin: "api" | "manual" | "sensor" | "none";
    depth: string | null;
    recordedAt: string | null;
    reason?: string;
  };
};

export const getFarmSoil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { farmId: string }) => z.object({ farmId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<FarmSoil> => {
    const { supabase, userId } = context;
    const { fetchSoilMoisture, fetchSoilType } = await import("./soil.server");

    const { data: farm } = await supabase
      .from("farms")
      .select("id, latitude, longitude, soil_type, soil_type_source, soil_ph, soil_nutrients")
      .eq("id", data.farmId)
      .maybeSingle();
    if (!farm)
      return {
        ok: false,
        error: "Farm not found or not accessible.",
        soilType: {
          value: null,
          sourceLabel: "—",
          origin: "none",
          ph: null,
          nitrogenGkg: null,
          organicCarbonGkg: null,
          clayPct: null,
          sandPct: null,
          siltPct: null,
        },
        soilMoisture: {
          pct: null,
          label: null,
          sourceLabel: "—",
          origin: "none",
          depth: null,
          recordedAt: null,
        },
      };

    // Manual entry always wins over the mapped estimate.
    const manualType = farm.soil_type_source === "manual" ? farm.soil_type : null;

    // Soil type is a static property of the location: fetch once, then reuse the stored value.
    const alreadyMapped = !manualType && !!farm.soil_type;

    let mapped: SoilTypeInfo | null = null;
    if (!manualType && !alreadyMapped) {
      mapped = await fetchSoilType(farm.latitude, farm.longitude);
      if (mapped.available && mapped.soilType && farm.soil_type !== mapped.soilType) {
        await supabase
          .from("farms")
          .update({
            soil_type: mapped.soilType,
            soil_type_source: "mapped",
            soil_ph: mapped.ph ?? null,
            soil_nutrients: {
              nitrogen_g_kg: mapped.nitrogenGkg ?? null,
              organic_carbon_g_kg: mapped.organicCarbonGkg ?? null,
              clay_pct: mapped.clayPct ?? null,
              sand_pct: mapped.sandPct ?? null,
              silt_pct: mapped.siltPct ?? null,
            },
          })
          .eq("id", farm.id);
      }
    }

    const nutrients = (farm.soil_nutrients ?? {}) as Record<string, number | null>;

    const soilType: FarmSoil["soilType"] = manualType
      ? {
          value: manualType,
          sourceLabel: "Farmer entered",
          origin: "manual",
          ph: farm.soil_ph ?? null,
          nitrogenGkg: null,
          organicCarbonGkg: null,
          clayPct: null,
          sandPct: null,
          siltPct: null,
        }
      : mapped?.available
        ? {
            value: mapped.soilType ?? null,
            sourceLabel: "Mapped from location (estimated, not a lab test)",
            origin: "mapped",
            ph: mapped.ph ?? null,
            nitrogenGkg: mapped.nitrogenGkg ?? null,
            organicCarbonGkg: mapped.organicCarbonGkg ?? null,
            clayPct: mapped.clayPct ?? null,
            sandPct: mapped.sandPct ?? null,
            siltPct: mapped.siltPct ?? null,
          }
        : farm.soil_type
          ? {
              value: farm.soil_type,
              sourceLabel: "Mapped from location (estimated, not a lab test)",
              origin: "mapped",
              ph: farm.soil_ph ?? null,
              nitrogenGkg: nutrients["nitrogen_g_kg"] ?? null,
              organicCarbonGkg: nutrients["organic_carbon_g_kg"] ?? null,
              clayPct: nutrients["clay_pct"] ?? null,
              sandPct: nutrients["sand_pct"] ?? null,
              siltPct: nutrients["silt_pct"] ?? null,
            }
          : {
              value: null,
              sourceLabel: "—",
              origin: "none",
              ph: null,
              nitrogenGkg: null,
              organicCarbonGkg: null,
              clayPct: null,
              sandPct: null,
              siltPct: null,
              reason: mapped?.reason ?? "Soil type data unavailable",
            };

    // Soil moisture: prefer a recent sensor/manual reading, else the model estimate.
    const { data: recent } = await supabase
      .from("soil_observations")
      .select("source, moisture_pct, moisture_label, depth_cm, recorded_at")
      .eq("farm_id", farm.id)
      .in("source", ["sensor", "manual"])
      .order("recorded_at", { ascending: false })
      .limit(1);

    const fresh =
      recent?.[0] && Date.now() - new Date(recent[0].recorded_at).getTime() < 24 * 3600 * 1000 ? recent[0] : null;

    let soilMoisture: FarmSoil["soilMoisture"];
    if (fresh) {
      soilMoisture = {
        pct: fresh.moisture_pct ?? null,
        label: (fresh.moisture_label as "dry" | "normal" | "wet" | null) ?? null,
        sourceLabel: fresh.source === "sensor" ? "Sensor measured" : "Farmer entered",
        origin: fresh.source === "sensor" ? "sensor" : "manual",
        depth: fresh.depth_cm ?? null,
        recordedAt: fresh.recorded_at,
      };
    } else {
      const m: SoilMoistureInfo = await fetchSoilMoisture(farm.latitude, farm.longitude);
      if (m.available) {
        await supabase.from("soil_observations").insert({
          farm_id: farm.id,
          user_id: userId,
          source: "api",
          moisture_pct: m.pct ?? null,
          moisture_label: m.label ?? null,
          depth_cm: m.depth ?? null,
          provider: m.source,
        });
        soilMoisture = {
          pct: m.pct ?? null,
          label: m.label ?? null,
          sourceLabel: "Satellite/API estimate",
          origin: "api",
          depth: m.depth ?? null,
          recordedAt: m.recordedAt ?? null,
        };
      } else {
        soilMoisture = {
          pct: null,
          label: null,
          sourceLabel: "—",
          origin: "none",
          depth: null,
          recordedAt: null,
          reason: m.reason ?? "Real-time soil moisture unavailable.",
        };
      }
    }

    return { ok: true, soilType, soilMoisture };
  });

export const setManualSoilType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ farmId: z.string().uuid(), soilType: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("farms")
      .update({ soil_type: data.soilType, soil_type_source: "manual" })
      .eq("id", data.farmId);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const recordSoilMoisture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        farmId: z.string().uuid(),
        label: z.enum(["dry", "normal", "wet"]),
        source: z.enum(["manual", "sensor"]).default("manual"),
        moisturePct: z.number().min(0).max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("soil_observations").insert({
      farm_id: data.farmId,
      user_id: context.userId,
      source: data.source,
      moisture_label: data.label,
      moisture_pct: data.moisturePct ?? null,
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });
