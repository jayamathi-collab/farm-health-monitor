export type AlertLevel = "normal" | "watch" | "risk";

export type HealthInput = {
  ndvi: Array<{ observed_on: string; mean_ndvi: number | null }>;
  weather: {
    humidity_pct?: number | null;
    temperature_c?: number | null;
    rainfall_mm?: number | null;
  } | null;
  latestScan: { category: string | null; confidence: number | null; problem: string | null } | null;
};

export type HealthVerdict = {
  level: AlertLevel;
  trend: "improving" | "stable" | "declining" | "unknown";
  reasons: string[];
  reasonsTa: string[];
};

/** Transparent, rule-based combination of the observations we actually hold. */
export function assessFarmHealth(input: HealthInput): HealthVerdict {
  const reasons: string[] = [];
  const reasonsTa: string[] = [];
  let score = 0;

  const series = input.ndvi
    .filter((o) => typeof o.mean_ndvi === "number")
    .sort((a, b) => a.observed_on.localeCompare(b.observed_on));

  let trend: HealthVerdict["trend"] = "unknown";
  if (series.length >= 2) {
    const last = series[series.length - 1]!.mean_ndvi as number;
    const prev = series[series.length - 2]!.mean_ndvi as number;
    const delta = last - prev;
    if (delta <= -0.05) {
      trend = "declining";
      score += 2;
      reasons.push(`NDVI declined from ${prev.toFixed(2)} to ${last.toFixed(2)} since the previous observation.`);
      reasonsTa.push(`NDVI ${prev.toFixed(2)} இலிருந்து ${last.toFixed(2)} ஆக குறைந்துள்ளது.`);
    } else if (delta >= 0.05) {
      trend = "improving";
      reasons.push(`NDVI improved from ${prev.toFixed(2)} to ${last.toFixed(2)}.`);
      reasonsTa.push(`NDVI ${prev.toFixed(2)} இலிருந்து ${last.toFixed(2)} ஆக உயர்ந்துள்ளது.`);
    } else {
      trend = "stable";
    }
    if (last < 0.3) {
      score += 1;
      reasons.push(`Latest mean NDVI is low (${last.toFixed(2)}), which can indicate sparse or stressed vegetation.`);
      reasonsTa.push(`சமீபத்திய NDVI குறைவாக (${last.toFixed(2)}) உள்ளது.`);
    }
  } else if (series.length === 1) {
    trend = "unknown";
  }

  const w = input.weather;
  if (w?.humidity_pct != null && w.humidity_pct >= 80) {
    score += 1;
    reasons.push(`Humidity has been high (${Math.round(w.humidity_pct)}%), a condition that can favour fungal stress.`);
    reasonsTa.push(`ஈரப்பதம் அதிகமாக (${Math.round(w.humidity_pct)}%) உள்ளது.`);
  }
  if (w?.temperature_c != null && w.temperature_c >= 38) {
    score += 1;
    reasons.push(`Temperature is high (${Math.round(w.temperature_c)}°C), which can cause heat stress.`);
    reasonsTa.push(`வெப்பநிலை அதிகம் (${Math.round(w.temperature_c)}°C).`);
  }
  if (w?.rainfall_mm != null && w.rainfall_mm >= 20) {
    score += 1;
    reasons.push(`Heavy rainfall recorded (${Math.round(w.rainfall_mm)} mm).`);
    reasonsTa.push(`கனமழை பதிவாகியுள்ளது (${Math.round(w.rainfall_mm)} மி.மீ).`);
  }

  const scan = input.latestScan;
  if (scan && scan.category && !["healthy", "unknown"].includes(scan.category) && (scan.confidence ?? 0) >= 0.5) {
    score += 2;
    reasons.push(`A recent crop photo showed signs that may be consistent with ${scan.problem}.`);
    reasonsTa.push(`சமீபத்திய பயிர் படத்தில் ${scan.problem} போன்ற அறிகுறிகள் தெரிகின்றன.`);
  }

  const level: AlertLevel = score >= 3 ? "risk" : score >= 1 ? "watch" : "normal";
  if (!reasons.length) {
    reasons.push("No significant risk detected in the observations available so far.");
    reasonsTa.push("இதுவரை கிடைத்த தகவல்களில் குறிப்பிடத்தக்க ஆபத்து இல்லை.");
  }
  return { level, trend, reasons, reasonsTa };
}

export function alertCopy(level: AlertLevel, lang: "en" | "ta") {
  const map = {
    normal: { en: "Normal — no significant risk detected.", ta: "இயல்பு — குறிப்பிடத்தக்க ஆபத்து இல்லை." },
    watch: { en: "Watch — potential crop stress detected.", ta: "கவனிக்கவும் — பயிர் அழுத்தம் இருக்கலாம்." },
    risk: {
      en: "High Risk — multiple indicators suggest you should inspect the crop.",
      ta: "அதிக ஆபத்து — பல அறிகுறிகள் உள்ளன. வயலை பரிசோதிக்கவும்.",
    },
  } as const;
  return map[level][lang];
}
