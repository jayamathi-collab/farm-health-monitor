export type AlertLevel = "normal" | "watch" | "risk";

export type HealthInput = {
  ndvi: Array<{ observed_on: string; mean_ndvi: number | null }>;
  weather: {
    humidity_pct?: number | null;
    temperature_c?: number | null;
    rainfall_mm?: number | null;
  } | null;
  latestScan: { category: string | null; confidence: number | null; problem: string | null } | null;
  soil?: {
    type?: string | null;
    moistureLabel?: "dry" | "normal" | "wet" | null;
    moisturePct?: number | null;
    moistureSource?: string | null;
  } | null;
  cropStage?: string | null;
};

export type Recommendation = { en: string; ta: string; costInr: number };

export type HealthVerdict = {
  level: AlertLevel;
  trend: "improving" | "stable" | "declining" | "unknown";
  reasons: string[];
  reasonsTa: string[];
  recommendations: Recommendation[];
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

  const soil = input.soil;
  if (soil?.moistureLabel === "dry") {
    score += 1;
    reasons.push(
      `Soil moisture appears low (${soil.moisturePct != null ? `${soil.moisturePct}%` : "dry"}${soil.moistureSource ? `, ${soil.moistureSource}` : ""}).`,
    );
    reasonsTa.push("மண் ஈரப்பதம் குறைவாக உள்ளது.");
  } else if (soil?.moistureLabel === "wet" && (w?.rainfall_mm ?? 0) >= 10) {
    score += 1;
    reasons.push("Soil is wet after recent rainfall — waterlogging can stress roots.");
    reasonsTa.push("சமீபத்திய மழையால் மண் ஈரமாக உள்ளது — நீர் தேங்குதல் வேரை பாதிக்கலாம்.");
  }
  if (soil?.type) {
    reasons.push(`Soil type on record: ${soil.type} (mapped/estimated, not a laboratory test).`);
    reasonsTa.push(`பதிவான மண் வகை: ${soil.type} (மதிப்பீடு, ஆய்வக சோதனை அல்ல).`);
  }
  if (input.cropStage && input.cropStage !== "unknown") {
    reasons.push(`Crop growth stage: ${input.cropStage}.`);
    reasonsTa.push(`பயிர் வளர்ச்சி நிலை: ${input.cropStage}.`);
  }

  const level: AlertLevel = score >= 3 ? "risk" : score >= 1 ? "watch" : "normal";
  if (!reasons.length) {
    reasons.push("No significant risk detected in the observations available so far.");
    reasonsTa.push("இதுவரை கிடைத்த தகவல்களில் குறிப்பிடத்தக்க ஆபத்து இல்லை.");
  }
  return { level, trend, reasons, reasonsTa, recommendations: buildRecommendations(input, level) };
}

/** Lowest-cost action first; never auto-recommends a pesticide or purchase. */
export function buildRecommendations(input: HealthInput, level: AlertLevel): Recommendation[] {
  const recs: Recommendation[] = [];
  const dry = input.soil?.moistureLabel === "dry";
  const hot = (input.weather?.temperature_c ?? 0) >= 35;
  const humid = (input.weather?.humidity_pct ?? 0) >= 80;
  const scan = input.latestScan;

  if (dry || hot) {
    recs.push({
      en: "Check irrigation and inspect the affected area before purchasing any treatment.",
      ta: "எந்த மருந்தையும் வாங்குவதற்கு முன், நீர்ப்பாசனத்தை சரிபார்த்து பாதிக்கப்பட்ட பகுதியை பரிசோதிக்கவும்.",
      costInr: 0,
    });
    recs.push({
      en: "Irrigate early morning or late evening using water already available on the farm.",
      ta: "வயலில் உள்ள நீரைப் பயன்படுத்தி அதிகாலை அல்லது மாலையில் நீர் பாய்ச்சவும்.",
      costInr: 0,
    });
  }
  if (humid) {
    recs.push({
      en: "Walk the field and check leaf undersides for early spots; improve spacing and drainage first.",
      ta: "வயலில் நடந்து இலைகளின் அடிப்பகுதியை பரிசோதிக்கவும்; இடைவெளி மற்றும் வடிகாலை முதலில் சரிசெய்யவும்.",
      costInr: 0,
    });
  }
  if (scan && scan.category && !["healthy", "unknown"].includes(scan.category)) {
    recs.push({
      en: "Photograph and mark the affected plants, then re-check them in 2-3 days before buying inputs.",
      ta: "பாதிக்கப்பட்ட செடிகளை புகைப்படம் எடுத்து குறித்து வைத்து, 2-3 நாட்களில் மீண்டும் பரிசோதிக்கவும்.",
      costInr: 0,
    });
  }
  if (level === "risk") {
    recs.push({
      en: "If the problem spreads after inspection, consult your local agriculture officer or a soil/plant testing lab.",
      ta: "பரிசோதனைக்குப் பிறகும் பரவினால், உள்ளூர் வேளாண் அதிகாரி அல்லது மண்/தாவர சோதனை ஆய்வகத்தை அணுகவும்.",
      costInr: 0,
    });
  }
  if (!recs.length) {
    recs.push({
      en: "Continue routine monitoring. No purchase is needed at this stage.",
      ta: "வழக்கமான கண்காணிப்பை தொடரவும். இப்போது எதுவும் வாங்க தேவையில்லை.",
      costInr: 0,
    });
  }
  return recs;
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
