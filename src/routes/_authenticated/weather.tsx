import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudSun } from "lucide-react";
import { usePrimaryFarm } from "@/hooks/useFarms";
import { getFarmWeather } from "@/lib/weather.functions";
import { useI18n } from "@/lib/i18n";
import { EmptyFarm } from "@/components/farm-widgets";

export const Route = createFileRoute("/_authenticated/weather")({
  head: () => ({
    meta: [
      { title: "Farm weather — AgroHealthy AI" },
      { name: "description", content: "Live temperature, humidity and rainfall for your farm coordinates with farming warnings." },
      { property: "og:title", content: "Farm weather — AgroHealthy AI" },
      { property: "og:description", content: "Real weather observations and warnings for your exact farm location." },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const { t, lang } = useI18n();
  const { farm, isLoading } = usePrimaryFarm();
  const fn = useServerFn(getFarmWeather);
  const q = useQuery({
    enabled: !!farm?.id,
    queryKey: ["weather-page", farm?.id],
    queryFn: () => fn({ data: { farmId: farm!.id } }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!farm) return <EmptyFarm />;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <CloudSun className="size-6" /> {t("weather")}
      </h1>

      {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
      {q.data?.ok === false && <p className="text-sm text-destructive">{q.data.message}</p>}

      {q.data?.ok && q.data.current && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Temperature" value={`${Math.round(q.data.current.temperature_c)} °C`} />
            <Stat label="Humidity" value={`${Math.round(q.data.current.humidity_pct)} %`} />
            <Stat label="Rain (24h)" value={`${q.data.current.rainfall_mm.toFixed(1)} mm`} />
          </div>
          {q.data.warnings.length > 0 && (
            <section className="field-card p-5">
              <h2 className="text-lg font-bold">Warnings</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {q.data.warnings.map((w) => (
                  <li key={w.en}>{lang === "ta" ? w.ta : w.en}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
