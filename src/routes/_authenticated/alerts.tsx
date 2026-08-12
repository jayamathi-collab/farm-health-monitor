import { createFileRoute } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { usePrimaryFarm, useAlerts } from "@/hooks/useFarms";
import { useI18n } from "@/lib/i18n";
import { EmptyFarm, HealthPill } from "@/components/farm-widgets";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Crop alerts — AgroHealthy AI" },
      { name: "description", content: "Early warnings for your farm, each explaining the satellite and weather observations behind it." },
      { property: "og:title", content: "Crop alerts — AgroHealthy AI" },
      { property: "og:description", content: "Explained early warnings from NDVI trends and weather conditions." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { t } = useI18n();
  const { farm, isLoading } = usePrimaryFarm();
  const alerts = useAlerts(farm?.id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!farm) return <EmptyFarm />;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <Siren className="size-6" /> {t("alerts")}
      </h1>

      {alerts.data && alerts.data.length > 0 ? (
        <ul className="space-y-3">
          {alerts.data.map((a) => (
            <li key={a.id} className="field-card p-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">{a.title}</h2>
                <span className="ml-auto">
                  <HealthPill level={a.level} />
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No alerts yet.</p>
      )}
    </div>
  );
}
