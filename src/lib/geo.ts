export type LatLng = { lat: number; lng: number };
export type Ring = LatLng[];

/** Spherical polygon area in hectares (shoelace on an equirectangular projection). */
export function polygonAreaHectares(ring: Ring): number {
  if (ring.length < 3) return 0;
  const R = 6378137;
  const latRef = (ring.reduce((s, p) => s + p.lat, 0) / ring.length) * (Math.PI / 180);
  const pts = ring.map((p) => ({
    x: (p.lng * Math.PI) / 180 * R * Math.cos(latRef),
    y: (p.lat * Math.PI) / 180 * R,
  }));
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2) / 10000;
}

export function centroid(ring: Ring): LatLng {
  const lat = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const lng = ring.reduce((s, p) => s + p.lng, 0) / ring.length;
  return { lat, lng };
}

export function bboxOf(ring: Ring): [number, number, number, number] {
  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** GeoJSON Polygon ([lng,lat] order, closed ring) from a lat/lng ring. */
export function toGeoJsonPolygon(ring: Ring) {
  const coords = ring.map((p) => [p.lng, p.lat] as [number, number]);
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
  return { type: "Polygon" as const, coordinates: [coords] };
}

export function ringFromGeoJson(poly: unknown): Ring {
  const p = poly as { coordinates?: number[][][] } | null;
  const coords = p?.coordinates?.[0] ?? [];
  const ring = coords.map((c) => ({ lat: c[1] as number, lng: c[0] as number }));
  if (ring.length > 1) {
    const a = ring[0]!;
    const b = ring[ring.length - 1]!;
    if (a.lat === b.lat && a.lng === b.lng) ring.pop();
  }
  return ring;
}

export const NDVI_BANDS = [
  { max: 0.1, key: "veryLow", color: "#a1662f" },
  { max: 0.25, key: "low", color: "#d9c05a" },
  { max: 0.45, key: "moderate", color: "#b5d44a" },
  { max: 0.65, key: "healthy", color: "#4fae4a" },
  { max: 1.01, key: "veryHealthy", color: "#12692b" },
] as const;

export function ndviBand(value: number) {
  return NDVI_BANDS.find((b) => value < b.max) ?? NDVI_BANDS[NDVI_BANDS.length - 1];
}
