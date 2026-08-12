import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, LocateFixed, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import FarmMap from "@/components/FarmMap";
import { createFarm } from "@/lib/farm.functions";
import { centroid, polygonAreaHectares, toGeoJsonPolygon, type Ring } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/farm/new")({
  head: () => ({
    meta: [
      { title: "Register your farm — AgroHealthy AI" },
      { name: "description", content: "Use GPS to locate your field and draw its exact boundary to start satellite monitoring." },
      { property: "og:title", content: "Register your farm — AgroHealthy AI" },
      { property: "og:description", content: "GPS location plus a drawn farm boundary powers real Sentinel-2 NDVI monitoring." },
    ],
  }),
  component: NewFarm,
});

const CROPS = ["Tomato", "Rice (Paddy)", "Banana", "Sugarcane", "Cotton", "Groundnut", "Maize", "Coconut", "Turmeric", "Brinjal", "Chilli", "Other"];

function NewFarm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createFarm);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [ring, setRing] = useState<Ring>([]);
  const [saving, setSaving] = useState(false);

  const area = ring.length >= 3 ? polygonAreaHectares(ring) : 0;

  const locate = () => {
    setGpsError(null);
    if (!("geolocation" in navigator)) {
      setGpsError("This device does not support GPS location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "GPS permission was denied. Allow location access in your browser, or it cannot register your field."
            : `Could not get your location (${err.message}).`,
        ),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ring.length < 3 || !pos) {
      toast.error("Draw a farm boundary with at least three points.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const c = centroid(ring);
    setSaving(true);
    try {
      const res = await create({
        data: {
          name: String(f.get("name")),
          crop: String(f.get("crop")),
          cropVariety: String(f.get("crop_variety") || ""),
          sowingDate: String(f.get("sowing_date") || ""),
          district: String(f.get("district") || ""),
          latitude: c.lat,
          longitude: c.lng,
          polygon: toGeoJsonPolygon(ring) as never,
          areaHectares: area,
        },
      });
      toast.success("Farm registered");
      navigate({ to: "/dashboard", search: { farm: res.id } as never });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the farm");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">{t("registerFarm")}</h1>
        <p className="text-muted-foreground">GPS location → farm boundary → crop details.</p>
      </header>

      <ol className="flex gap-2 text-sm font-semibold">
        {["Location", "Boundary", "Crop"].map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-lg border px-3 py-2 ${step >= i + 1 ? "border-primary bg-secondary text-secondary-foreground" : "border-border text-muted-foreground"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="field-card space-y-4 p-5">
          <Button onClick={locate} size="lg" className="h-14 w-full text-base font-bold">
            <LocateFixed className="mr-2 size-5" /> {t("useMyLocation")}
          </Button>
          {gpsError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{gpsError}</p>}
          {pos && (
            <>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
              </p>
              <FarmMap center={pos} zoom={17} />
              <Button onClick={() => setStep(2)} size="lg" className="h-14 w-full text-base font-bold">
                <Check className="mr-2 size-5" /> {t("confirmLocation")}
              </Button>
            </>
          )}
        </section>
      )}

      {step === 2 && pos && (
        <section className="field-card space-y-4 p-5">
          <h2 className="text-lg font-bold">{t("drawBoundary")}</h2>
          <p className="text-sm text-muted-foreground">
            Use the polygon tool on the map (top-right) and tap each corner of your field. Close the shape to finish.
          </p>
          <FarmMap center={pos} zoom={18} drawable onBoundaryChange={setRing} />
          <p className="text-sm font-semibold">
            {t("farmArea")}: {area > 0 ? `${area.toFixed(3)} ${t("hectares")} (${(area * 2.471).toFixed(2)} acres)` : "—"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1">
              Back
            </Button>
            <Button disabled={ring.length < 3} onClick={() => setStep(3)} className="h-12 flex-1 font-bold">
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <form onSubmit={save} className="field-card space-y-3 p-5">
          <div className="space-y-1">
            <Label htmlFor="name">{t("farmName")}</Label>
            <Input id="name" name="name" className="h-11" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="crop">{t("crop")}</Label>
            <select id="crop" name="crop" className="h-11 w-full rounded-md border border-input bg-background px-3" required>
              {CROPS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="crop_variety">{t("cropVariety")}</Label>
            <Input id="crop_variety" name="crop_variety" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sowing_date">{t("sowingDate")}</Label>
            <Input id="sowing_date" name="sowing_date" type="date" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="district">{t("district")}</Label>
            <Input id="district" name="district" className="h-11" />
          </div>
          <p className="text-sm font-semibold">
            {t("farmArea")}: {area.toFixed(3)} {t("hectares")}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-12 flex-1">
              Back
            </Button>
            <Button type="submit" disabled={saving} className="h-12 flex-1 font-bold">
              {t("saveFarm")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
