import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { MapPin } from "lucide-react";
import { useFarms } from "@/hooks/useFarms";
import { ringFromGeoJson } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { EmptyFarm } from "@/components/farm-widgets";

const FarmMap = lazy(() => import("@/components/FarmMap"));

export const Route = createFileRoute("/_authenticated/farm/")({
  head: () => ({
    meta: [
      { title: "My farm — AgroHealthy AI" },
      { name: "description", content: "Your registered farm boundary, crop details and mapped area." },
      { property: "og:title", content: "My farm — AgroHealthy AI" },
      { property: "og:description", content: "Registered GPS boundary and crop details for your field." },
    ],
  }),
  component: FarmPage,
});

function FarmPage() {
  const { t } = useI18n();
  const { data, isLoading } = useFarms();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0) return <EmptyFarm />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">{t("myFarm")}</h1>
        <Button asChild className="ml-auto h-12 font-bold">
          <Link to="/farm/new">{t("registerFarm")}</Link>
        </Button>
      </header>

      {data.map((farm) => (
        <section key={farm.id} className="field-card space-y-3 p-5">
          <h2 className="text-lg font-bold">{farm.name}</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {farm.latitude.toFixed(5)}, {farm.longitude.toFixed(5)} · {farm.crop} ·{" "}
            {farm.area_hectares.toFixed(3)} {t("hectares")}
          </p>
          <Suspense fallback={<div className="h-[320px] animate-pulse rounded-2xl bg-muted" />}>
            <FarmMap
              center={{ lat: farm.latitude, lng: farm.longitude }}
              boundary={ringFromGeoJson(farm.polygon)}
              className="h-[320px] w-full rounded-2xl"
            />
          </Suspense>
        </section>
      ))}
    </div>
  );
}
