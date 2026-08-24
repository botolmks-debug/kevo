"use client";

import { useState } from "react";

const TEAL_DARK = "#0E8F80";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "Beneran gratis?",
    a: "Iya, gratis. Daftar akun langsung dapat 5 konten gratis buat dicoba, nggak ada kewajiban apa pun di awal. Baru bayar kalau kamu memang mau lanjut pakai.",
  },
  {
    q: "Foto produk saya dipakai buat apa? Aman nggak?",
    a: "Foto cuma dipakai buat generate konten kamu sendiri (diproses lewat Google Gemini/OpenAI). Kami nggak jual atau bagikan ke pihak lain.",
  },
  {
    q: "Hasilnya kaku kayak brosur atau natural?",
    a: "Caption ditulis dengan gaya ngobrol santai, bukan bahasa iklan formal — dan fotonya diarahkan supaya terasa seperti jepretan kamera asli, bukan gambar AI yang \"plastik\".",
  },
  {
    q: "Kalau hasilnya kurang pas, bisa diedit?",
    a: "Bisa. Judul, caption, sampai posisi elemen di gambar semuanya bisa kamu edit langsung sebelum disimpan atau diposting.",
  },
  {
    q: "Cocok untuk usaha saya nggak? Usaha saya kecil/rumahan.",
    a: "Cocok — banyak dipakai UMKM rumahan, toko kelontong, kuliner rumahan, jasa, sampai kerajinan. Sistemnya belajar dari profil usahamu sendiri, jadi konten yang keluar disesuaikan ke bisnismu, bukan template generik.",
  },
  {
    q: "Ada ikatan kontrak atau langganan otomatis?",
    a: "Tidak ada kontrak. Kamu bisa berhenti kapan saja.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-bold mb-3" style={{ color: "#1A1A1A" }}>
        Pertanyaan yang sering muncul
      </h2>
      <div className="rounded-2xl border divide-y" style={{ borderColor: "#E6E2D8" }}>
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5"
              >
                <span className="text-[13.5px] font-semibold" style={{ color: "#1A1A1A" }}>
                  {item.q}
                </span>
                <span
                  className="shrink-0 text-[18px] leading-none transition-transform"
                  style={{ color: TEAL_DARK, transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
                >
                  +
                </span>
              </button>
              {open && (
                <div className="px-4 pb-4 -mt-1">
                  <p className="text-[13px] leading-relaxed text-neutral-600">{item.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
