import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Images, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type Props = {
  /** Called with a JPEG data URL and the capture timestamp. */
  onCapture: (dataUrl: string, capturedAt: string) => void;
  onClear: () => void;
  preview: string | null;
};

export function CameraCapture({ onCapture, onClear, preview }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setLive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(
    async (mode: "environment" | "user") => {
      setError(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError(t("cameraPermission"));
        return;
      }
      try {
        stop();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        setLive(true);
        setFacing(mode);
        onClear();
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play();
          }
        });
      } catch {
        setError(t("cameraPermission"));
        setLive(false);
      }
    },
    [onClear, stop, t],
  );

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.85), new Date().toISOString());
    stop();
  };

  const fromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onCapture(String(reader.result), new Date().toISOString());
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {live ? (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-square w-full rounded-2xl bg-muted object-cover"
          />
          <div className="flex gap-2">
            <Button onClick={shoot} className="h-14 flex-1 text-base font-bold">
              <Camera className="mr-2 size-5" /> {t("captureCropImage")}
            </Button>
            <Button
              variant="outline"
              className="h-14 px-4"
              aria-label={t("switchCamera")}
              onClick={() => void start(facing === "environment" ? "user" : "environment")}
            >
              <SwitchCamera className="size-5" />
            </Button>
          </div>
        </>
      ) : preview ? (
        <>
          <img src={preview} alt="Captured crop leaf" className="aspect-square w-full rounded-2xl object-cover" />
          <Button variant="outline" onClick={() => void start(facing)} className="h-12 w-full font-bold">
            <RefreshCw className="mr-2 size-4" /> {t("retake")}
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void start(facing)}
            className="flex h-52 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground"
          >
            <Camera className="size-9" />
            <span className="text-base font-bold text-foreground">📷 {t("captureCropImage")}</span>
            <span className="text-xs">{t("openCamera")}</span>
          </button>
          {error && <p className="rounded-xl bg-accent p-3 text-sm">{error}</p>}
        </>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-muted-foreground underline">
        <Images className="size-4" /> {t("chooseFromGallery")}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              stop();
              fromFile(f);
            }
          }}
        />
      </label>
    </div>
  );
}

export default CameraCapture;
