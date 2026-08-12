import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WeatherWarning = { kind: string; level: "info" | "watch" | "risk"; en: string; ta: string };

export type WeatherResult = {
  ok: boolean;
  error?: string;
  source: string;
  current?: {
    temperature_c: number;
    humidity_pct: number;
    rainfall_mm: number;
    wind_kph: number;
    condition: string;
    rain_probability_pct: number;
  };
  daily?: Array<{
    date: string;
    tmax: number;
    tmin: number;
    rain_mm: number;
    rain_prob: number;
    condition: string;
  }>;
  warnings?: WeatherWarning[];
};

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

function buildWarnings(c: NonNullable<WeatherResult["current"]>, daily: NonNullable<WeatherResult["daily"]>) {
  const w: WeatherWarning[] = [];
  if (c.humidity_pct >= 80)
    w.push({
      kind: "humidity",
      level: "watch",
      en: "High humidity — conditions can favour fungal crop stress. Inspect leaves.",
      ta: "அதிக ஈரப்பதம் — பூஞ்சை பாதிப்புக்கு ஏற்ற சூழல். இலைகளை பரிசோதிக்கவும்.",
    });
  const next3 = daily.slice(0, 3).reduce((s, d) => s + d.rain_mm, 0);
  if (next3 >= 50)
    w.push({
      kind: "rain",
      level: "risk",
      en: `Heavy rainfall expected (${Math.round(next3)} mm in 3 days). Check field drainage.`,
      ta: `கனமழை எதிர்பார்க்கப்படுகிறது (3 நாட்களில் ${Math.round(next3)} மி.மீ). வடிகால் வசதியை சரிபார்க்கவும்.`,
    });
  if (c.temperature_c >= 38)
    w.push({
      kind: "heat",
      level: "risk",
      en: "Heat stress risk. Irrigate early morning or late evening.",
      ta: "வெப்ப அழுத்த ஆபத்து. அதிகாலை அல்லது மாலையில் நீர்ப்பாசனம் செய்யவும்.",
    });
  if (daily.slice(0, 5).every((d) => d.rain_mm < 1))
    w.push({
      kind: "dry",
      level: "watch",
      en: "Dry period ahead — no meaningful rain in the next 5 days.",
      ta: "வறண்ட காலம் — அடுத்த 5 நாட்களில் மழை இல்லை.",
    });
  return w;
}

async function fetchWeather(lat: number, lng: number): Promise<WeatherResult> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
    `&hourly=precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&forecast_days=7&timezone=Asia%2FKolkata`;

  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, source: "open-meteo", error: `Weather service returned ${res.status}` };
  }
  const j = (await res.json()) as any;
  const cur = j.current;
  const current = {
    temperature_c: cur.temperature_2m,
    humidity_pct: cur.relative_humidity_2m,
    rainfall_mm: cur.precipitation,
    wind_kph: cur.wind_speed_10m,
    condition: WMO[cur.weather_code] ?? "Unknown",
    rain_probability_pct: j.hourly?.precipitation_probability?.[0] ?? j.daily.precipitation_probability_max[0] ?? 0,
  };
  const daily = (j.daily.time as string[]).map((date, i) => ({
    date,
    tmax: j.daily.temperature_2m_max[i],
    tmin: j.daily.temperature_2m_min[i],
    rain_mm: j.daily.precipitation_sum[i],
    rain_prob: j.daily.precipitation_probability_max[i] ?? 0,
    condition: WMO[j.daily.weather_code[i]] ?? "Unknown",
  }));
  return { ok: true, source: "open-meteo", current, daily, warnings: buildWarnings(current, daily) };
}

export const getFarmWeather = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { farmId: string }) => d)
  .handler(async ({ data, context }): Promise<WeatherResult> => {
    const { supabase, userId } = context;
    const { data: farm, error } = await supabase
      .from("farms")
      .select("id, latitude, longitude")
      .eq("id", data.farmId)
      .maybeSingle();
    if (error || !farm) return { ok: false, source: "open-meteo", error: "Farm not found or not accessible." };

    const result = await fetchWeather(farm.latitude, farm.longitude);
    if (result.ok && result.current) {
      await supabase.from("weather_observations").insert({
        farm_id: farm.id,
        user_id: userId,
        temperature_c: result.current.temperature_c,
        humidity_pct: result.current.humidity_pct,
        rainfall_mm: result.current.rainfall_mm,
        wind_kph: result.current.wind_kph,
        condition: result.current.condition,
        rain_probability_pct: result.current.rain_probability_pct,
      });
    }
    return result;
  });
