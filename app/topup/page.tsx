"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { MIDTRANS_PACKAGES } from "@/lib/payment/midtrans-packages-client";

type PayState = "idle" | "creating" | "paying" | "success" | "pending" | "error";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

/**
 * Halaman Top Up Token — gaya mengikuti landing page (hero + kartu pricing +
 * value props + trust bar). Pembayaran via Midtrans Snap.
 */
export default function TopupPage() {
  const [state, setState] = useState<PayState>("idle");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapReady, setSnapReady] = useState(false);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    if (document.getElementById("midtrans-snap-js")) {
      setSnapReady(true);
      return;
    }
    const isProd = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const script = document.createElement("script");
    script.id = "midtrans-snap-js";
    script.src = isProd
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => setSnapReady(true);
    document.body.appendChild(script);
  }, []);

  async function pay(packageId: string) {
    setError(null);
    if (!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
      setError("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diisi di .env.local (restart dev setelah mengisi).");
      return;
    }
    if (!snapReady || !window.snap) {
      setError("Modul pembayaran belum siap — tunggu sebentar lalu coba lagi.");
      return;
    }
    setState("creating");
    setPayingId(packageId);
    try {
      const res = await fetch("/api/topup-midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal membuat transaksi.");

      setState("paying");
      window.snap.pay(d.snapToken as string, {
        onSuccess: () => setState("success"),
        onPending: () => setState("pending"),
        onError: () => {
          setState("error");
          setError("Pembayaran gagal. Coba lagi atau pilih metode lain.");
        },
        onClose: () => setState("idle"),
      });
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Gagal membuat transaksi.");
    } finally {
      if (state !== "paying") setPayingId(null);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 pb-16">
        {/* ── Hero ── */}
        <section className="pt-10 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Bayar sekali pakai · Tanpa langganan
          </span>
          <h1 className="mt-4 text-3xl font-bold text-navy sm:text-4xl">Top Up Token AI</h1>
          <p className="mx-auto mt-3 max-w-xl text-navy/60">
            1 token = 1 konten lengkap: gambar profesional, judul yang menjual, dan caption siap
            posting — jadi dalam hitungan menit, tanpa perlu desainer atau copywriter.
          </p>
        </section>

        {/* ── Status pembayaran ── */}
        {state === "success" ? (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-sm font-semibold text-green-800">✅ Pembayaran berhasil!</p>
            <p className="mt-1 text-xs text-green-800/80">
              Token masuk otomatis begitu Midtrans mengonfirmasi pembayaranmu.
            </p>
            <Link href="/dashboard" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
              Kembali ke Dashboard →
            </Link>
          </div>
        ) : null}
        {state === "pending" ? (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm font-semibold text-amber-900">⏳ Menunggu pembayaran</p>
            <p className="mt-1 text-xs text-amber-800/80">
              Selesaikan pembayaranmu — token masuk otomatis begitu dikonfirmasi.
            </p>
          </div>
        ) : null}
        {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

        {/* ── Kartu paket (gaya PricingSection landing) ── */}
        <section className="mt-10 grid gap-5 md:grid-cols-3">
          {MIDTRANS_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl bg-white p-6 ${
                pkg.highlight ? "border-2 border-primary shadow-md" : "border border-line shadow-sm"
              }`}
            >
              {pkg.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white">
                  Paling populer
                </span>
              ) : null}
              <div className={`text-sm font-semibold ${pkg.highlight ? "text-primary" : "text-navy/50"}`}>
                {pkg.label}
              </div>
              <div className="mt-2 text-3xl font-extrabold text-navy">
                Rp {pkg.priceIdr.toLocaleString("id-ID")}
              </div>
              <div className="mt-1 text-sm text-navy/50">
                {pkg.tokens} token · Rp {pkg.perKonten.toLocaleString("id-ID")}/konten
              </div>
              <ul className="mt-5 flex flex-col gap-2 text-sm text-navy">
                {pkg.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="text-primary">✓</span> {b}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => pay(pkg.id)}
                disabled={state === "creating" || state === "paying"}
                className={`mt-6 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  pkg.highlight
                    ? "bg-primary text-white hover:opacity-90"
                    : "border border-primary text-primary hover:bg-primary/5"
                }`}
              >
                {state === "creating" && payingId === pkg.id ? "Menyiapkan..." : "Bayar dengan Midtrans"}
              </button>
            </div>
          ))}
        </section>

        {/* ── Kenapa top up ── */}
        <section className="mt-14">
          <h2 className="text-center text-xl font-bold text-navy">Kenapa pakai token Keposting?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "⚡",
                title: "Hemat waktu tiap hari",
                desc: "Yang biasanya 1-2 jam mikir konten, jadi 2 menit — sisanya untuk urus jualan.",
              },
              {
                icon: "💸",
                title: "Jauh lebih murah",
                desc: "Mulai Rp4.000/konten — bandingkan jasa desain + copywriter yang puluhan ribu per posting.",
              },
              {
                icon: "🎨",
                title: "Hasil profesional",
                desc: "Gambar, judul, dan caption dibuat dari data bisnismu — bukan template pasaran.",
              },
              {
                icon: "♾️",
                title: "Token tidak hangus",
                desc: "Tanpa langganan bulanan. Beli sekali, pakai kapan saja sampai habis.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-2 text-sm font-bold text-navy">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-navy/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust bar pembayaran ── */}
        <section className="mt-12 rounded-[24px] bg-navy/[0.03] px-6 py-8 text-center">
          <p className="text-sm font-semibold text-navy">🔒 Pembayaran aman diproses oleh Midtrans</p>
          <p className="mx-auto mt-2 max-w-lg text-xs text-navy/60">
            Mendukung QRIS, GoPay, ShopeePay, transfer bank (BCA, BRI, BNI, Mandiri, Permata), kartu
            kredit/debit, dan Indomaret/Alfamart. Keposting tidak menyimpan data pembayaranmu.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-xs text-navy/40">
            Butuh bantuan? Hubungi kami lewat tombol Bantuan di kanan bawah — biasanya dibalas cepat.
          </p>
        </section>
      </main>
    </>
  );
}
