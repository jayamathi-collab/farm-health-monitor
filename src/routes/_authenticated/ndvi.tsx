import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Satellite, RefreshCw } from "lucide-react";
import { usePrimaryFarm, useNdviHistory } from "@/hooks/useFarms";
import { refreshNdvi } from "@/lib/ndvi.functions";
import { ringFromGeoJson, NDVI_BANDS } from "@/lib/geo";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { EmptyFarm, NdviValue } from "@/components/farm-widgets";

const FarmMap = lazy(() => import("@/components/FarmMap"));

export const Route = createFileRoute("/_authenticated/ndvi")({
  head: () => ({
    meta: [
      { title: "Satellite NDVI — AgroHealthy AI" },
      { name: "description", content: "Real Sentinel-2 NDVI heatmap and vegetation trend for your mapped farm boundary." },
      { property: "og:title", content: "Satellite NDVI — AgroHealthy AI" },
      { property: "og:description", content: "Sentinel-2 derived vegetation index heatmap and history for your field." },
    ],
  }),
  component: NdviPage,
});

function NdviPage() {
  const { t } = useI18n();
  const { farm, isLoading } = usePrimaryFarm();
  const history = useNdviHistory(farm?.id);
  const refresh = useServerFn(refreshNdvi);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!farm) return <EmptyFarm />;

  const latest = history.data?.[history.data.length - 1];

  const run = async () => {
    setBusy(true);
    try {
      const res = await refresh({ data: { farmId: farm.id } });
      if (!res.ok) toast.error(res.message ?? t("ndviUnavailable"));
      else toast.success("Satellite data updated");
      await history.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ndviUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <Satellite className="size-6" /> {t("ndvi")}
          </h1>
          <p className="text-muted-foreground">{t("ndviExplain")}</p>
        </div>
        <Button onClick={run} disabled={busy} className="ml-auto h-12 font-bold">
          <RefreshCw className={`mr-2 size-4 ${busy ? "animate-spin" : ""}`} /> {t("refreshSatellite")}
        </Button>
      </header>

      <section className="field-card p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("latestNdvi")}</p>
        <div className="mt-2 text-2xl font-extrabold">
          {latest?.mean_ndvi != null ? <NdviValue value={latest.mean_ndvi} /> : t("satelliteUnavailable")}
        </div>
        {latest && (
          <p className="mt-1 text-sm text-muted-foreground">
            Sentinel-2 observation on {latest.observed_on}
            {latest.cloud_cover_pct != null ? ` · cloud cover ${Math.round(latest.cloud_cover_pct)}%` : ""}
          </p>
        )}
        <p className="mt-3 rounded-xl bg-secondary p-3 text-sm">{t("ndviCaveat")}</p>
      </section>

      <section className="field-card p-5">
        <h2 className="mb-3 text-lg font-bold">{t("myFarm")}</h2>
        <Suspense fallback={<div className="h-[420px] animate-pulse rounded-2xl bg-muted" />}>
          <FarmMap
            center={{ lat: farm.latitude, lng: farm.longitude }}
            boundary={ringFromGeoJson(farm.polygon)}
            ndviImage={latest?.ndvi_image_url ?? null}
            ndviBounds={latest?.image_bounds ?? null}
            className="h-[420px] w-full rounded-2xl"
          />
        </Suspense>
        <ul className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
          {NDVI_BANDS.map((b) => (
            <li key={b.key} className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: b.color }} aria-hidden />
              {t(b.key as TKey)}
            </li>
          ))}
        </ul>
      </section>

      <section className="field-card p-5">
        <h2 className="mb-3 text-lg font-bold">{t("ndviTrend")}</h2>
        {history.data && history.data.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {[...history.data].reverse().map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span>{o.observed_on}</span>
                <span className="font-bold">{o.mean_ndvi != null ? o.mean_ndvi.toFixed(3) : "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No satellite observations stored yet. Tap “{t("refreshSatellite")}”.</p>
        )}
      </section>
    </div>
  );
}
