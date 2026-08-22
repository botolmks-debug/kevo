"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * TRACKING FUNNEL — Meta Pixel custom events.
 * Pixel base code sudah dipasang di app/layout.tsx (root), jadi fbq tersedia.
 * Lihat hasil: Meta Events Manager > keposting pixel > Ikhtisar / Uji Peristiwa.
 */
function track(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") fbq("trackCustom", event, params || {});
  }
}

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

const SHOWCASE_POOL = [
  "/showcase/1.png", "/showcase/2.png", "/showcase/3.png", "/showcase/4.png",
  "/showcase/5.png", "/showcase/6.png", "/showcase/7.png", "/showcase/8.png",
  "/showcase/9.png", "/showcase/10.png",
];
const SHOWCASE_SLOTS = 4;
const FADE_MS = 650;

// Satu gambar besar berputar untuk mobile — lebih impactful dari 4 kolom kecil
function MobileShowcase() {
  const pool = SHOWCASE_POOL;
  const enough = pool.length > SHOWCASE_SLOTS;
  const [slots, setSlots] = useState<number[]>(() =>
    Array.from({ length: SHOWCASE_SLOTS }, (_, i) => i % pool.length)
  );
  const [fading, setFading] = useState<number>(-1);
  const [nextPtr, setNextPtr] = useState<number>(SHOWCASE_SLOTS % pool.length);
  const [slotPtr, setSlotPtr] = useState<number>(0);

  useEffect(() => {
    pool.forEach((src) => { const img = new window.Image(); img.src = src; });
  }, [pool]);

  useEffect(() => {
    if (!enough) return;
    const tick = setInterval(() => {
      const targetSlot = slotPtr;
      let candidate = nextPtr;
      let guard = 0;
      const shown = new Set(slots.filter((_, i) => i !== targetSlot).map((v) => v));
      while (shown.has(candidate) && guard < pool.length) {
        candidate = (candidate + 1) % pool.length;
        guard++;
      }
      setFading(targetSlot);
      setTimeout(() => {
        setSlots((prev) => { const copy = [...prev]; copy[targetSlot] = candidate; return copy; });
        setFading(-1);
      }, FADE_MS);
      setNextPtr((candidate + 1) % pool.length);
      setSlotPtr((p) => (p + 1) % SHOWCASE_SLOTS);
    }, 3200);
    return () => clearInterval(tick);
  }, [enough, slotPtr, nextPtr, slots, pool.length]);

  const visible = pool.length >= SHOWCASE_SLOTS ? slots : pool.map((_, i) => i);

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {visible.map((imgIdx, slotIdx) => (
        <div key={slotIdx} className="overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5" style={{ aspectRatio: "9/16" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pool[imgIdx]}
            alt=""
            className="h-full w-full object-cover transition-opacity"
            style={{ opacity: fading === slotIdx ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

function ShowcaseGrid() {
  const pool = SHOWCASE_POOL;
  const enough = pool.length > SHOWCASE_SLOTS;
  const [slots, setSlots] = useState<number[]>(() =>
    Array.from({ length: SHOWCASE_SLOTS }, (_, i) => i % pool.length)
  );
  const [fading, setFading] = useState<number>(-1);
  const [nextPtr, setNextPtr] = useState<number>(SHOWCASE_SLOTS % pool.length);
  const [slotPtr, setSlotPtr] = useState<number>(0);

  useEffect(() => {
    pool.forEach((src) => { const img = new window.Image(); img.src = src; });
  }, [pool]);

  useEffect(() => {
    if (!enough) return;
    const tick = setInterval(() => {
      const targetSlot = slotPtr;
      let candidate = nextPtr;
      let guard = 0;
      const shown = new Set(slots.filter((_, i) => i !== targetSlot).map((v) => v));
      while (shown.has(candidate) && guard < pool.length) {
        candidate = (candidate + 1) % pool.length;
        guard++;
      }
      setFading(targetSlot);
      setTimeout(() => {
        setSlots((prev) => { const copy = [...prev]; copy[targetSlot] = candidate; return copy; });
        setFading(-1);
      }, FADE_MS);
      setNextPtr((candidate + 1) % pool.length);
      setSlotPtr((p) => (p + 1) % SHOWCASE_SLOTS);
    }, 3200);
    return () => clearInterval(tick);
  }, [enough, slotPtr, nextPtr, slots, pool.length]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((imgIdx, slotIdx) => (
        <div key={slotIdx} className="aspect-[9/16] w-full overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pool[imgIdx]}
            alt=""
            className="h-full w-full object-cover transition-opacity"
            style={{ opacity: fading === slotIdx ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function CobaPage() {
  const [step, setStep] = useState<Step>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [loadingLine, setLoadingLine] = useState<number>(0);

  const [result, setResult] = useState<{
    imageUrl: string;
    bgUrl?: string;
    caption: string;
    title?: string;
    demoId?: string;
  } | null>(null);
  const [editableCaption, setEditableCaption] = useState<string>("");
  const [editableTitle, setEditableTitle] = useState<string>("");
  const [titleError, setTitleError] = useState<string>("");
  // posisi judul (0..1) untuk preview drag — default tengah-bawah
  const [titleXY, setTitleXY] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.82 });
  const dragRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [genError, setGenError] = useState<string>("");
  const [sent, setSent] = useState<boolean>(false);
  const [autoSent, setAutoSent] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event 1: halaman terbuka
  useEffect(() => {
    track("CobaLanding");
  }, []);

  const onPickFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    track("CobaFotoDipilih"); // Event 2: user pilih foto
    setStep("business");
  }, []);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const runGenerate = useCallback(async () => {
    track("CobaGenerateMulai", { businessType }); // Event 4: tombol generate ditekan
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
        track("CobaGenerateGagal", { reason: "email_used" });
        setStep("email");
        setEmailError("Email ini sudah pernah coba. Pakai email lain, atau langsung daftar — gratis 5 konten.");
        return;
      }
      if (res.status === 429) {
        clearInterval(timer);
        track("CobaGenerateGagal", { reason: "quota_full" });
        setStep("email");
        setEmailError("Kuota coba gratis hari ini penuh. Coba lagi besok, atau daftar sekarang untuk 5 konten gratis.");
        return;
      }
      if (!res.ok) throw new Error("gagal");

      const data = (await res.json()) as {
        imageUrl: string;
        bgUrl?: string;
        caption: string;
        title?: string;
        demoId?: string;
        autoSent?: boolean;
      };
      clearInterval(timer);
      setResult(data);
      setAutoSent(Boolean(data.autoSent));
      setEditableCaption(data.caption);
      setEditableTitle(data.title || "");
      setTitleError("");
      setTitleXY({ x: 0.5, y: 0.82 });
      track("CobaHasilTampil"); // Event 5: hasil muncul di layar
      setStep("result");
    } catch {
      clearInterval(timer);
      track("CobaGenerateGagal", { reason: "error" });
      setGenError("Ada kendala saat membuat konten. Coba sekali lagi ya.");
      setStep("email");
    }
  }, [file, businessType, email]);

  const sendToEmail = useCallback(async () => {
    if (!result) return;
    setSending(true);
    setTitleError("");
    try {
      // Judul ditampilkan via CSS (tidak di-burn ke gambar — sharp tidak tersedia).
      // Langsung kirim email dengan gambar AI yang ada + caption.
      const finalUrl = result.imageUrl;
      const res = await fetch("/api/demo-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          imageUrl: finalUrl,
          caption: editableCaption,
        }),
      });
      if (res.ok) {
        track("CobaKirimEmail"); // user kirim versi edit ke email
        setSent(true);
      }
    } catch {
      setTitleError("Gagal mengirim. Coba sekali lagi ya.");
    } finally {
      setSending(false);
    }
  }, [result, email, editableCaption]);

  // --- DRAG judul di preview (client saja, tanpa render server) ---
  const onDragMove = useCallback((clientX: number, clientY: number) => {
    const el = dragRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    setTitleXY({ x, y });
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      onDragMove(e.clientX, e.clientY);
    };
    const touch = (e: TouchEvent) => {
      if (!draggingRef.current || !e.touches[0]) return;
      onDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const up = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", touch, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("touchend", up);
    };
  }, [onDragMove]);

  const stepIndex = { photo: 0, business: 1, email: 2, loading: 2, result: 3 }[step];

  return (
    <main style={{ background: CREAM, color: INK, minHeight: "100dvh" }} className="w-full">
      {/* top bar — full width */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <img src="/Logo/logo-keposting.png" alt="Keposting" className="h-9 w-auto" />
        <a
          href="/signup"
          onClick={() => track("CobaKlikDaftar", { posisi: "header" })}
          className="text-sm font-bold px-4 py-2 rounded-full text-white"
          style={{ background: TEAL }}
        >
          Daftar
        </a>
      </header>

      {/* ───── STEP 1: FOTO — dua kolom di desktop ───── */}
      {step === "photo" && (
        <div className="max-w-6xl mx-auto px-6 pb-16 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Kiri: bukti visual berputar */}
          <div className="hidden lg:flex flex-col gap-5">
            <span className="inline-flex self-start items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#EAF9F6", color: TEAL_DARK }}>
              ✨ Hasil nyata — bukan mockup
            </span>
            <h2 className="text-[36px] font-black leading-[1.08] tracking-tight">
              Foto biasa jadi<br />
              <span style={{ color: TEAL }}>konten yang layak posting.</span>
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-500 max-w-sm">
              Upload 1 foto dari HP — gelap, miring, apa adanya sekalipun. Kami ubah jadi konten siap posting dalam hitungan detik.
            </p>
            <ShowcaseGrid />
          </div>

          {/* Kanan: form upload */}
          <div className="flex flex-col justify-center">
            {/* Hero — hanya tampil di mobile */}
            <div className="lg:hidden mb-5">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#EAF9F6", color: TEAL_DARK }}>
                ✨ Hasil nyata dari fotomu sendiri
              </span>
              <h1 className="mt-2 text-[26px] font-black leading-[1.15] tracking-tight">
                Upload foto produk,{" "}
                <span style={{ color: TEAL }}>konten langsung jadi.</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Apa adanya dari HP juga boleh. Gratis, tanpa daftar dulu.
              </p>
              {/* Satu gambar besar berputar — hanya di mobile */}
              <MobileShowcase />
            </div>

            {/* Card upload */}
            <div className="rounded-3xl p-7 shadow-sm" style={{ background: "#fff", border: "1.5px solid #E6E2D8" }}>
              <div className="hidden lg:block mb-5">
                <h3 className="text-[20px] font-black tracking-tight">Coba sekarang — gratis</h3>
                <p className="text-sm text-neutral-500 mt-1">Upload 1 foto produk dan lihat hasilnya langsung di layar.</p>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl py-10 px-6 flex flex-col items-center gap-3 border-2 border-dashed transition active:scale-[0.99] hover:opacity-90"
                style={{ borderColor: TEAL, background: "#F0FBF9" }}
              >
                <div className="w-14 h-14 rounded-2xl grid place-items-center text-white text-2xl" style={{ background: TEAL }}>↑</div>
                <div className="text-center">
                  <p className="font-bold text-[15px]">Pilih foto produk</p>
                  <p className="text-xs text-neutral-400 mt-0.5">JPG / PNG · dari galeri atau kamera</p>
                </div>
              </button>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                {["Gratis", "Tanpa daftar dulu", "Hasil langsung tampil"].map((t) => (
                  <span key={t} className="flex items-center gap-1 text-xs text-neutral-500">
                    <span style={{ color: TEAL }}>✓</span> {t}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-neutral-400">
              Dipakai pemilik kafe, online shop, dan UMKM Indonesia 🇮🇩
            </p>
          </div>
        </div>
      )}

      {/* ───── STEP 2–5: terpusat max-w-md ───── */}
      {step !== "photo" && (
      <div className="max-w-md mx-auto px-5 pb-16">
        {/* progress */}
        {step !== "result" && (
          <div className="flex gap-2 mt-2 mb-6">
            {[0, 1, 2].map((n) => (
              <div key={n} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: n <= stepIndex ? TEAL : "#E6E2D8" }} />
            ))}
          </div>
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
              onClick={() => {
                track("CobaBisnisLanjut", { businessType }); // Event 3: jenis usaha dipilih
                setStep("email");
              }}
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
            <p className="mt-1 text-xs text-neutral-400">Biasanya sekitar 1 menit.</p>
            <p className="mt-3 text-[13px] font-semibold" style={{ color: TEAL_DARK }}>
              📩 Boleh ditinggal — hasilnya otomatis kami kirim ke {email || "emailmu"}.
            </p>
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

            {autoSent && (
              <p className="mb-3 text-[12px] text-neutral-500">
                📩 Hasil ini sudah otomatis dikirim ke <b>{email}</b>. Kalau kamu edit
                judul/caption di bawah, klik Simpan untuk kirim versi terbarunya.
              </p>
            )}

            <div className="rounded-3xl overflow-hidden border" style={{ borderColor: "#E6E2D8" }}>
              {/* PREVIEW DRAG — judul melayang bisa digeser (client saja, tanpa render). */}
              <div
                ref={dragRef}
                className="relative w-full select-none"
                style={{ aspectRatio: "4 / 5", background: "#000", touchAction: "none" }}
              >
                <img
                  src={result.bgUrl || result.imageUrl}
                  alt="Konten hasil Keposting"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
                {editableTitle.trim() && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); draggingRef.current = true; }}
                    onTouchStart={() => { draggingRef.current = true; }}
                    className="absolute cursor-move px-2 text-center"
                    style={{
                      left: `${titleXY.x * 100}%`,
                      top: `${titleXY.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      width: "85%",
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#fff",
                      lineHeight: 1.05,
                      fontSize: "clamp(20px, 6.5vw, 34px)",
                      letterSpacing: "0.5px",
                      textShadow: "0 0 10px rgba(0,0,0,.55), 1px 1px 0 rgba(0,0,0,.5), -1px -1px 0 rgba(0,0,0,.5)",
                    }}
                  >
                    {editableTitle}
                  </div>
                )}
                <div className="absolute left-0 right-0 bottom-0 h-14 pointer-events-none"
                     style={{ background: "linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0))" }} />
              </div>

              {/* editor JUDUL — hanya teks; posisi diatur dgn menggeser di preview */}
              {result.demoId && (
                <div className="p-4 bg-white border-b" style={{ borderColor: "#E6E2D8" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold tracking-wide text-neutral-400">
                      JUDUL DI GAMBAR
                    </p>
                    <span className="text-[11px] text-neutral-400">geser di gambar untuk pindah ✋</span>
                  </div>
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    maxLength={120}
                    className="w-full text-[14px] leading-relaxed outline-none bg-transparent border rounded-xl px-3 py-2.5"
                    style={{ borderColor: "#E6E2D8" }}
                  />
                  {titleError && (
                    <p className="mt-1.5 text-[12px] text-red-500">{titleError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    Ubah teks di atas, lalu geser judul di gambar ke posisi yang kamu suka.
                    Hasil final dibuat saat kamu klik “Kirim versi edit ke email”.
                  </p>
                </div>
              )}

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
                {sending ? "Mengirim…" : autoSent ? "Kirim versi edit ke email" : "Simpan"}
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
                Ini baru sebagian kecilnya
              </p>
              <p className="text-white/90 text-sm mt-1.5">
                Daftar Sekarang
              </p>
              <a
                href={`/signup?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                onClick={() => track("CobaKlikDaftar", { posisi: "hasil" })} // Event 6: klik CTA daftar
                className="mt-4 inline-block w-full rounded-full py-4 font-bold text-[15px]"
                style={{ background: "#fff", color: TEAL_DARK }}
              >
                Buka fitur lengkap — gratis
              </a>
            </div>

            <p className="mt-5 text-center text-xs text-neutral-400">
              Hasil yang tampil ini produk aslimu — bukan gambar AI palsu.
            </p>
          </section>
        )}
      </div>
      )}
    </main>
  );
}
