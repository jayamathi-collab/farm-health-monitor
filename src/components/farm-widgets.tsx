import { Link } from "@tanstack/react-router";
import { ndviBand } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function NdviValue({ value }: { value: number }) {
  const band = ndviBand(value);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-3 rounded-full" style={{ backgroundColor: band.color }} aria-hidden />
      {value.toFixed(3)} <span className="text-sm font-semibold text-muted-foreground">{band.label}</span>
    </span>
  );
}

const LEVEL_STYLES: Record<string, string> = {
  normal: "bg-primary/15 text-primary",
  watch: "bg-[oklch(0.85_0.15_85)]/30 text-[oklch(0.45_0.12_75)]",
  high_risk: "bg-destructive/15 text-destructive",
};

export function HealthPill({ level }: { level: string }) {
  const { t } = useI18n();
  const label = level === "high_risk" ? t("highRisk") : level === "watch" ? t("watch") : t("normal");
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${LEVEL_STYLES[level] ?? LEVEL_STYLES["normal"]}`}>{label}</span>;
}

export function EmptyFarm() {
  const { t } = useI18n();
  return (
    <div className="field-card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-bold">{t("noFarmYet")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Register your field with GPS and a drawn boundary so satellite NDVI and weather can be fetched for it.
      </p>
      <Button asChild className="mt-5 h-12 w-full font-bold">
        <Link to="/farm/new">{t("registerFarm")}</Link>
      </Button>
    </div>
  );
}
