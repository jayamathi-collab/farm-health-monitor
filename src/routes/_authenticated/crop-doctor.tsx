import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Stethoscope, Upload } from "lucide-react";
import { usePrimaryFarm } from "@/hooks/useFarms";
import { analyzeCropImage } from "@/lib/disease.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { EmptyFarm } from "@/components/farm-widgets";

export const Route = createFileRoute("/_authenticated/crop-doctor")({
  head: () => ({
    meta: [
      { title: "AI Crop Doctor — AgroHealthy AI" },
      { name: "description", content: "Upload a leaf photo for a cautious AI assessment combined with your farm's NDVI and weather context." },
      { property: "og:title", content: "AI Crop Doctor — AgroHealthy AI" },
      { property: "og:description", content: "Leaf photo analysis with symptoms, alternative causes and next steps." },
    ],
  }),
  component: CropDoctor,
});

type Result = Awaited<ReturnType<typeof analyzeCropImage>>;

function CropDoctor() {
  const { t } = useI18n();
  const { farm, isLoading } = usePrimaryFarm();
  const analyze = useServerFn(analyzeCropImage);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!farm) return <EmptyFarm />;

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await analyze({ data: { farmId: farm.id, imageDataUrl: preview } });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Stethoscope className="size-6" /> {t("cropDoctor")}
        </h1>
        <p className="text-muted-foreground">{t("uploadLeaf")}</p>
      </header>

      <section className="field-card space-y-4 p-5">
        <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
          <Upload className="size-7" />
          <span className="text-sm font-semibold">{t("uploadLeaf")}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        {preview && <img src={preview} alt="Selected crop leaf" className="max-h-72 w-full rounded-2xl object-contain" />}
        <Button onClick={run} disabled={!preview || busy} className="h-12 w-full font-bold">
          {busy ? "…" : t("analyze")}
        </Button>
      </section>

      {result && (
        <section className="field-card space-y-3 p-5">
          {result.ok ? (
            <>
              <h2 className="text-xl font-bold">{result.problem}</h2>
              <p className="text-sm text-muted-foreground">
                {t("confidence")}: {Math.round((result.confidence ?? 0) * 100)}% · {t("severity")}: {result.severity ?? "—"}
              </p>
              {result.lowConfidence && <p className="rounded-xl bg-accent p-3 text-sm">{t("lowConfidence")}</p>}
              <Block title={t("symptoms")} items={result.symptoms ?? []} />
              <Block title={t("altCauses")} items={result.alternativeCauses ?? []} />
              <Block title={t("nextSteps")} items={result.recommendations ?? []} />
            </>
          ) : (
            <p className="text-sm text-destructive">{result.message}</p>
          )}
        </section>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
