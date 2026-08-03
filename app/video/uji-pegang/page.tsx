"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ProductImg = {
  id: string;
  category: string;
  usage?: string;
  description?: string | null;
  publicUrl: string;
};

const HOLDABLE = ["Produk", "Makanan/Minuman", "Kecantikan/Skincare"];

export default function UjiPegangPage() {
  const [products, setProducts] = useState<ProductImg[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [gender, setGender] = useState<"pria" | "wanita">("wanita");
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((d: { images?: ProductImg[] }) => {
        const imgs = (d.images ?? []).filter(
          (i) => HOLDABLE.includes(i.category) && i.usage === "olah_ai",
        );
        setProducts(imgs);
        if (imgs[0]) setSelectedId(imgs[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    setPhase("loading");
    setMessage("Membuat gambar (biasanya 45-90 detik)...");
    setImageUrl(null);
    try {
      const res = await fetch("/api/video/holding-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: selectedId, gender }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal membuat gambar.");
      setImageUrl(data.imageUrl);
      setPhase("done");
      setMessage("");
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "Gagal membuat gambar.");
    }
  }

  const selected = products.find((p) => p.id === selectedId);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="text-2xl font-bold text-navy">Uji: Orang Memegang Produk (eksperimen)</h1>
        <p className="mt-1 text-sm text-navy/60">
          Menguji apakah AI bisa menaruh produkmu di tangan seseorang TANPA merusak label/desain. Ini penentu
          apakah video &quot;produk dipegang&quot; layak dibangun.
        </p>

        <Card className="mt-5">
          {products.length === 0 ? (
            <p className="text-sm text-navy/60">
              Belum ada produk yang bisa dipakai. Butuh gambar kategori Produk / Makanan-Minuman / Skincare dengan
              perlakuan &quot;Olah AI&quot; di galeri (upload di Dashboard).
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-navy">Pilih produk</span>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-navy"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.description || p.category}
                    </option>
                  ))}
                </select>
              </label>

              {selected ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.publicUrl}
                  alt="produk terpilih"
                  className="mt-3 h-32 w-auto rounded-lg border border-line object-contain"
                />
              ) : null}

              <div className="mt-4">
                <span className="text-sm font-medium text-navy">Gender presenter</span>
                <div className="mt-1 flex gap-2">
                  {(["wanita", "pria"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-full border px-4 py-1.5 text-sm ${
                        gender === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-line text-navy/60 hover:bg-navy/5"
                      }`}
                    >
                      {g === "wanita" ? "Wanita" : "Pria"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button type="button" onClick={handleGenerate} disabled={!selectedId || phase === "loading"}>
                  {phase === "loading" ? "Membuat..." : "Generate Gambar Uji"}
                </Button>
                <span className="text-xs text-navy/40">1 token</span>
              </div>
            </>
          )}

          {message ? (
            <p className={`mt-3 text-sm ${phase === "error" ? "text-red-500" : "text-navy/60"}`}>{message}</p>
          ) : null}
        </Card>

        {imageUrl ? (
          <Card className="mt-5">
            <p className="mb-2 text-sm font-semibold text-navy">
              Hasil — cek: apakah label &amp; desain produk masih PERSIS seperti aslinya?
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="hasil uji" className="mx-auto w-full max-w-xs rounded-xl" />
            <a
              href={imageUrl}
              download="uji-pegang.png"
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Unduh gambar
            </a>
            <p className="mt-3 text-xs text-navy/50">
              Kalau label produk tetap mirip &amp; meyakinkan → kita lanjut bangun video (TTS + lip-sync). Kalau
              labelnya berubah/rusak → kita pakai plan B: presenter HeyGen + produk asli sebagai inset/background.
            </p>
          </Card>
        ) : null}
      </main>
    </>
  );
}
