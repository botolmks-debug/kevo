"use client";

import { useState, useRef, useCallback } from "react";

/**
 * HALAMAN DEMO IKLAN — /coba
 * ---------------------------------------------------------------
 * Alur: upload foto -> pilih tipe bisnis -> masukkan email
 *       -> hasil TAMPIL DI LAYAR (momen wow) -> kirim HD ke email -> CTA daftar
 *
 * 1 email = 1 percobaan (divalidasi di server, bukan hanya di sini).
 * Email yang dipakai demo TETAP bisa dipakai daftar akun nanti.
 *
 * Endpoint yang dipanggil halaman ini (dibuat menyusul):
 *   POST /api/demo-generate
 *     body (multipart/form-data): { image: File, businessType: string, email: string }
 *     resp 200: { imageUrl: string, caption: string }
 *     resp 409: { error: "email_used" }   -> email sudah pernah coba
 *     resp 429: { error: "quota_full" }    -> cap harian demo penuh
 *   POST /api/demo-send
 *     body (json): { email: string, imageUrl: string, caption: string }
 *     resp 200: { ok: true }
 * ---------------------------------------------------------------
 */

const TEAL = "#12B3A0";
const TEAL_DARK = "#0E8F80";
const CREAM = "#FAF8F3";
const INK = "#1A1A1A";

const BUSINESS_TYPES = [
  "Kafe & F&B",
  "Online shop",
  "Skincare & Kecantikan",
  "Fashion",
  "Kuliner rumahan",
  "Jasa",
  "Toko kelontong",
  "Kerajinan",
];

type Step = "photo" | "business" | "email" | "loading" | "result";

const LOADING_LINES = [
  "Menganalisis fotomu…",
  "Menata gambar biar rapi…",
  "Menyusun caption yang pas…",
  "Menambah hashtag relevan…",
];

export default function CobaPage() {
  const [step, setStep] = useState<Step>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [loadingLine, setLoadingLine] = useState<number>(0);

  const [result, setResult] = useState<{ imageUrl: string; caption: string } | null>(null);
  const [editableCaption, setEditableCaption] = useState<string>("");
  const [genError, setGenError] = useState<string>("");
  const [sent, setSent] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("business");
  }, []);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const runGenerate = useCallback(async () => {
    setStep("loading");
    setGenError("");

    // animasi teks loading berputar
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      setLoadingLine(i);
    }, 1800);

    try {
      const fd = new FormData();
      if (file) fd.append("image", file);
      fd.append("businessType", businessType);
      fd.append("email", email.trim().toLowerCase());

      const res = await fetch("/api/demo-generate", { method: "POST", body: fd });

      if (res.status === 409) {
        clearInterval(timer);
        setStep("email");
        setEmailError("Email ini sudah pernah coba. Pakai email lain, atau langsung daftar — gratis 5 konten.");
        return;
      }
      if (res.status === 429) {
        clearInterval(timer);
        setStep("email");
        setEmailError("Kuota coba gratis hari ini penuh. Coba lagi besok, atau daftar sekarang untuk 5 konten gratis.");
        return;
      }
      if (!res.ok) throw new Error("gagal");

      const data = (await res.json()) as { imageUrl: string; caption: string };
      clearInterval(timer);
      setResult(data);
      setEditableCaption(data.caption);
      setStep("result");
    } catch {
      clearInterval(timer);
      setGenError("Ada kendala saat membuat konten. Coba sekali lagi ya.");
      setStep("email");
    }
  }, [file, businessType, email]);

  const sendToEmail = useCallback(async () => {
    if (!result) return;
    setSending(true);
    try {
      const res = await fetch("/api/demo-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          imageUrl: result.imageUrl,
          caption: editableCaption,
        }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }, [result, email]);

  const stepIndex = { photo: 0, business: 1, email: 2, loading: 2, result: 3 }[step];

  return (
    <main style={{ background: CREAM, color: INK, minHeight: "100dvh" }} className="w-full">
      {/* top bar */}
      <header className="flex items-center justify-between px-5 py-4 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <img
            src="/Logo/logo%20keposting.png"
            alt="Keposting"
            className="h-9 w-auto"
          />
        </div>
        <a
          href="/signup"
          className="text-sm font-bold px-4 py-2 rounded-full text-white"
          style={{ background: TEAL }}
        >
          Daftar
        </a>
      </header>

      <div className="max-w-md mx-auto px-5 pb-16">
        {/* progress */}
        {step !== "result" && (
          <div className="flex gap-2 mt-2 mb-6">
            {[0, 1, 2].map((n) => (
              <div
                key={n}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ background: n <= stepIndex ? TEAL : "#E6E2D8" }}
              />
            ))}
          </div>
        )}

        {/* ---------- STEP 1: FOTO ---------- */}
        {step === "photo" && (
          <section>
            <h1 className="text-[28px] leading-[1.15] font-black tracking-tight">
              Lihat hasilnya dari{" "}
              <span style={{ color: TEAL }}>fotomu sendiri</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
              Upload 1 foto produk — apa adanya dari HP juga boleh. Kami ubah jadi
              konten siap posting dalam hitungan detik.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 w-full rounded-3xl py-12 px-6 flex flex-col items-center gap-3 border-2 border-dashed transition active:scale-[0.99]"
              style={{ borderColor: TEAL, background: "#F0FBF9" }}
            >
              <div
                className="w-14 h-14 rounded-2xl grid place-items-center text-white text-2xl"
                style={{ background: TEAL }}
              >
                ↑
              </div>
              <span className="font-bold text-[15px]">Pilih foto produk</span>
              <span className="text-xs text-neutral-500">JPG / PNG — dari galeri atau kamera</span>
            </button>

            <p className="mt-5 text-center text-xs text-neutral-400">
              Gratis · Tanpa aplikasi · Hasil langsung tampil
            </p>
          </section>
        )}

        {/* ---------- STEP 2: TIPE BISNIS ---------- */}
        {step === "business" && (
          <section>
            {preview && (
              <img
                src={preview}
                alt="Foto produkmu"
                className="w-full h-44 object-cover rounded-2xl mb-5"
              />
            )}
            <h2 className="text-[22px] font-black tracking-tight">Jenis usahamu apa?</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Biar caption dan gaya kontennya nyambung.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {BUSINESS_TYPES.map((t) => {
                const active = businessType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setBusinessType(t)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold border transition active:scale-95"
                    style={{
                      background: active ? TEAL : "#fff",
                      color: active ? "#fff" : INK,
                      borderColor: active ? TEAL : "#E6E2D8",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <button
              disabled={!businessType}
              onClick={() => setStep("email")}
              className="mt-8 w-full rounded-full py-4 font-bold text-white text-[15px] transition active:scale-[0.99] disabled:opacity-40"
              style={{ background: TEAL }}
            >
              Lanjut
            </button>
            <button
              onClick={() => setStep("photo")}
              className="mt-3 w-full text-sm text-neutral-500"
            >
              Ganti foto
            </button>
          </section>
        )}

        {/* ---------- STEP 3: EMAIL ---------- */}
        {step === "email" && (
          <section>
            <h2 className="text-[22px] font-black tracking-tight">
              Kontenmu sudah siap dibuat
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Masukkan email untuk melihat hasilnya. Email ini juga bisa langsung
              kamu pakai daftar nanti.
            </p>

            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setGenError("");
              }}
              placeholder="nama@email.com"
              className="mt-5 w-full rounded-2xl px-4 py-4 text-[15px] outline-none border bg-white"
              style={{ borderColor: emailError ? "#E0574A" : "#E6E2D8" }}
            />

            {(emailError || genError) && (
              <p className="mt-2 text-sm" style={{ color: "#C24436" }}>
                {emailError || genError}
              </p>
            )}

            <button
              disabled={!validEmail(email)}
              onClick={runGenerate}
              className="mt-6 w-full rounded-full py-4 font-bold text-white text-[15px] transition active:scale-[0.99] disabled:opacity-40"
              style={{ background: TEAL }}
            >
              Buat kontenku sekarang
            </button>

            <p className="mt-3 text-center text-xs text-neutral-400">
              Email dipakai untuk menyimpan & mengirim hasil kontenmu.
            </p>
          </section>
        )}

        {/* ---------- LOADING ---------- */}
        {step === "loading" && (
          <section className="pt-16 flex flex-col items-center text-center">
            {preview && (
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-8">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 animate-pulse"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(18,179,160,0.35))" }}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: TEAL, animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: TEAL, animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: TEAL, animationDelay: "300ms" }} />
            </div>
            <p className="font-semibold text-[15px]">{LOADING_LINES[loadingLine]}</p>
            <p className="mt-1 text-xs text-neutral-400">Sebentar ya, sedang dikerjakan…</p>
          </section>
        )}

        {/* ---------- RESULT ---------- */}
        {step === "result" && result && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ background: TEAL }}
              >
                ✓ Siap posting
              </span>
              <span className="text-xs text-neutral-500">dari fotomu tadi</span>
            </div>

            <div className="rounded-3xl overflow-hidden border" style={{ borderColor: "#E6E2D8" }}>
              <img src={result.imageUrl} alt="Konten hasil Keposting" className="w-full object-cover" />
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-bold tracking-wide text-neutral-400">
                    CAPTION
                  </p>
                  <span className="text-[11px] text-neutral-400">bisa kamu edit ✎</span>
                </div>
                <textarea
                  value={editableCaption}
                  onChange={(e) => setEditableCaption(e.target.value)}
                  rows={6}
                  className="w-full text-[14px] leading-relaxed resize-none outline-none bg-transparent"
                />
              </div>
            </div>

            {/* simpan -> kirim ke email */}
            {!sent ? (
              <button
                onClick={sendToEmail}
                disabled={sending}
                className="mt-5 w-full rounded-full py-4 font-bold text-white text-[15px] transition active:scale-[0.99] disabled:opacity-50"
                style={{ background: TEAL }}
              >
                {sending ? "Menyimpan…" : "Simpan"}
              </button>
            ) : (
              <div
                className="mt-5 w-full rounded-2xl py-4 px-4 text-center text-sm font-semibold"
                style={{ background: "#EAF9F6", color: TEAL_DARK }}
              >
                ✓ Hasil sudah dikirim ke {email}. Cek inbox (atau folder promosi) ya.
              </div>
            )}

            {/* CTA daftar */}
            <div
              className="mt-6 rounded-3xl p-6 text-center"
              style={{ background: TEAL }}
            >
              <p className="text-white font-black text-[19px] leading-snug">
                Suka hasilnya?
              </p>
              <p className="text-white/90 text-sm mt-1.5">
                Daftar pakai email tadi, langsung dapat 5 konten gratis lagi.
              </p>
              <a
                href={`/signup?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                className="mt-4 inline-block w-full rounded-full py-4 font-bold text-[15px]"
                style={{ background: "#fff", color: TEAL_DARK }}
              >
                Buat akun & lanjut gratis
              </a>
            </div>

            <p className="mt-5 text-center text-xs text-neutral-400">
              Hasil yang tampil ini produk aslimu — bukan gambar AI palsu.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
