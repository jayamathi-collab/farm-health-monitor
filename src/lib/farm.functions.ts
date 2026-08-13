import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { HealthVerdict } from "./alerts.server";

const farmInput = z.object({
  name: z.string().min(1).max(80),
  crop: z.string().min(1).max(60),
  cropVariety: z.string().max(60).optional().nullable(),
  sowingDate: z.string().max(20).optional().nullable(),
  district: z.string().max(60).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  polygon: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).length(1),
  }),
  areaHectares: z.number().min(0).max(100000),
});

export const createFarm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => farmInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: farm, error } = await supabase
      .from("farms")
      .insert({
        user_id: userId,
        name: data.name,
        crop: data.crop,
        crop_variety: data.cropVariety ?? null,
        sowing_date: data.sowingDate || null,
        district: data.district ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        polygon: data.polygon,
        area_hectares: data.areaHectares,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: farm.id };
  });

export type FarmHealth = HealthVerdict & { alertId: string | null };

export const evaluateFarmHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { farmId: string; createAlert?: boolean }) => d)
  .handler(async ({ data, context }): Promise<FarmHealth> => {
    const { supabase, userId } = context;
    const { assessFarmHealth, alertCopy } = await import("./alerts.server");

    const [{ data: ndvi }, { data: wx }, { data: scans }, { data: farm }, { data: soilObs }] = await Promise.all([
      supabase
        .from("ndvi_observations")
        .select("observed_on, mean_ndvi")
        .eq("farm_id", data.farmId)
        .order("observed_on", { ascending: false })
        .limit(6),
      supabase
        .from("weather_observations")
        .select("humidity_pct, temperature_c, rainfall_mm")
        .eq("farm_id", data.farmId)
        .order("recorded_at", { ascending: false })
        .limit(1),
      supabase
        .from("disease_scans")
        .select("category, confidence, problem")
        .eq("farm_id", data.farmId)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("farms").select("id, name, soil_type, sowing_date").eq("id", data.farmId).maybeSingle(),
      supabase
        .from("soil_observations")
        .select("source, moisture_pct, moisture_label")
        .eq("farm_id", data.farmId)
        .order("recorded_at", { ascending: false })
        .limit(1),
    ]);

    const { growthStage } = await import("./soil.server");
    const obs = soilObs?.[0];

    const verdict = assessFarmHealth({
      ndvi: ndvi ?? [],
      weather: wx?.[0] ?? null,
      latestScan: scans?.[0] ?? null,
      soil: obs
        ? {
            type: farm?.soil_type ?? null,
            moistureLabel: (obs.moisture_label as "dry" | "normal" | "wet" | null) ?? null,
            moisturePct: obs.moisture_pct ?? null,
            moistureSource:
              obs.source === "sensor" ? "sensor measured" : obs.source === "manual" ? "farmer entered" : "satellite/API estimate",
          }
        : { type: farm?.soil_type ?? null },
      cropStage: growthStage(farm?.sowing_date).stage,
    });


    let alertId: string | null = null;
    if (data.createAlert && farm && verdict.level !== "normal") {
      const { data: recent } = await supabase
        .from("alerts")
        .select("id, level, created_at")
        .eq("farm_id", farm.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = recent?.[0];
      const fresh = last && Date.now() - new Date(last.created_at).getTime() < 6 * 3600 * 1000 && last.level === verdict.level;
      if (!fresh) {
        const { data: inserted } = await supabase
          .from("alerts")
          .insert({
            farm_id: farm.id,
            user_id: userId,
            level: verdict.level,
            title: alertCopy(verdict.level, "en"),
            message: verdict.reasons.join(" "),
            reasons: verdict.reasons,
          })
          .select("id")
          .maybeSingle();
        alertId = inserted?.id ?? null;
      }
    }
    return { ...verdict, alertId };
  });

export const sendAlertSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { alertId: string; language: "en" | "ta" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { sendSms, buildAlertSms } = await import("./sms.server");

    const { data: alert } = await supabase
      .from("alerts")
      .select("id, level, farm_id")
      .eq("id", data.alertId)
      .maybeSingle();
    if (!alert) return { ok: false as const, reason: "not_found", message: "Alert not found." };

    const [{ data: farm }, { data: profile }, { data: ndvi }, { data: wx }] = await Promise.all([
      supabase.from("farms").select("name").eq("id", alert.farm_id).maybeSingle(),
      supabase.from("profiles").select("mobile, language").eq("id", userId).maybeSingle(),
      supabase
        .from("ndvi_observations")
        .select("mean_ndvi")
        .eq("farm_id", alert.farm_id)
        .order("observed_on", { ascending: false })
        .limit(2),
      supabase
        .from("weather_observations")
        .select("humidity_pct")
        .eq("farm_id", alert.farm_id)
        .order("recorded_at", { ascending: false })
        .limit(1),
    ]);

    if (!profile?.mobile)
      return { ok: false as const, reason: "no_mobile", message: "Add a mobile number to your profile first." };

    const a = ndvi?.[0]?.mean_ndvi ?? null;
    const b = ndvi?.[1]?.mean_ndvi ?? null;
    const trend = a != null && b != null ? (a < b - 0.02 ? "Declining" : a > b + 0.02 ? "Improving" : "Stable") : "n/a";

    const body = buildAlertSms({
      lang: data.language,
      farmName: farm?.name ?? "your farm",
      level: alert.level,
      trend,
      humidity: wx?.[0]?.humidity_pct ?? null,
    });

    const result = await sendSms(profile.mobile, body);
    if (result.ok) {
      await supabase.from("alerts").update({ sms_status: result.mode === "live" ? "sent" : "sandbox" }).eq("id", alert.id);
    }
    return result;
  });

export const getRiskZones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_risk_zones");
    if (error) return { ok: false as const, message: error.message, zones: [] };
    return { ok: true as const, zones: data ?? [] };
  });
