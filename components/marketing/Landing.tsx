"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PricingSection from "@/components/PricingSection";

/* ── Data demo: pakai GAMBAR ASLI hasil Keposting (di public/demo).
   Tambah entri baru di sini untuk menambah tab contoh. ── */
const DEMOS = [
  {
    tab: "Kuliner",
    before: "/demo/bakso-before.jpg",
    after: "/demo/bakso-after.jpg",
    label: "Foto HP seadanya",
    title: "Bakso rumahan, rasa konsisten",
    caption:
      "Semangkuk bakso yang bikin kangen pulang \ud83c\udf5c Kuah gurih, bakso kenyal, rasa konsisten tiap hari. Tinggal pesan, nggak pakai antre \u2014 mampir atau order online sekarang! #baksoenak #kulinerbakso #jajananhits #umkmkuliner #keposting",
  },
  {
    tab: "Olahraga",
    before: "/demo/lari-before.jpeg",
    after: "/demo/lari-after.jpeg",
    label: "Foto lari seadanya",
    title: "Langkah kecil tiap pagi",
    caption:
      "Langkah kecil tiap pagi, hasilnya kerasa \ud83c\udfc3 Konsisten itu kuncinya \u2014 mulai dari yang bisa dulu, sisanya ngikut. Yuk mulai rutinitas sehatmu hari ini! #lari #hidupsehat #olahragapagi #konsisten #keposting",
  },
  {
    tab: "Fashion",
    before: "/demo/kaos-before.jpg",
    after: "/demo/kaos-after.jpg",
    label: "Foto produk seadanya",
    title: "Kaos Struggle, tampil beda",
    caption:
      "Kaos 'Struggle' buat yang nggak takut tampil beda \ud83d\udd25 Bahan adem, sablon tebal awet nggak gampang belel \u2014 dari nongkrong sampai kencan tetap on point. Stok terbatas, checkout sebelum kehabisan! #kaosdistro #ootdpria #streetwearlokal #brandlokal #keposting",
  },
  {
    tab: "Bengkel",
    before: "/demo/bengkel-before.jpeg",
    after: "/demo/bengkel-after.jpeg",
    label: "Foto bengkel seadanya",
    title: "Servis rapi, hasil bikin tenang",
    caption:
      "Servis rapi, hasil bikin tenang \ud83d\udd27 Ditangani mekanik berpengalaman, pengerjaan cepat, harga jelas di depan. Booking sekarang, kendaraanmu balik prima! #bengkel #servismotor #otomotif #umkmlokal #keposting",
  },
];

/* ── Util kecil ── */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);
  return reduce;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

/* ── Hero interaktif: geser garis untuk membandingkan foto asli vs hasil.
   Caption ikut "diketik" sesuai posisi geser. Pilih tab untuk ganti jenis usaha. ── */
function BeforeAfter() {
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(0); // 0-100: seberapa banyak HASIL terlihat (dari kiri)
  const [copied, setCopied] = useState(false);
  const reduce = usePrefersReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const userRef = useRef(false); // true setelah pengunjung menyentuh slider → animasi otomatis berhenti
  const demo = DEMOS[idx];

  // Animasi pembuka: garis menyapu sekali dari kiri ke kanan tiap ganti tab,
  // kecuali pengunjung sudah memegang kendali.
  useEffect(() => {
    userRef.current = false;
    if (reduce) {
      setPos(100);
      return;
    }
    setPos(0);
    const delay = 450;
    const dur = 1900;
    const start = performance.now() + delay;
    let raf = 0;
    const tick = (t: number) => {
      if (userRef.current) return;
      const p = clamp((t - start) / dur, 0, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setPos(e * 100);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, reduce]);

  const setFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // 4px = tebal border bingkai HP di kiri & kanan
    setPos(clamp(((clientX - r.left - 4) / (r.width - 8)) * 100));
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    userRef.current = true;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) setFromClientX(e.clientX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    userRef.current = true;
    setPos(clamp(next));
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(demo.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bisa ditolak browser — abaikan, tombol tidak wajib */
    }
  };

  const chars = Math.round((pos / 100) * demo.caption.length);
  const typed = demo.caption.slice(0, chars);
  const isDone = pos >= 98;
  const isRaw = pos <= 2;

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* Bingkai HP — geser di mana saja */}
      <div
        ref={frameRef}
        className="relative aspect-[9/16] w-full cursor-ew-resize touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[28px] border-4 border-navy/85 bg-black shadow-[0_20px_60px_-20px_rgba(40,40,38,0.5)]">
          {/* Semua demo ditumpuk supaya ganti tab langsung tampil tanpa menunggu gambar */}
          {DEMOS.map((d, i) => {
            const active = i === idx;
            return (
              <div
                key={d.tab}
                aria-hidden={!active}
                className={`absolute inset-0 transition-opacity duration-300 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
              >
                <Image
                  src={d.before}
                  alt={active ? "Foto produk mentah" : ""}
                  fill
                  sizes="300px"
                  priority={i === 0}
                  draggable={false}
                  className="object-cover"
                  style={{ filter: "grayscale(0.4) brightness(0.9)" }}
                />
                <Image
                  src={d.after}
                  alt={active ? "Hasil konten Keposting" : ""}
                  fill
                  sizes="300px"
                  priority={i === 0}
                  draggable={false}
                  className="object-cover"
                  style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
                />
              </div>
            );
          })}

          {/* Label kiri/kanan memudar sesuai posisi */}
          <span
            className="absolute left-3 top-3 rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-medium text-white transition-opacity"
            style={{ opacity: pos > 30 ? 0 : 1 }}
          >
            {demo.label}
          </span>
          <span
            className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white transition-opacity"
            style={{ opacity: pos > 70 ? 1 : 0 }}
          >
            Hasil Keposting
          </span>
        </div>

        {/* Garis + pegangan geser */}
        <div
          className="pointer-events-none absolute inset-y-1 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]"
          style={{ left: `calc(4px + (100% - 8px) * ${pos / 100})` }}
        >
          <div
            role="slider"
            tabIndex={0}
            aria-label="Bandingkan foto asli dan hasil Keposting"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${Math.round(pos)}% hasil terlihat`}
            onKeyDown={onKeyDown}
            className="pointer-events-auto absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-white text-sm font-bold text-primary shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            {"\u2039\u203a"}
          </div>
        </div>
      </div>

      {/* Badge status */}
      <div className="pointer-events-none absolute -right-2 -top-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-lg">
        {isDone ? "\u2713 Siap posting" : isRaw ? "Foto mentah" : "Dipoles\u2026"}
      </div>

      <p className="mt-3 text-center text-xs text-muted">Geser garisnya untuk membandingkan</p>

      {/* Pilih jenis usaha */}
      <div role="tablist" aria-label="Contoh jenis usaha" className="mt-3 flex flex-wrap justify-center gap-2">
        {DEMOS.map((d, i) => (
          <button
            key={d.tab}
            role="tab"
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              i === idx
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-navy hover:border-primary/50"
            }`}
          >
            {d.tab}
          </button>
        ))}
      </div>

      {/* Caption ikut muncul sesuai geseran */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-3 text-left shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Caption otomatis</p>
          <button
            onClick={copyCaption}
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
          >
            {copied ? "Tersalin \u2713" : "Salin"}
          </button>
        </div>
        <p className="sr-only">{demo.caption}</p>
        <p aria-hidden className="min-h-[7rem] text-xs leading-relaxed text-navy">
          {typed}
          {chars < demo.caption.length ? <span className="text-primary/70">{"\u258d"}</span> : null}
        </p>
      </div>
    </div>
  );
}

/* ── "Cukup 3 langkah" — klik langkah untuk lihat tampilannya ── */
const STEPS = [
  { title: "Upload foto produk", desc: "Foto apa adanya dari HP-mu—produk, makanan, atau suasana toko." },
  { title: "AI bikin kontennya", desc: "Gambar rapi, judul menarik, dan caption plus hashtag—dibuat otomatis." },
  { title: "Tinggal posting", desc: "Simpan, atau jadwalkan langsung. Selesai dalam hitungan menit." },
];

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function splitCaption(c: string) {
  const i = c.indexOf(" #");
  return i === -1 ? { text: c, tags: "" } : { text: c.slice(0, i), tags: c.slice(i + 1) };
}

function HowItWorks() {
  const [s, setS] = useState(0);
  const d = DEMOS[0];
  const { text, tags } = splitCaption(d.caption);

  return (
    <div className="mx-auto mt-10 grid max-w-4xl items-center gap-8 md:grid-cols-[1fr_1.1fr]">
      <div role="tablist" aria-label="Langkah penggunaan" className="flex flex-col gap-3">
        {STEPS.map((st, i) => (
          <button
            key={st.title}
            role="tab"
            aria-selected={i === s}
            onClick={() => setS(i)}
            className={`flex gap-4 rounded-2xl border p-4 text-left transition ${
              i === s ? "border-primary/40 bg-white shadow-sm" : "border-transparent hover:bg-white/60"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                i === s ? "bg-primary text-white" : "bg-primary/10 text-primary"
              }`}
            >
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold text-navy">{st.title}</span>
              <span className="mt-1 block text-sm text-muted">{st.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="relative min-h-[22rem]">
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes kepoPanel { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
            .kepo-panel{animation:kepoPanel .35s ease-out}
            @media (prefers-reduced-motion: reduce){.kepo-panel{animation:none}}`,
          }}
        />
        <div key={s} className="kepo-panel">
          {s === 0 ? (
            <div className="mx-auto max-w-[280px] rounded-2xl border-2 border-dashed border-primary/40 bg-white p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <Image src={d.before} alt="Contoh foto dari HP" fill sizes="280px" className="object-cover" />
              </div>
              <p className="mt-3 text-center text-xs font-medium text-navy">foto-hp.jpg · siap diunggah</p>
            </div>
          ) : null}

          {s === 1 ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl border border-line shadow-sm">
                <Image src={d.after} alt="Hasil konten dari foto tadi" fill sizes="200px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2.5 text-left text-xs">
                <div className="rounded-xl border border-line bg-white p-3">
                  <p className="font-semibold text-muted">Judul</p>
                  <p className="mt-0.5 font-semibold text-navy">{d.title}</p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3">
                  <p className="font-semibold text-muted">Caption</p>
                  <p className="mt-0.5 leading-relaxed text-navy">{text}</p>
                </div>
                <div className="rounded-xl border border-line bg-white p-3">
                  <p className="font-semibold text-muted">Hashtag</p>
                  <p className="mt-0.5 leading-relaxed text-primary">{tags}</p>
                </div>
              </div>
            </div>
          ) : null}

          {s === 2 ? (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="mb-3 text-left text-xs font-semibold text-navy">Minggu ini · 7 konten terjadwal</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAYS.map((day, i) => (
                  <div key={day} className="text-center">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line">
                      <Image
                        src={DEMOS[i % DEMOS.length].after}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-muted">{day}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Efek halaman: garis progres scroll + CTA melayang di HP ── */
function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden>
      <div ref={ref} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 640);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur transition-transform duration-300 md:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <LinkButton href="/coba" tabIndex={show ? 0 : -1} className="w-full py-3">
        Coba Gratis
      </LinkButton>
    </div>
  );
}

/* ── Sub-komponen kecil ── */
function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <Card className="p-5 transition-transform duration-200 hover:-translate-y-1">
      <Image src={icon} alt="" width={40} height={40} className="h-10 w-10" />
      <h3 className="mt-3 font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </Card>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-line bg-white p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-navy">
        {q}
        <span className="text-muted transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm text-muted">{a}</p>
    </details>
  );
}

export function Landing() {
  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <ScrollProgress />
      <StickyCta />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Kembali ke beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-8 w-8" />
            <span className="text-lg font-bold text-navy">Keposting</span>
          </Link>
          <div className="flex items-center gap-2">
            <LinkButton href="/login" variant="secondary" className="px-4 py-2 text-xs sm:text-sm">Masuk</LinkButton>
            <LinkButton href="/signup" className="px-4 py-2 text-xs sm:text-sm">Daftar</LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:items-start md:py-20">
          <div className="text-center md:pt-6 md:text-left">
            <h1 className="text-3xl font-extrabold leading-tight text-navy sm:text-4xl md:text-5xl">
              Setiap foto punya <span className="text-primary">cerita</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-muted md:mx-0">
              Upload fotomu, dapat gambar + caption Instagram siap posting. Cukup dari satu foto—dibantu AI.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start">
              {/* Diarahkan ke /coba (demo langsung, TANPA perlu bikin akun dulu).
                  cta-pulse (globals.css) = cincin cahaya berdenyut halus. */}
              <LinkButton href="/coba" className="cta-pulse w-full scale-100 px-7 py-3.5 transition-transform hover:scale-105 sm:w-auto">Coba Gratis</LinkButton>
              <LinkButton href="#cara-kerja" variant="secondary" className="w-full px-7 py-3.5 sm:w-auto">Lihat cara kerjanya</LinkButton>
            </div>
            <p className="mt-3 text-xs text-muted">Coba langsung sekarang, tanpa perlu bikin akun dulu — 5 token gratis + refill harian · Tanpa langganan</p>
          </div>
          <BeforeAfter />
        </section>

        {/* ── Trust bar ── */}
        <section className="border-y border-line bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 text-sm text-muted">
            {["Konten dari 1 foto", "Jadi dalam hitungan menit", "Feed, Story, & Square", "Caption + hashtag otomatis"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Image src="/icon-cover/centang.png" alt="" width={16} height={16} className="shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Masalah ── */}
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">Mikir ide & bikin konten tiap hari itu melelahkan</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Mau posting rutin biar toko keliatan aktif, tapi bingung mau bikin apa. Sekali skip, keterusan. Keposting mengambil alih bagian yang bikin pusing itu.
          </p>
        </section>

        {/* ── Cara kerja (interaktif) ── */}
        <section id="cara-kerja" className="bg-white/60 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">Cukup 3 langkah</h2>
            <p className="mt-2 text-center text-sm text-muted">Klik tiap langkah untuk melihat tampilannya</p>
            <HowItWorks />
          </div>
        </section>

        {/* ── Fitur ── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">Semua yang kamu butuh untuk konten harian</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon="/icon-cover/6.png" title="Konten dari foto" desc="Ubah foto produk biasa jadi konten yang layak posting." />
            <Feature icon="/icon-cover/1.png" title="Judul & caption otomatis" desc="Lengkap dengan hashtag yang relevan untuk usahamu." />
            <Feature icon="/icon-cover/5.png" title="Banyak ukuran" desc="Feed 4:5, Story 9:16, dan Square 1:1—sekali klik." />
            <Feature icon="/icon-cover/4.png" title="Gabung beberapa produk" desc="Satukan sampai 5 produk jadi satu konten rapi." />
            <Feature icon="/icon-cover/3.png" title="Jadwal posting" desc="Atur konten untuk beberapa hari ke depan sekaligus." />
            <Feature icon="/icon-cover/2.png" title="Tetap bisa diedit" desc="Geser teks, ganti ukuran, sesuaikan sebelum simpan." />
          </div>
        </section>

        {/* ── Per jenis usaha ── */}
        <section className="bg-white/60 py-14">
          <div className="mx-auto max-w-4xl px-5 text-center">
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">Cocok untuk berbagai usaha</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {["Kafe & F&B", "Online shop", "Skincare & Kecantikan", "Fashion", "Kuliner rumahan", "Jasa", "Toko kelontong", "Kerajinan"].map((x) => (
                <span key={x} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-navy">{x}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Harga (teaser) ── */}
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">Coba gratis, tanpa risiko</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Selama masa uji coba, semua fitur AI bisa dipakai tanpa biaya.
          </p>
          <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm text-navy">
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> 5 token gratis saat daftar</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> +1 token gratis per hari (maks 5)</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Semua fitur AI: generate konten, hapus background, caption</li>
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Sekali bayar, tanpa langganan</li>
          </ul>
          <div className="mt-7">
            <LinkButton href="/signup" className="px-8 py-3.5">Coba 5 konten gratis</LinkButton>
          </div>
        </section>

        {/* ── Harga top-up token ── */}
        <PricingSection />

        {/* ── FAQ ── */}
        <section className="bg-white/60 py-16">
          <div className="mx-auto max-w-2xl px-5">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">Pertanyaan umum</h2>
            <div className="mt-8 flex flex-col gap-3">
              <Faq q="Perlu bisa desain?" a="Nggak. Cukup upload foto, sisanya Keposting yang kerjakan. Hasilnya tetap bisa kamu sesuaikan kalau mau." />
              <Faq q="Hasilnya bisa diedit?" a="Bisa. Kamu bisa menggeser teks, ganti ukuran, dan menyesuaikan konten sebelum menyimpannya." />
              <Faq q="Berapa harganya?" a="Kamu dapat 5 token gratis saat daftar (+1/hari, maks 5). Kalau butuh lebih, top-up mulai Rp 50.000 untuk 10 token, Rp 135.000 untuk 30 token, atau Rp 240.000 untuk 60 token. Sekali bayar, tanpa langganan, token tidak hangus." />
              <Faq q="Datanya aman?" a="Foto dan data usahamu hanya dipakai untuk membuat kontenmu. Kamu bisa hapus kapan saja." />
            </div>
          </div>
        </section>

        {/* ── CTA penutup ── */}
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="rounded-[24px] bg-primary px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Ceritakan foto produkmu hari ini</h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">Berhenti pusing mikirin ide. Mulai dari satu foto sekarang.</p>
            <div className="mt-7">
              <LinkButton href="/signup" variant="cta" className="px-8 py-3.5">Coba 5 Konten Gratis</LinkButton>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-line bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-6 w-6" />
            <span className="font-semibold text-navy">Keposting</span>
            <span className="hidden sm:inline">· Setiap Foto Punya Cerita</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/login" className="hover:text-navy">Masuk</a>
            <a href="/signup" className="hover:text-navy">Daftar</a>
          </div>
        </div>
        <div className="border-t border-line/70">
          <p className="mx-auto max-w-6xl px-5 py-4 text-center text-xs text-muted">
            © {new Date().getFullYear()} Keposting · Dikelola oleh{" "}
            <span className="font-semibold text-navy">CV. Autekno Rasa</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
