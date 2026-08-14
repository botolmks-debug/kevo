"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PricingSection from "@/components/PricingSection";

/* ── Data demo untuk hero: pakai GAMBAR ASLI hasil Keposting (di public/demo).
   Tambah entri baru di sini untuk merotasi lebih banyak contoh. ── */
const DEMOS = [
  {
    before: "/demo/bakso-before.jpg",
    after: "/demo/bakso-after.jpg",
    label: "Foto HP seadanya",
    caption:
      "Semangkuk bakso yang bikin kangen pulang \ud83c\udf5c Kuah gurih, bakso kenyal, rasa konsisten tiap hari. Tinggal pesan, nggak pakai antre \u2014 mampir atau order online sekarang! #baksoenak #kulinerbakso #jajananhits #umkmkuliner #keposting",
  },
  {
    before: "/demo/kaos-before.jpg",
    after: "/demo/kaos-after.jpg",
    label: "Foto produk seadanya",
    caption:
      "Kaos 'Struggle' buat yang nggak takut tampil beda \ud83d\udd25 Bahan adem, sablon tebal awet nggak gampang belel \u2014 dari nongkrong sampai kencan tetap on point. Stok terbatas, checkout sebelum kehabisan! #kaosdistro #ootdpria #streetwearlokal #brandlokal #keposting",
  },
];

function HeroAnimation() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"before" | "scanning" | "done">("before");
  const [typed, setTyped] = useState("");
  const [reduce, setReduce] = useState(false);
  const demo = DEMOS[idx];

  useEffect(() => {
    setReduce(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  // Alur: foto mentah (before) -> garis scan menyapu -> terpoles jadi konten (after)
  useEffect(() => {
    if (reduce) {
      setPhase("done");
      setTyped(DEMOS[idx].caption);
      return;
    }
    setPhase("before");
    setTyped("");
    const t1 = setTimeout(() => setPhase("scanning"), 1000);
    const t2 = setTimeout(() => setPhase("done"), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [idx, reduce]);

  useEffect(() => {
    if (reduce || phase !== "done") return;
    const caption = DEMOS[idx].caption;
    let i = 0;
    const typer = setInterval(() => {
      i += 1;
      setTyped(caption.slice(0, i));
      if (i >= caption.length) clearInterval(typer);
    }, 22);
    const next = setTimeout(() => setIdx((v) => (v + 1) % DEMOS.length), caption.length * 22 + 3200);
    return () => { clearInterval(typer); clearTimeout(next); };
  }, [phase, idx, reduce]);

  const revealed = phase === "scanning" || phase === "done";
  const isDone = phase === "done";

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes kepoScanMove { 0%{top:0%} 100%{top:100%} }
          @keyframes kepoBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        `,
        }}
      />
      {/* Mockup HP: before di bawah, after terungkap dari atas ke bawah saat scan */}
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border-4 border-navy/85 bg-black shadow-[0_20px_60px_-20px_rgba(40,40,38,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={demo.before}
          alt="Foto produk mentah"
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
          style={{
            filter: revealed
              ? "grayscale(0.4) brightness(0.9)"
              : "blur(7px) grayscale(0.5) brightness(0.85)",
            transform: revealed ? "scale(1)" : "scale(1.05)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={demo.after}
          alt="Hasil konten Keposting"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            clipPath: revealed ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
            // transisi halus hanya saat MENGUNGKAP; saat reset ke produk baru, sembunyi seketika
            transition: revealed ? "clip-path 1.4s ease-in-out" : "none",
          }}
        />

        {/* Garis scan menyapu ke bawah */}
        {phase === "scanning" ? (
          <div
            className="pointer-events-none absolute inset-x-0 h-12"
            style={{
              animation: "kepoScanMove 1.4s ease-in-out forwards",
              marginTop: "-24px",
              background: "linear-gradient(180deg,transparent,rgba(15,182,166,0.85),transparent)",
              boxShadow: "0 0 26px 6px rgba(15,182,166,0.45)",
            }}
          />
        ) : null}

        {/* Label sebelum jadi */}
        <div className={`absolute left-3 top-3 transition-opacity duration-500 ${revealed ? "opacity-0" : "opacity-100"}`}>
          <span className="rounded-full bg-navy/70 px-2 py-0.5 text-[10px] font-medium text-white">{demo.label}</span>
        </div>
      </div>

      {/* Badge status */}
      <div className="absolute -right-2 -top-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-lg">
        {isDone ? "\u2713 Siap posting" : phase === "scanning" ? "Memindai\u2026" : "Foto mentah"}
      </div>

      {/* Caption mengetik sendiri */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-3 text-left shadow-sm">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Caption otomatis</p>
        <p className="min-h-[5rem] text-xs leading-relaxed text-navy">
          {typed}
          {!reduce && typed.length < demo.caption.length ? (
            <span className="inline-block" style={{ animation: "kepoBlink 1s step-end infinite" }}>\u258d</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

/* ── Sub-komponen kecil ── */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{n}</div>
      <div>
        <h3 className="font-semibold text-navy">{title}</h3>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <Card className="p-5">
      <div className="text-2xl">{icon}</div>
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
    <div className="flex flex-col">
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
            <LinkButton href="/signup" className="px-4 py-2 text-xs sm:text-sm">Coba Gratis</LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2 md:py-20">
          <div className="text-center md:text-left">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Beta · Gratis Diakses</span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-navy sm:text-4xl md:text-5xl">
              Setiap produk punya <span className="text-primary">cerita</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-muted md:mx-0">
              Upload foto produkmu, dapat gambar + caption Instagram siap posting. Cukup dari satu foto—dibantu AI.
            </p>
            <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start">
              <LinkButton href="/signup" className="w-full px-7 py-3.5 sm:w-auto">Coba 5 Konten Gratis</LinkButton>
              <LinkButton href="#cara-kerja" variant="secondary" className="w-full px-7 py-3.5 sm:w-auto">Lihat cara kerjanya</LinkButton>
            </div>
            <p className="mt-3 text-xs text-muted">5 token gratis + refill harian · Tanpa kartu kredit</p>
          </div>
          <HeroAnimation />
        </section>

        {/* ── Trust bar ── */}
        <section className="border-y border-line bg-white/60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 text-sm text-muted">
            <span>✨ Konten dari 1 foto</span>
            <span>⚡ Jadi dalam hitungan menit</span>
            <span>📱 Feed, Story, & Square</span>
            <span>✍️ Caption + hashtag otomatis</span>
          </div>
        </section>

        {/* ── Masalah ── */}
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">Mikir ide & bikin konten tiap hari itu melelahkan</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Mau posting rutin biar toko keliatan aktif, tapi bingung mau bikin apa. Sekali skip, keterusan. Keposting mengambil alih bagian yang bikin pusing itu.
          </p>
        </section>

        {/* ── Cara kerja ── */}
        <section id="cara-kerja" className="bg-white/60 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">Cukup 3 langkah</h2>
            <div className="mx-auto mt-10 grid max-w-3xl gap-8 md:grid-cols-3">
              <Step n={1} title="Upload foto produk" desc="Foto apa adanya dari HP-mu—produk, makanan, atau suasana toko." />
              <Step n={2} title="AI bikin kontennya" desc="Gambar rapi, judul menarik, dan caption plus hashtag—dibuat otomatis." />
              <Step n={3} title="Tinggal posting" desc="Simpan, atau jadwalkan langsung. Selesai dalam hitungan menit." />
            </div>
          </div>
        </section>

        {/* ── Fitur ── */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold text-navy sm:text-3xl">Semua yang kamu butuh untuk konten harian</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon="🖼️" title="Konten dari foto" desc="Ubah foto produk biasa jadi konten yang layak posting." />
            <Feature icon="✍️" title="Judul & caption otomatis" desc="Lengkap dengan hashtag yang relevan untuk usahamu." />
            <Feature icon="📐" title="Banyak ukuran" desc="Feed 4:5, Story 9:16, dan Square 1:1—sekali klik." />
            <Feature icon="🧩" title="Gabung beberapa produk" desc="Satukan sampai 5 produk jadi satu konten rapi." />
            <Feature icon="🗓️" title="Jadwal posting" desc="Atur konten untuk beberapa hari ke depan sekaligus." />
            <Feature icon="🎨" title="Tetap bisa diedit" desc="Geser teks, ganti ukuran, sesuaikan sebelum simpan." />
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
            <li className="flex items-start gap-2"><span className="text-primary">✓</span> Tanpa kartu kredit, tanpa langganan</li>
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
            <h2 className="text-2xl font-bold sm:text-3xl">Ceritakan produkmu, mulai hari ini</h2>
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
            <span className="hidden sm:inline">· Setiap Produk Punya Cerita</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="/login" className="hover:text-navy">Masuk</a>
            <a href="/signup" className="hover:text-navy">Daftar</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
