import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Sprout, Ruler, CloudSun, Satellite, TrendingUp, HeartPulse, Siren, Camera, Map } from "lucide-react";
import { usePrimaryFarm, useNdviHistory, useAlerts } from "@/hooks/useFarms";
import { getFarmWeather } from "@/lib/weather.functions";
import { evaluateFarmHealth } from "@/lib/farm.functions";
import { useI18n } from "@/lib/i18n";
import { ringFromGeoJson, ndviBand } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { HealthPill, NdviValue, EmptyFarm } from "@/components/farm-widgets";
import { VoiceAssistant } from "@/components/VoiceAssistant";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Farm dashboard — AgroHealthy AI" },
      { name: "description", content: "Your farm at a glance: location, crop, live weather, latest satellite NDVI, health status and alerts." },
      { property: "og:title", content: "Farm dashboard — AgroHealthy AI" },
      { property: "og:description", content: "Live weather, satellite NDVI and crop-health status for your registered farm." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { farm, isLoading } = usePrimaryFarm();
  const ndvi = useNdviHistory(farm?.id);
  const alerts = useAlerts(farm?.id);
  const weatherFn = useServerFn(getFarmWeather);
  const healthFn = useServerFn(evaluateFarmHealth);

  const weather = useQuery({
    enabled: !!farm?.id,
    queryKey: ["weather", farm?.id],
    queryFn: () => weatherFn({ data: { farmId: farm!.id } }),
  });

  const health = useQuery({
    enabled: !!farm?.id && !weather.isLoading,
    queryKey: ["health", farm?.id, weather.dataUpdatedAt, ndvi.dataUpdatedAt],
    queryFn: () => healthFn({ data: { farmId: farm!.id, createAlert: true } }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!farm) return <EmptyFarm />;

  const latest = ndvi.data?.[ndvi.data.length - 1];
  const boundary = ringFromGeoJson(farm.polygon);
  const active = (alerts.data ?? []).filter((a) => !a.acknowledged).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{farm.name}</h1>
          <p className="text-muted-foreground">
            {farm.crop}
            {farm.crop_variety ? ` · ${farm.crop_variety}` : ""} · {farm.district ?? "—"}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline" className="h-12 font-bold">
            <Link to="/crop-doctor">
              <Camera className="mr-1 size-4" /> {t("scanCrop")}
            </Link>
          </Button>
          <Button asChild className="h-12 font-bold">
            <Link to="/ndvi">
              <Map className="mr-1 size-4" /> View Farm Map
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile Icon={MapPin} label="Farm location" value={`${farm.latitude.toFixed(4)}, ${farm.longitude.toFixed(4)}`} />
        <Tile Icon={Sprout} label={t("crop")} value={farm.crop} />
        <Tile Icon={Ruler} label={t("farmArea")} value={`${farm.area_hectares.toFixed(3)} ha`} />
        <Tile
          Icon={CloudSun}
          label={t("weather")}
          value={
            weather.isLoading
              ? "…"
              : weather.data?.ok && weather.data.current
                ? `${Math.round(weather.data.current.temperature_c)}°C · ${Math.round(weather.data.current.humidity_pct)}%`
                : "Unavailable"
          }
        />
        <Tile
          Icon={Satellite}
          label={t("latestNdvi")}
          value={latest?.mean_ndvi != null ? <NdviValue value={latest.mean_ndvi} /> : t("satelliteUnavailable")}
          sub={latest ? `Observed ${latest.observed_on}` : "No satellite observation stored yet"}
        />
        <Tile
          Icon={TrendingUp}
          label={t("ndviTrend")}
          value={
            health.data?.trend === "improving"
              ? t("improving")
              : health.data?.trend === "declining"
                ? t("declining")
                : health.data?.trend === "stable"
                  ? t("stable")
                  : "—"
          }
        />
        <Tile
          Icon={HeartPulse}
          label={t("farmHealth")}
          value={health.data ? <HealthPill level={health.data.level} /> : "…"}
        />
        <Tile Icon={Siren} label={t("alerts")} value={String(active.length)} sub={active[0]?.title ?? "No active alerts"} />
      </div>

      {health.data && (
        <section className="field-card p-5">
          <h2 className="text-lg font-bold">Why this status?</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {(lang === "ta" ? health.data.reasonsTa : health.data.reasons).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="field-card overflow-hidden p-5">
        <h2 className="mb-3 text-lg font-bold">{t("myFarm")}</h2>
        <FarmMapLazy lat={farm.latitude} lng={farm.longitude} boundary={boundary} />
      </section>

      <VoiceAssistant farmId={farm.id} />
    </div>
  );
}

function Tile({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="field-card p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" /> {label}
      </p>
      <div className="mt-2 text-lg font-extrabold">{value}</div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

import { lazy, Suspense } from "react";
const FarmMap = lazy(() => import("@/components/FarmMap"));

function FarmMapLazy({ lat, lng, boundary }: { lat: number; lng: number; boundary: ReturnType<typeof ringFromGeoJson> }) {
  return (
    <Suspense fallback={<div className="h-[380px] w-full animate-pulse rounded-2xl bg-muted" />}>
      <FarmMap center={{ lat, lng }} boundary={boundary} className="h-[380px] w-full rounded-2xl" />
    </Suspense>
  );
}

export { ndviBand };
