import { useEffect, useRef, useState } from "react";
import type { LatLng, Ring } from "@/lib/geo";

export type NdviOverlay = { imageDataUrl: string; bbox: [number, number, number, number] };
export type RiskZone = { grid_lat: number; grid_lng: number; crop: string; report_count: number };

type Props = {
  center: LatLng;
  zoom?: number;
  /** Existing farm boundary to display (read-only). */
  boundary?: Ring | null;
  /** Enable polygon drawing and report the drawn ring. */
  drawable?: boolean;
  onBoundaryChange?: (ring: Ring) => void;
  ndvi?: NdviOverlay | null;
  riskZones?: RiskZone[];
  showMarker?: boolean;
  className?: string;
};

/**
 * Leaflet + OpenStreetMap map. Leaflet is loaded lazily in the browser only,
 * so this component is SSR-safe.
 */
export default function FarmMap({
  center,
  zoom = 16,
  boundary,
  drawable = false,
  onBoundaryChange,
  ndvi,
  riskZones,
  showMarker = true,
  className,
}: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<Record<string, any>>({});
  const cbRef = useRef(onBoundaryChange);
  cbRef.current = onBoundaryChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");
      await import("leaflet/dist/leaflet.css");
      await import("leaflet-draw/dist/leaflet.draw.css");
      if (cancelled || !el.current || mapRef.current) return;

      const map = L.map(el.current, { zoomControl: true }).setView([center.lat, center.lng], zoom);
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      });
      const sat = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagery &copy; Esri" },
      );
      const terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: "&copy; OpenTopoMap",
      });
      sat.addTo(map);
      L.control.layers({ Satellite: sat, Street: osm, Terrain: terrain }).addTo(map);

      const drawn = new L.FeatureGroup();
      map.addLayer(drawn);
      layersRef.current['drawn'] = drawn;

      if (drawable) {
        const control = new (L as any).Control.Draw({
          edit: { featureGroup: drawn, remove: true },
          draw: {
            polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "#2e7d32", weight: 3 } },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false,
          },
        });
        map.addControl(control);

        const emit = () => {
          const layers = drawn.getLayers();
          const last = layers[layers.length - 1] as any;
          if (!last?.getLatLngs) return;
          const ring = (last.getLatLngs()[0] as any[]).map((p) => ({ lat: p.lat, lng: p.lng }));
          cbRef.current?.(ring);
        };
        map.on((L as any).Draw.Event.CREATED, (e: any) => {
          drawn.clearLayers();
          drawn.addLayer(e.layer);
          emit();
        });
        map.on((L as any).Draw.Event.EDITED, emit);
        map.on((L as any).Draw.Event.DELETED, () => cbRef.current?.([]));
      }

      mapRef.current = { L, map };
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.map.setView([center.lat, center.lng], mapRef.current.map.getZoom() ?? zoom);
  }, [ready, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, map } = mapRef.current;
    layersRef.current['marker']?.remove();
    if (showMarker) {
      layersRef.current['marker'] = L.circleMarker([center.lat, center.lng], {
        radius: 7,
        color: "#1565c0",
        fillColor: "#42a5f5",
        fillOpacity: 0.9,
      }).addTo(map);
    }
  }, [ready, center.lat, center.lng, showMarker]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, map } = mapRef.current;
    layersRef.current['boundary']?.remove();
    if (boundary && boundary.length >= 3) {
      const poly = L.polygon(
        boundary.map((p) => [p.lat, p.lng]),
        { color: "#f5b400", weight: 3, fillOpacity: 0.05 },
      ).addTo(map);
      layersRef.current['boundary'] = poly;
      map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    }
  }, [ready, boundary]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, map } = mapRef.current;
    layersRef.current['ndvi']?.remove();
    if (ndvi?.imageDataUrl) {
      const [w, s, e, n] = ndvi.bbox;
      layersRef.current['ndvi'] = L.imageOverlay(ndvi.imageDataUrl, [
        [s, w],
        [n, e],
      ], { opacity: 0.85 }).addTo(map);
    }
  }, [ready, ndvi]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const { L, map } = mapRef.current;
    (layersRef.current['zones'] as any[] | undefined)?.forEach((z) => z.remove());
    layersRef.current['zones'] = (riskZones ?? []).map((z) =>
      L.circle([z.grid_lat, z.grid_lng], {
        radius: 2500,
        color: "#c62828",
        fillColor: "#e57373",
        fillOpacity: 0.25,
        weight: 1,
      })
        .bindPopup(`${z.crop}: ${z.report_count} reports increasing in this area`)
        .addTo(map),
    );
  }, [ready, riskZones]);

  return <div ref={el} className={className ?? "h-[420px] w-full rounded-2xl border border-border"} />;
}
