"use client";

import { useRef, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";

type Phase = "idle" | "submitting" | "processing" | "done" | "error";

export default function VideoPage() {
  const [caption, setCaption] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [script, setScript] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const busy = phase === "submitting" || phase === "processing";

  function poll(jobId: string) {
    const tick = async () => {
      try {
        const res = await fetch(`/api/video/${jobId}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Gagal cek status video.");
        if (data.status === "completed") {
          setVideoUrl(data.videoUrl);
          setPhase("done");
          setMessage("Video siap!");
          return;
        }
        if (data.status === "failed") {
          setPhase("error");
          setMessage(data.error ?? "HeyGen gagal merender video.");
          return;
        }
        pollRef.current = setTimeout(tick, 5000);
      } catch (e) {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "Gagal cek status video.");
      }
    };
    tick();
  }

  async function handleGenerate() {
    if (pollRef.current) clearTimeout(pollRef.current);
    setPhase("submitting");
    setMessage("Menyiapkan naskah & mengirim ke HeyGen...");
    setVideoUrl(null);
    setScript(null);
    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, ratio: "9:16" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal membuat video.");
      setScript(data.script ?? null);
      setPhase("processing");
      setMessage("HeyGen sedang merender video (biasanya 1-3 menit)...");
      poll(data.jobId);
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "Gagal membuat video.");
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="text-2xl font-bold text-navy">Video Avatar (beta)</h1>
        <p className="mt-1 text-sm text-navy/60">
          Tempel caption/naskah, AI ubah jadi naskah lisan ~15 detik, lalu dibacakan avatar. Rasio 9:16.
        </p>
        <p className="mt-2 text-sm">
          <a href="/video/uji-pegang" className="font-semibold text-primary hover:underline">
            🧪 Eksperimen: orang memegang produk →
          </a>
        </p>

        <Card className="mt-5">
          <Textarea
            label="Caption / naskah sumber"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="Tempel caption konten di sini..."
            disabled={busy}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleGenerate} disabled={!caption.trim() || busy}>
              {busy ? "Memproses..." : "Buat Video Avatar"}
            </Button>
            <span className="text-xs text-navy/40">± 8 token / video</span>
          </div>

          {message ? (
            <p className={`mt-3 text-sm ${phase === "error" ? "text-red-500" : "text-navy/60"}`}>{message}</p>
          ) : null}
          {script ? (
            <p className="mt-2 text-xs text-navy/50">Naskah yang dibacakan: “{script}”</p>
          ) : null}
        </Card>

        {videoUrl ? (
          <Card className="mt-5">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={videoUrl} controls className="mx-auto w-full max-w-xs rounded-xl" />
            <a
              href={videoUrl}
              download
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Unduh video
            </a>
          </Card>
        ) : null}
      </main>
    </>
  );
}
