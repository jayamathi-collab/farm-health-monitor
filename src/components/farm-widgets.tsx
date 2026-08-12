import { Link } from "@tanstack/react-router";
import { ndviBand, NDVI_BANDS } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";

export function NdviValue({ value }: { value: number }) {
  const { t } = useI18n();
  const band = ndviBand(value) ?? NDVI_BANDS[4];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="size-3 rounded-full" style={{ backgroundColor: band.color }} aria-hidden />
      {value.toFixed(3)} <span className="text-sm font-semibold text-muted-foreground">{t(band.key as TKey)}</span>
    </span>
  );
}

const LEVEL_STYLES: Record<string, string> = {
  normal: "bg-primary/15 text-primary",
  watch: "bg-accent text-accent-foreground",
  high_risk: "bg-destructive/15 text-destructive",
};

export function HealthPill({ level }: { level: string }) {
  const { t } = useI18n();
  const label = level === "high_risk" ? t("atRisk") : level === "watch" ? t("watch") : t("good");
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
