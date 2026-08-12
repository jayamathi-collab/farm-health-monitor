export type SmsResult =
  | { ok: true; mode: "live" | "sandbox"; providerId: string | null; body: string; note?: string }
  | { ok: false; reason: string; message: string };

/**
 * Twilio integration. Live sending requires:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 * Without them the platform runs in clearly-labelled Sandbox mode: the exact
 * message that WOULD be sent is recorded and shown, and never described as
 * a delivered SMS.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_FROM_NUMBER"];

  if (!sid || !token || !from) {
    return {
      ok: true,
      mode: "sandbox",
      providerId: null,
      body,
      note: "SMS sandbox: no message was actually delivered. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER to send real SMS.",
    };
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: "provider_error", message: `SMS provider error (${res.status}): ${text.slice(0, 160)}` };
  }
  const j = (await res.json()) as { sid?: string };
  return { ok: true, mode: "live", providerId: j.sid ?? null, body };
}

export function buildAlertSms(opts: {
  lang: "en" | "ta";
  farmName: string;
  level: string;
  trend: string;
  humidity?: number | null;
}) {
  if (opts.lang === "ta") {
    return `AgroHealthy எச்சரிக்கை: ${opts.farmName} வயலில் பயிர் ஆரோக்கிய ஆபத்து (${opts.level}). வயலை பரிசோதிக்கவும். NDVI: ${opts.trend}. ஈரப்பதம்: ${opts.humidity != null ? Math.round(opts.humidity) + "%" : "தகவல் இல்லை"}. விவரங்களுக்கு AgroHealthy செயலியை திறக்கவும்.`;
  }
  return `AgroHealthy Alert: Your farm ${opts.farmName} has a crop-health risk (${opts.level}). Please inspect your field. NDVI: ${opts.trend}. Humidity: ${opts.humidity != null ? Math.round(opts.humidity) + "%" : "n/a"}. Open AgroHealthy app for details.`;
}
