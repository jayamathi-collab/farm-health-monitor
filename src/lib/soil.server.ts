/**
 * Real soil data sources — no fabricated values.
 * - Soil texture / pH / nitrogen: ISRIC SoilGrids v2.0 (global soil property maps, no API key).
 *   These are MAPPED/ESTIMATED values from location, never a laboratory test.
 * - Soil moisture: Open-Meteo soil moisture model layers (volumetric water content, m3/m3).
 * If a source fails, we return `available: false` with a reason — never a made-up number.
 */

export type SoilTypeInfo = {
  available: boolean;
  reason?: string;
  soilType?: string; // Sandy / Clay / Loamy / Sandy loam ...
  clayPct?: number;
  sandPct?: number;
  siltPct?: number;
  ph?: number | null;
  nitrogenGkg?: number | null;
  organicCarbonGkg?: number | null;
  source: string; // provider label
  sourceLabel: string; // human label, e.g. "Mapped from location (SoilGrids)"
};

export type SoilMoistureInfo = {
  available: boolean;
  reason?: string;
  volumetric?: number; // m3/m3
  pct?: number; // 0-100
  label?: "dry" | "normal" | "wet";
  depth?: string;
  recordedAt?: string;
  source: string;
  sourceLabel: string;
};

/** USDA-style simplified texture classification from clay/sand/silt percentages. */
export function classifyTexture(clay: number, sand: number, silt: number): string {
  if (clay >= 40) return "Clay";
  if (sand >= 85) return "Sandy";
  if (sand >= 70) return "Loamy sand";
  if (clay >= 27 && sand <= 45) return "Clay loam";
  if (silt >= 80) return "Silty";
  if (silt >= 50) return "Silty loam";
  if (sand >= 52) return "Sandy loam";
  return "Loamy";
}

export async function fetchSoilType(lat: number, lng: number): Promise<SoilTypeInfo> {
  const base = "https://rest.isric.org/soilgrids/v2.0/properties/query";
  const url =
    `${base}?lon=${lng}&lat=${lat}` +
    `&property=clay&property=sand&property=silt&property=phh2o&property=nitrogen&property=soc` +
    `&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
  const fail = (reason: string): SoilTypeInfo => ({
    available: false,
    reason,
    source: "soilgrids",
    sourceLabel: "Mapped from location (SoilGrids)",
  });
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12000) });
    if (res.status === 429 || res.status === 503) return fail("Soil map service is busy. Please try again shortly.");
    if (!res.ok) return fail(`Soil map service returned ${res.status}`);
    const j = (await res.json()) as any;
    const layers: any[] = j?.properties?.layers ?? [];
    const read = (name: string): number | null => {
      const layer = layers.find((l) => l.name === name);
      const depths: any[] = layer?.depths ?? [];
      const hit = depths.find((d) => d?.values?.mean != null);
      if (!hit) return null;
      const factor = layer?.unit_measure?.d_factor ?? layer?.unit_measure?.d ?? 1;
      return hit.values.mean / factor;
    };
    const clay = read("clay");
    const sand = read("sand");
    const silt = read("silt");
    if (clay == null || sand == null || silt == null) return fail("Soil type data unavailable for this location");
    return {
      available: true,
      soilType: classifyTexture(clay, sand, silt),
      clayPct: Math.round(clay),
      sandPct: Math.round(sand),
      siltPct: Math.round(silt),
      ph: read("phh2o"),
      nitrogenGkg: read("nitrogen"),
      organicCarbonGkg: read("soc"),
      source: "soilgrids",
      sourceLabel: "Mapped from location (SoilGrids)",
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Soil map service unreachable");
  }
}

export async function fetchSoilMoisture(lat: number, lng: number): Promise<SoilMoistureInfo> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&hourly=soil_moisture_0_to_7cm&forecast_days=1&past_days=1&timezone=UTC`;
  const fail = (reason: string): SoilMoistureInfo => ({
    available: false,
    reason,
    source: "open-meteo",
    sourceLabel: "Satellite/model estimate (Open-Meteo)",
  });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return fail(`Soil moisture service returned ${res.status}`);
    const j = (await res.json()) as any;
    const times: string[] = j?.hourly?.time ?? [];
    const values: Array<number | null> = j?.hourly?.soil_moisture_0_to_7cm ?? [];
    let idx = -1;
    for (let i = 0; i < times.length; i++) {
      if (values[i] == null) continue;
      if (new Date(`${times[i]!}Z`).getTime() <= Date.now()) idx = i;
    }
    if (idx === -1) return fail("Real-time soil moisture unavailable.");
    const v = values[idx] as number;
    return {
      available: true,
      volumetric: v,
      pct: Math.round(v * 1000) / 10,
      label: v < 0.15 ? "dry" : v > 0.35 ? "wet" : "normal",
      depth: "0-7cm",
      recordedAt: times[idx] ? `${times[idx]}Z` : new Date().toISOString(),
      source: "open-meteo",
      sourceLabel: "Satellite/model estimate (Open-Meteo)",
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Soil moisture service unreachable");
  }
}

/** Days since sowing → coarse growth stage. Never guessed when sowing date is missing. */
export function growthStage(sowingDate: string | null | undefined): { days: number | null; stage: string } {
  if (!sowingDate) return { days: null, stage: "unknown" };
  const days = Math.floor((Date.now() - new Date(sowingDate).getTime()) / 86400000);
  if (days < 0) return { days, stage: "unknown" };
  if (days <= 20) return { days, stage: "seedling / early vegetative" };
  if (days <= 45) return { days, stage: "vegetative" };
  if (days <= 70) return { days, stage: "flowering" };
  if (days <= 100) return { days, stage: "fruiting / grain filling" };
  return { days, stage: "maturity / harvest" };
}
