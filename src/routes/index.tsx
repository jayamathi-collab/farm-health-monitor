import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Satellite,
  MapPin,
  Stethoscope,
  CloudSun,
  Siren,
  Mic,
  Smartphone,
  Leaf,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroHealthy AI — Satellite NDVI & AI Crop Health for Tamil Nadu Farmers" },
      {
        name: "description",
        content:
          "Monitor your farm with GPS boundaries, real Sentinel-2 NDVI, live weather and AI crop disease analysis. Tamil and English.",
      },
      { property: "og:title", content: "AgroHealthy AI — Smart Farm Monitoring" },
      {
        property: "og:description",
        content: "GPS farm mapping, real satellite NDVI, weather intelligence and an AI crop doctor, in Tamil and English.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { Icon: Satellite, en: "Satellite NDVI", ta: "செயற்கைக்கோள் NDVI", den: "Real Sentinel-2 vegetation index for your exact boundary.", dta: "உங்கள் வயல் எல்லைக்கான உண்மையான Sentinel-2 தாவர குறியீடு." },
  { Icon: MapPin, en: "Smart Farm Mapping", ta: "வயல் வரைபடம்", den: "Draw your farm with GPS and store the exact boundary privately.", dta: "GPS மூலம் வயல் எல்லையை வரைந்து பாதுகாப்பாக சேமிக்கவும்." },
  { Icon: Stethoscope, en: "AI Crop Doctor", ta: "AI பயிர் மருத்துவர்", den: "Photograph a leaf and get a cautious, explained assessment.", dta: "இலை படத்தை எடுத்து விளக்கமான ஆய்வு பெறுங்கள்." },
  { Icon: CloudSun, en: "Weather Intelligence", ta: "வானிலை தகவல்", den: "Live weather for your farm coordinates with farming warnings.", dta: "உங்கள் வயல் இருப்பிடத்திற்கான நேரடி வானிலை எச்சரிக்கைகள்." },
  { Icon: Siren, en: "Early Warnings", ta: "முன்கூட்டிய எச்சரிக்கை", den: "Alerts that always explain which observations triggered them.", dta: "எந்த தகவலால் எச்சரிக்கை வந்தது என்பதை விளக்கும்." },
  { Icon: Mic, en: "Tamil Voice Assistant", ta: "தமிழ் குரல் உதவி", den: "Ask about your farm in Tamil or English, by voice or text.", dta: "தமிழிலோ ஆங்கிலத்திலோ குரல் மூலம் கேளுங்கள்." },
  { Icon: Smartphone, en: "SMS Alerts", ta: "SMS எச்சரிக்கை", den: "Feature-phone farmers receive short alerts by SMS.", dta: "சாதாரண கைபேசி விவசாயிகளுக்கு SMS எச்சரிக்கை." },
];

function Home() {
  const { t, lang } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
        <span className="flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden />
          </span>
          {t("appName")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch />
          <Button asChild variant="outline">
            <Link to="/auth">{t("signIn")}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-secondary/60 px-6 py-14 text-center sm:px-12">
          <p className="mb-3 inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
            Tamil Nadu · தமிழ்நாடு
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{t("appName")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold text-secondary-foreground">{t("tagline")}</p>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-14 px-8 text-base font-bold">
              <Link to="/farm/new">
                {t("registerFarm")} <ArrowRight className="ml-1 size-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base font-bold">
              <Link to="/crop-doctor">{t("scanCrop")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, en, ta, den, dta }) => (
            <article key={en} className="field-card p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <h2 className="mt-3 text-lg font-bold">{lang === "ta" ? ta : en}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{lang === "ta" ? dta : den}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        AgroHealthy AI — satellite, weather and AI insights are advisory. Always confirm with local agricultural guidance.
      </footer>
    </div>
  );
}
