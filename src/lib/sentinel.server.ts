/**
 * Real Sentinel-2 (Copernicus) NDVI retrieval via the Sentinel Hub APIs.
 *
 * Requires credentials (free Copernicus Data Space / Sentinel Hub account):
 *   SENTINEL_HUB_CLIENT_ID
 *   SENTINEL_HUB_CLIENT_SECRET
 * Optional:
 *   SENTINEL_HUB_BASE_URL (default https://sh.dataspace.copernicus.eu)
 *
 * No value returned by this module is ever synthesised. If credentials are
 * missing or no usable (low-cloud) observation exists, we return a typed
 * failure so the UI can say so honestly.
 */

export type NdviFailure = {
  ok: false;
  reason: "not_configured" | "auth_failed" | "no_usable_image" | "invalid_boundary" | "api_error";
  message: string;
};

export type NdviStats = {
  ok: true;
  observedOn: string;
  meanNdvi: number;
  minNdvi: number;
  maxNdvi: number;
  healthyPct: number;
  stressedPct: number;
  cloudCoverPct: number;
  source: string;
  imageDataUrl: string | null;
  bbox: [number, number, number, number];
};

export type NdviResult = NdviStats | NdviFailure;

const EVALSCRIPT_STATS = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function isBad(scl) {
  // 0 no data, 1 saturated, 3 cloud shadow, 8/9 cloud med+high prob, 10 cirrus
  return scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10;
}
function evaluatePixel(s) {
  var valid = s.dataMask === 1 && !isBad(s.SCL);
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [valid ? 1 : 0] };
}`;

const EVALSCRIPT_IMAGE = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4 }
  };
}
function isBad(scl) {
  return scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10;
}
function evaluatePixel(s) {
  if (s.dataMask !== 1 || isBad(s.SCL)) return [0, 0, 0, 0];
  var n = (s.B08 - s.B04) / (s.B08 + s.B04);
  if (n < 0.1) return [0.63, 0.40, 0.18, 0.85];
  if (n < 0.25) return [0.85, 0.75, 0.35, 0.85];
  if (n < 0.45) return [0.71, 0.83, 0.29, 0.85];
  if (n < 0.65) return [0.31, 0.68, 0.29, 0.85];
  return [0.07, 0.41, 0.17, 0.85];
}`;

function baseUrl() {
  return process.env["SENTINEL_HUB_BASE_URL"] ?? "https://sh.dataspace.copernicus.eu";
}

async function getToken(): Promise<{ token: string } | NdviFailure> {
  const id = process.env["SENTINEL_HUB_CLIENT_ID"];
  const secret = process.env["SENTINEL_HUB_CLIENT_SECRET"];
  if (!id || !secret) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Satellite data source is not configured. Add SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET (free Copernicus Data Space account) to enable real Sentinel-2 NDVI.",
    };
  }
  const res = await fetch(`${baseUrl()}/auth/realms/CDSE/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  if (!res.ok) {
    return {
      ok: false,
      reason: "auth_failed",
      message: `Satellite provider rejected the configured credentials (HTTP ${res.status}).`,
    };
  }
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) return { ok: false, reason: "auth_failed", message: "No access token returned by provider." };
  return { token: j.access_token };
}

type Geometry = { type: "Polygon"; coordinates: number[][][] };

export async function fetchNdvi(geometry: Geometry, days = 30): Promise<NdviResult> {
  const ring = geometry?.coordinates?.[0];
  if (!ring || ring.length < 4) {
    return { ok: false, reason: "invalid_boundary", message: "Farm boundary is invalid. Draw at least three points." };
  }
  const lngs = ring.map((c) => c[0] as number);
  const lats = ring.map((c) => c[1] as number);
  const bbox: [number, number, number, number] = [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];

  const auth = await getToken();
  if ("ok" in auth) return auth;

  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const bounds = {
    geometry,
    properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
  };

  const statsRes = await fetch(`${baseUrl()}/api/v1/statistics`, {
    method: "POST",
    headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      input: {
        bounds,
        data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
      },
      aggregation: {
        timeRange: { from: from.toISOString(), to: to.toISOString() },
        aggregationInterval: { of: "P1D" },
        resx: 10,
        resy: 10,
        evalscript: EVALSCRIPT_STATS,
      },
      calculations: {
        ndvi: { histograms: { default: { nBins: 20, lowEdge: -1, highEdge: 1 } } },
      },
    }),
  });

  if (!statsRes.ok) {
    const text = await statsRes.text();
    return {
      ok: false,
      reason: "api_error",
      message: `Satellite statistics request failed (HTTP ${statsRes.status}). ${text.slice(0, 200)}`,
    };
  }

  const payload = (await statsRes.json()) as { data?: any[] };
  const intervals = (payload.data ?? []).filter((d) => d?.outputs?.ndvi?.bands?.B0?.stats);

  let best: { date: string; stats: any; hist: any } | null = null;
  for (const item of intervals) {
    const band = item.outputs.ndvi.bands.B0;
    const s = band.stats;
    const total = (s.sampleCount ?? 0) as number;
    const valid = total - ((s.noDataCount ?? 0) as number);
    if (total === 0 || valid / total < 0.6) continue; // too much cloud / missing data
    const date = String(item.interval.from).slice(0, 10);
    if (!best || date > best.date) best = { date, stats: s, hist: band.histogram };
  }

  if (!best) {
    return {
      ok: false,
      reason: "no_usable_image",
      message:
        "No usable Sentinel-2 observation in the last 30 days — every pass was too cloudy or outside the revisit window.",
    };
  }

  const s = best.stats;
  const total = (s.sampleCount ?? 0) as number;
  const valid = total - ((s.noDataCount ?? 0) as number);
  const cloudCoverPct = total ? ((total - valid) / total) * 100 : 0;

  let healthy = 0;
  let stressed = 0;
  let counted = 0;
  for (const bin of best.hist?.bins ?? []) {
    const mid = ((bin.lowEdge as number) + (bin.highEdge as number)) / 2;
    const c = bin.count as number;
    counted += c;
    if (mid >= 0.5) healthy += c;
    if (mid < 0.3) stressed += c;
  }

  let imageDataUrl: string | null = null;
  try {
    const imgRes = await fetch(`${baseUrl()}/api/v1/process`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json", accept: "image/png" },
      body: JSON.stringify({
        input: {
          bounds,
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: { from: `${best.date}T00:00:00Z`, to: `${best.date}T23:59:59Z` },
                mosaickingOrder: "leastCC",
              },
            },
          ],
        },
        output: { width: 512, height: 512, responses: [{ identifier: "default", format: { type: "image/png" } }] },
        evalscript: EVALSCRIPT_IMAGE,
      }),
    });
    if (imgRes.ok) {
      const buf = new Uint8Array(await imgRes.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i] as number);
      imageDataUrl = `data:image/png;base64,${btoa(bin)}`;
    }
  } catch {
    imageDataUrl = null;
  }

  return {
    ok: true,
    observedOn: best.date,
    meanNdvi: s.mean as number,
    minNdvi: s.min as number,
    maxNdvi: s.max as number,
    healthyPct: counted ? (healthy / counted) * 100 : 0,
    stressedPct: counted ? (stressed / counted) * 100 : 0,
    cloudCoverPct,
    source: "sentinel-2-l2a",
    imageDataUrl,
    bbox,
  };
}
