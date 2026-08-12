import { chat, extractJson } from "./ai.server";

export type ModelResult =
  | {
      ok: true;
      category: "disease" | "pest" | "nutrient" | "water_stress" | "healthy" | "unknown";
      problem: string;
      confidence: number;
      severity: "low" | "moderate" | "high" | "unknown";
      symptoms: string[];
      alternativeCauses: string[];
      recommendations: string[];
      contextNote: string;
      lowConfidence: boolean;
    }
  | { ok: false; reason: string; message: string };

export function buildDiseasePrompt(crop: string, ctx: string, language: "en" | "ta") {
  return `You are an agronomy assistant supporting smallholder farmers in Tamil Nadu, India.
Analyse the attached plant photograph for the crop: ${crop}.

Farm context (may be incomplete — never invent missing values):
${ctx || "No farm context available."}

Rules:
- Never state a diagnosis as certain. Use cautious language ("may be consistent with").
- Never claim that weather or NDVI proves a disease; they only describe conditions.
- If the image is unclear or you are unsure, use category "unknown" with low confidence.
- Write all farmer-facing text in ${language === "ta" ? "simple, farmer-friendly Tamil (தமிழ்)" : "simple English"}.

Reply with ONLY a JSON object:
{
  "category": "disease" | "pest" | "nutrient" | "water_stress" | "healthy" | "unknown",
  "problem": "short name of the likely problem",
  "confidence": 0.0-1.0,
  "severity": "low" | "moderate" | "high" | "unknown",
  "symptoms": ["visible symptom", ...],
  "alternativeCauses": ["other possible cause", ...],
  "recommendations": ["practical next step", ...],
  "contextNote": "one or two sentences combining the image finding with the farm's crop, weather and NDVI context, using cautious language"
}`;
}

export async function runDiseaseModel(prompt: string, imageBase64: string): Promise<ModelResult> {
  const response = await chat({
    model: "google/gemini-2.5-pro",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      },
    ],
  });
  if (response && response.ok === false) return response as ModelResult;

  const content: string = response?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  if (!parsed) {
    return { ok: false, reason: "unparsable", message: "The AI response could not be interpreted. Please try again." };
  }

  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);

  return {
    ok: true,
    category: ["disease", "pest", "nutrient", "water_stress", "healthy", "unknown"].includes(parsed.category)
      ? parsed.category
      : "unknown",
    problem: String(parsed.problem ?? "Unknown"),
    confidence,
    severity: ["low", "moderate", "high"].includes(parsed.severity) ? parsed.severity : "unknown",
    symptoms: arr(parsed.symptoms),
    alternativeCauses: arr(parsed.alternativeCauses),
    recommendations: arr(parsed.recommendations),
    contextNote: String(parsed.contextNote ?? ""),
    lowConfidence: confidence < 0.5,
  };
}
