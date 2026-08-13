import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layers, Droplets, Wind } from "lucide-react";
import { toast } from "sonner";
import { getFarmSoil, recordSoilMoisture, setManualSoilType } from "@/lib/soil.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const SOIL_TYPES = ["Sandy", "Loamy", "Clay", "Clay loam", "Sandy loam", "Silty", "Red soil", "Black soil", "Alluvial"];

export function SoilCard({ farmId, airHumidity }: { farmId: string; airHumidity: number | null }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const soilFn = useServerFn(getFarmSoil);
  const saveType = useServerFn(setManualSoilType);
  const saveMoisture = useServerFn(recordSoilMoisture);
  const [editType, setEditType] = useState(false);
  const [editMoisture, setEditMoisture] = useState(false);

  const soil = useQuery({
    queryKey: ["soil", farmId],
    queryFn: () => soilFn({ data: { farmId } }),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["soil", farmId] });
    void qc.invalidateQueries({ queryKey: ["health"] });
  };

  const type = soil.data?.soilType;
  const moisture = soil.data?.soilMoisture;
  const moistureText =
    moisture?.label === "dry" ? t("dry") : moisture?.label === "wet" ? t("wet") : moisture?.label ? t("normalMoisture") : null;

  return (
    <section className="field-card space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Layers className="size-5" /> {t("soilInformation")}
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("soilType")}</p>
          <p className="mt-1 text-lg font-extrabold">{type?.value ?? (soil.isLoading ? "…" : t("soilUnavailable"))}</p>
          {type?.value && <p className="text-xs text-muted-foreground">{t("dataSource")}: {type.sourceLabel}</p>}
          {type?.ph != null && (
            <p className="text-xs text-muted-foreground">
              {t("soilPh")}: {type.ph.toFixed(1)}
            </p>
          )}
        </div>

        <div>
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Droplets className="size-4" /> {t("soilMoisture")}
          </p>
          <p className="mt-1 text-lg font-extrabold">
            {soil.isLoading
              ? "…"
              : moistureText
                ? `${moistureText}${moisture?.pct != null ? ` · ${moisture.pct}%` : ""}`
                : t("moistureUnavailable")}
          </p>
          {moisture?.label && (
            <p className="text-xs text-muted-foreground">
              {t("dataSource")}: {moisture.sourceLabel}
              {moisture.depth ? ` · ${moisture.depth}` : ""}
            </p>
          )}
        </div>

        <div>
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Wind className="size-4" /> {t("airHumidity")}
          </p>
          <p className="mt-1 text-lg font-extrabold">{airHumidity != null ? `${Math.round(airHumidity)}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">{t("dataSource")}: Weather station / model</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("soilEstimateNote")}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-10" onClick={() => setEditType((v) => !v)}>
          {t("soilType")}: {t("enterManually")}
        </Button>
        <Button variant="outline" className="h-10" onClick={() => setEditMoisture((v) => !v)}>
          {t("soilMoisture")}: {t("enterManually")}
        </Button>
      </div>

      {editType && (
        <div className="flex flex-wrap gap-2">
          {SOIL_TYPES.map((s) => (
            <Button
              key={s}
              variant="secondary"
              className="h-10"
              onClick={async () => {
                const r = await saveType({ data: { farmId, soilType: s } });
                if (r.ok) {
                  setEditType(false);
                  refresh();
                } else toast.error(r.message);
              }}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {editMoisture && (
        <div className="flex flex-wrap gap-2">
          {(["dry", "normal", "wet"] as const).map((l) => (
            <Button
              key={l}
              variant="secondary"
              className="h-10"
              onClick={async () => {
                const r = await saveMoisture({ data: { farmId, label: l, source: "manual" } });
                if (r.ok) {
                  setEditMoisture(false);
                  refresh();
                } else toast.error(r.message);
              }}
            >
              {l === "dry" ? t("dry") : l === "wet" ? t("wet") : t("normalMoisture")}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

export default SoilCard;
