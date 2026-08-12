import { Link, useRouter } from "@tanstack/react-router";
import { Home, Sprout, Satellite, Stethoscope, CloudSun, Bell, Languages, LogOut, Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "home", Icon: Home },
  { to: "/farm", key: "myFarm", Icon: Sprout },
  { to: "/ndvi", key: "ndvi", Icon: Satellite },
  { to: "/crop-doctor", key: "cropDoctor", Icon: Stethoscope },
  { to: "/weather", key: "weather", Icon: CloudSun },
  { to: "/alerts", key: "alerts", Icon: Bell },
] as const;

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <Languages className="ml-1 size-4 text-muted-foreground" aria-hidden />
      {(["en", "ta"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {l === "en" ? "English" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" aria-hidden />
            </span>
            AgroHealthy
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map(({ to, key, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              >
                <Icon className="size-4" aria-hidden />
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <LanguageSwitch />
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("signOut")}>
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map(({ to, key, Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              <span className="truncate px-1">{t(key)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
