export type AiFailure = { ok: false; reason: string; message: string };

export async function chat(body: Record<string, unknown>): Promise<any | AiFailure> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, reason: "not_configured", message: "AI service is not configured." };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429)
    return { ok: false, reason: "rate_limited", message: "AI service is busy. Please try again in a moment." };
  if (res.status === 402)
    return { ok: false, reason: "no_credits", message: "AI credits exhausted. Please top up to continue." };
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: "api_error", message: `AI service error (${res.status}): ${text.slice(0, 200)}` };
  }
  return await res.json();
}

export function extractJson(content: string): any | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? (fenced[1] as string) : content;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
