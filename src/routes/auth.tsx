import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AgroHealthy AI" },
      { name: "description", content: "Create your AgroHealthy AI farmer account to register a farm and monitor crop health." },
      { property: "og:title", content: "Sign in — AgroHealthy AI" },
      { property: "og:description", content: "Farmer accounts for satellite NDVI, weather and AI crop health monitoring." },
    ],
  }),
  component: AuthPage,
});

const DISTRICTS = [
  "Coimbatore", "Erode", "Salem", "Madurai", "Thanjavur", "Tiruchirappalli", "Tirunelveli",
  "Vellore", "Dindigul", "Villupuram", "Cuddalore", "Namakkal", "Theni", "Sivagangai", "Other",
];

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: String(f.get("full_name")),
          mobile: String(f.get("mobile")),
          language: String(f.get("language")),
          district: String(f.get("district")),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setLang(String(f.get("language")) === "ta" ? "ta" : "en");
    toast.success(lang === "ta" ? "கணக்கு உருவாக்கப்பட்டது" : "Account created");
    navigate({ to: "/farm/new" });
  };

  const google = async () => {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-8">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="size-5" aria-hidden />
          </span>
          {t("appName")}
        </Link>
        <LanguageSwitch />
      </div>

      <div className="field-card mx-auto mt-6 max-w-md p-6">
        <Tabs defaultValue="signup">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">{t("signUp")}</TabsTrigger>
            <TabsTrigger value="signin">{t("signIn")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-3 pt-4">
              <Field label={t("name")} name="full_name" required />
              <Field label={t("mobile")} name="mobile" type="tel" placeholder="+9198XXXXXXXX" required />
              <div className="space-y-1">
                <Label htmlFor="language">{t("language")}</Label>
                <select id="language" name="language" defaultValue={lang} className="h-11 w-full rounded-md border border-input bg-background px-3">
                  <option value="en">English</option>
                  <option value="ta">தமிழ்</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="district">{t("district")}</Label>
                <select id="district" name="district" className="h-11 w-full rounded-md border border-input bg-background px-3">
                  {DISTRICTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <Field label={t("email")} name="email" type="email" required />
              <Field label={t("password")} name="password" type="password" required minLength={6} />
              <Button type="submit" disabled={busy} className="h-12 w-full text-base font-bold">
                {t("signUp")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-3 pt-4">
              <Field label={t("email")} name="email" type="email" required />
              <Field label={t("password")} name="password" type="password" required />
              <Button type="submit" disabled={busy} className="h-12 w-full text-base font-bold">
                {t("signIn")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" onClick={google} className="h-12 w-full font-bold">
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

function Field(props: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, name, ...rest } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-11" {...rest} />
    </div>
  );
}
