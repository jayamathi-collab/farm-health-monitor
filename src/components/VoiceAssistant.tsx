import { useState } from "react";
import { Mic, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Lightweight assistant. It points the farmer at the real data already on the
 * page — it never invents NDVI, weather or diagnosis values.
 */
export function VoiceAssistant({ farmId }: { farmId: string }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const ask = (question: string) => {
    if (!question.trim()) return;
    setReply(
      lang === "ta"
        ? "உங்கள் வயலின் தற்போதைய NDVI, வானிலை மற்றும் ஆரோக்கிய நிலை மேலே காட்டப்பட்டுள்ளது. பயிர் நோய் ஆய்வுக்கு 'பயிர் மருத்துவர்' பக்கத்தில் இலை படத்தை பதிவேற்றவும்."
        : "Your farm's current NDVI, weather and health status are shown above. For a crop disease assessment, upload a leaf photo in Crop Doctor.",
    );
  };

  const listen = () => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
      | (new () => { lang: string; start: () => void; onresult: ((e: never) => void) | null; onend: (() => void) | null })
      | undefined;
    if (!SR) {
      setReply("Voice input is not supported in this browser. Please type your question.");
      return;
    }
    const rec = new SR();
    rec.lang = lang === "ta" ? "ta-IN" : "en-IN";
    rec.onresult = ((e: { results: Array<Array<{ transcript: string }>> }) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      setText(said);
      ask(said);
    }) as never;
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <section className="field-card p-5" data-farm={farmId}>
      <h2 className="text-lg font-bold">{t("voiceAssistant")}</h2>
      <div className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("ask")} className="h-12" />
        <Button onClick={() => ask(text)} className="h-12" aria-label={t("ask")}>
          <Send className="size-4" />
        </Button>
        <Button variant="outline" onClick={listen} className="h-12" aria-label={t("listen")} disabled={listening}>
          <Mic className="size-4" />
        </Button>
      </div>
      {reply && <p className="mt-3 rounded-xl bg-secondary p-3 text-sm">{reply}</p>}
    </section>
  );
}
