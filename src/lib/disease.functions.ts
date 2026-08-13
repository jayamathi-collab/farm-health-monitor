import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  farmId: z.string().uuid().nullable().optional(),
  crop: z.string().min(1).max(60).optional(),
  imageDataUrl: z.string().min(100).max(8_000_000),
  capturedAt: z.string().max(40).optional(),
  language: z.enum(["en", "ta"]).default("en"),
});

export type DiseaseAnalysis = {
  ok: true;
  scanId: string | null;
  category: "disease" | "pest" | "nutrient" | "water_stress" | "healthy" | "unknown";
  problem: string;
  confidence: number;
  severity: "low" | "moderate" | "high" | "unknown";
  symptoms: string[];
  alternativeCauses: string[];
  recommendations: string[];
  contextNote: string;
  lowConfidence: boolean;
};

export type DiseaseResponse = DiseaseAnalysis | { ok: false; reason: string; message: string };

export const analyzeCropImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<DiseaseResponse> => {
    const { supabase, userId } = context;
    const { buildDiseasePrompt, runDiseaseModel } = await import("./disease.server");

    const { growthStage } = await import("./soil.server");

    let ctx = "";
    let cropName = data.crop ?? "";
    let farm: { id: string; crop: string; district: string | null; sowing_date: string | null } | null = null;
    if (data.farmId) {
      const { data: f } = await supabase
        .from("farms")
        .select("id, name, crop, crop_variety, district, sowing_date, latitude, longitude, area_hectares, soil_type, soil_type_source, soil_ph")
        .eq("id", data.farmId)
        .maybeSingle();
      if (f) {
        farm = f;
        if (!cropName) cropName = f.crop;
        const { data: ndvi } = await supabase
          .from("ndvi_observations")
          .select("observed_on, mean_ndvi")
          .eq("farm_id", f.id)
          .order("observed_on", { ascending: false })
          .limit(3);
        const { data: wx } = await supabase
          .from("weather_observations")
          .select("temperature_c, humidity_pct, rainfall_mm, condition")
          .eq("farm_id", f.id)
          .order("recorded_at", { ascending: false })
          .limit(1);
        const { data: soil } = await supabase
          .from("soil_observations")
          .select("source, moisture_pct, moisture_label, recorded_at")
          .eq("farm_id", f.id)
          .order("recorded_at", { ascending: false })
          .limit(1);
        const stage = growthStage(f.sowing_date);
        const parts: string[] = [
          `Farm: ${f.name} (${f.area_hectares} ha)`,
          `Crop: ${f.crop}${f.crop_variety ? ` (variety ${f.crop_variety})` : ""}`,
          `District: ${f.district ?? "unknown"}`,
          `GPS: ${f.latitude}, ${f.longitude}`,
          `Sowing date: ${f.sowing_date ?? "unknown"}`,
          `Crop age: ${stage.days != null ? `${stage.days} days` : "unknown"} — growth stage: ${stage.stage}`,
          `Soil type: ${f.soil_type ? `${f.soil_type} (${f.soil_type_source === "manual" ? "farmer entered" : "mapped from location, estimated"})` : "unavailable"}`,
          `Soil pH: ${f.soil_ph ?? "unavailable"}`,
          soil?.[0]
            ? `Soil moisture: ${soil[0].moisture_label ?? "unknown"}${soil[0].moisture_pct != null ? ` (${soil[0].moisture_pct}%)` : ""} — source: ${soil[0].source === "api" ? "satellite/API estimate" : soil[0].source === "sensor" ? "sensor measured" : "farmer entered"}`
            : "Soil moisture: unavailable",
          `Camera capture time: ${data.capturedAt ?? new Date().toISOString()}`,
        ];
        if (ndvi?.length)
          parts.push(
            `Recent NDVI observations (newest first): ${ndvi
              .map((o) => `${o.observed_on}=${(o.mean_ndvi ?? 0).toFixed(2)}`)
              .join(", ")}`,
          );
        else parts.push("NDVI: no satellite observation stored yet");
        if (wx?.[0])
          parts.push(
            `Latest recorded weather: ${wx[0].temperature_c}C, humidity ${wx[0].humidity_pct}%, rain ${wx[0].rainfall_mm}mm, ${wx[0].condition}`,
          );
        else parts.push("Weather: not retrieved yet");
        ctx = parts.join("\n");
      }
    }

    if (!cropName) cropName = "unknown crop";
    const result = await runDiseaseModel(buildDiseasePrompt(cropName, ctx, data.language), data.imageDataUrl);
    if (!result.ok) return result;

    const { data: inserted } = await supabase
      .from("disease_scans")
      .insert({
        farm_id: farm?.id ?? null,
        user_id: userId,
        crop: cropName,
        category: result.category,
        problem: result.problem,
        confidence: result.confidence,
        severity: result.severity,
        symptoms: result.symptoms,
        alternative_causes: result.alternativeCauses,
        recommendations: result.recommendations,
        context_note: result.contextNote,
      })
      .select("id")
      .maybeSingle();

    // Contribute an anonymised, coarsely-rounded report to the community risk map.
    if (farm && result.category !== "healthy" && result.category !== "unknown" && result.confidence >= 0.5) {
      const { data: f2 } = await supabase
        .from("farms")
        .select("latitude, longitude, district")
        .eq("id", farm.id)
        .maybeSingle();
      if (f2) {
        await supabase.from("disease_reports").insert({
          user_id: userId,
          crop: cropName,
          problem: result.problem,
          category: result.category,
          district: f2.district,
          grid_lat: Math.round(f2.latitude * 20) / 20,
          grid_lng: Math.round(f2.longitude * 20) / 20,
        });
      }
    }

    return { ...result, scanId: inserted?.id ?? null };
  });
